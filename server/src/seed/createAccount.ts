import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Player } from '../models/Player.js';
import { connectDatabase } from '../config/database.js';
import { hashPassword } from '../services/authService.js';
import { HttpError, assert } from '../utils/errors.js';
import { parse, validateId } from '../utils/validation.js';
dotenv.config();
try {
  const email = parse(z.string().trim().toLowerCase().pipe(z.email()), process.env.ADMIN_EMAIL);
  const password = parse(z.string().min(12).max(128), process.env.ADMIN_PASSWORD);
  const linkedId = process.env.LINK_PLAYER_ID;
  if (linkedId) validateId(linkedId);
  await connectDatabase();
  await User.init();
  const passwordHash = await hashPassword(password);
  await mongoose.connection.transaction(async (session) => {
    assert(
      !(await User.exists({ email }).session(session)),
      'Account already exists. No account was modified.',
    );
    if (linkedId) {
      const player = await Player.findOneAndUpdate(
        { _id: linkedId },
        { $inc: { __v: 1 } },
        { session, new: true },
      );
      assert(
        player && player.email === email,
        'Explicit player ID must exist and its normalized email must match. Verify ownership offline first.',
      );
      await User.create([{ email, passwordHash, role: 'member', playerId: player._id }], {
        session,
      });
    } else {
      assert(
        !(await User.exists({ role: 'admin' }).session(session)),
        'An admin already exists. This script creates the first admin only.',
      );
      await User.create([{ email, passwordHash, role: 'admin' }], { session });
    }
  });
  console.log(
    linkedId
      ? 'Member account explicitly linked; sports ID and records preserved.'
      : 'First admin created.',
  );
} catch (error) {
  console.error(
    error instanceof HttpError
      ? error.message
      : 'Account creation failed. Check MONGO_URI, Atlas access and uniqueness; credentials are not logged.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
