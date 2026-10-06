import type { RequestHandler } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { User } from '../models/User.js';
import { Player } from '../models/Player.js';
import { assert } from '../utils/errors.js';
import { verifyToken } from '../services/authService.js';
export type Account = {
  _id: string;
  email: string;
  role: 'admin' | 'member';
  playerId?: string;
  sessionVersion: number;
  expiresAt: number;
};
declare global {
  namespace Express {
    interface Request {
      account?: Account;
    }
  }
}
export function cookies(req: { headers: { cookie?: string } }) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .filter(Boolean)
      .map((value) => {
        const i = value.indexOf('=');
        return [value.slice(0, i).trim(), value.slice(i + 1)];
      }),
  );
}
export const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  path: '/api',
  maxAge: 3600000,
};
export const csrf: RequestHandler = (req, res, next) => {
  const jar = cookies(req);
  if (req.method === 'GET' && req.path === '/auth/csrf') {
    const token = /^[a-f0-9]{64}$/.test(jar.pp_csrf || '')
      ? jar.pp_csrf
      : randomBytes(32).toString('hex');
    res.set('Cache-Control', 'no-store');
    res.cookie('pp_csrf', token, cookieOptions);
    res.json({ csrfToken: token });
    return;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    assert(
      !origin || ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin),
      'Untrusted request origin',
      403,
    );
    const token = req.get('x-csrf-token') || '';
    const expected = jar.pp_csrf || '';
    assert(
      token.length === 64 &&
        expected.length === 64 &&
        timingSafeEqual(Buffer.from(token), Buffer.from(expected)),
      'CSRF token missing or invalid',
      403,
    );
  }
  next();
};
export const authenticate: RequestHandler = async (req, _res, next) => {
  _res.set('Cache-Control', 'no-store');
  const token = cookies(req).pp_session;
  assert(token, 'Please log in.', 401);
  const claims = verifyToken(token);
  const user = await User.findById(claims.sub).lean();
  assert(
    user && user.isActive && user.sessionVersion === claims.version,
    'Session invalid. Please log in.',
    401,
  );
  if (user.role === 'member')
    assert(
      user.playerId && (await Player.exists({ _id: user.playerId })),
      'Linked player profile is missing. Contact an admin.',
      401,
    );
  req.account = {
    _id: String(user._id),
    email: user.email,
    role: user.role as Account['role'],
    playerId: user.playerId ? String(user.playerId) : undefined,
    sessionVersion: user.sessionVersion,
    expiresAt: claims.exp * 1000,
  };
  next();
};
export const adminOnly: RequestHandler = (req, _res, next) => {
  assert(req.account?.role === 'admin', 'Admin access required', 403);
  next();
};
const attempts = new Map<string, { count: number; until: number }>();
export const authLimit: RequestHandler = (req, _res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip || 'local';
  const value = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
  value.count++;
  attempts.set(key, value);
  assert(value.count <= 30, 'Too many authentication attempts. Try again in 15 minutes.', 429);
  next();
};
