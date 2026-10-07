import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Player } from '../models/Player.js';
import { parse } from '../utils/validation.js';
import { assert } from '../utils/errors.js';
import { hashPassword, verifyPassword, signToken } from '../services/authService.js';
import { authenticate, authLimit, cookieOptions } from '../middleware/auth.js';
const credentials = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(12).max(128),
  })
  .strict();
const signup = credentials.extend({
  name: z.string().trim().min(2).max(80),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  preferredPlay: z.enum(['singles', 'doubles', 'both']).default('both'),
});
export const authRouter = Router();
authRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
authRouter.post('/signup', authLimit, async (req, res) => {
  const input = parse(signup, req.body);
  const passwordHash = await hashPassword(input.password);
  const user = await mongoose.connection.transaction(async (session) => {
    assert(
      !(await User.exists({ email: input.email }).session(session)),
      'An account already uses this email.',
      409,
    );
    assert(
      !(await Player.exists({ email: input.email }).session(session)),
      'A sports profile already uses this email. Contact an admin for controlled linking.',
      409,
    );
    const [player] = await Player.create(
      [
        {
          name: input.name,
          email: input.email,
          skillLevel: input.skillLevel,
          preferredPlay: input.preferredPlay,
        },
      ],
      { session },
    );
    const [account] = await User.create(
      [{ email: input.email, passwordHash, role: 'member', playerId: player._id }],
      { session },
    );
    return account;
  });
  res.cookie('pp_session', signToken(String(user._id), user.sessionVersion), cookieOptions);
  res.status(201).json({ message: 'Member account created' });
});
authRouter.post('/login', authLimit, async (req, res) => {
  const input = parse(credentials, req.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  // Run a password derivation even when the email does not exist.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash || 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64),
  );
  assert(user && valid && user.isActive, 'Invalid email or password, or inactive account.', 401);
  res.cookie('pp_session', signToken(String(user._id), user.sessionVersion), cookieOptions);
  res.json({ message: 'Logged in' });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const player = req.account!.playerId ? await Player.findById(req.account!.playerId).lean() : null;
  const { sessionVersion, ...account } = req.account!;
  res
    .set('Cache-Control', 'no-store')
    .json({ ...account, name: player?.name || account.email, player });
});
authRouter.post('/logout', authenticate, async (req, res) => {
  await User.updateOne({ _id: req.account!._id }, { $inc: { sessionVersion: 1 } });
  res.clearCookie('pp_session', { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'All sessions for this account have been logged out.' });
});
