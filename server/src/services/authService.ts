import { randomBytes, scrypt as derive, timingSafeEqual, createHmac } from 'node:crypto';
import { assert } from '../utils/errors.js';
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    derive(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export function authSecret() {
  const secret = process.env.JWT_SECRET;
  assert(
    secret && secret.length >= 32,
    'JWT_SECRET must contain at least 32 characters in server/.env.',
    500,
  );
  return secret;
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [, salt, value] = hash.split(':');
  const key = await scrypt(password, salt);
  const expected = Buffer.from(value, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function signToken(sub: string, version: number, lifetime = 3600) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub, version, exp: Math.floor(Date.now() / 1000) + lifetime, iss: 'peakpickle', aud: 'peakpickle-local' })}`;
  return `${data}.${createHmac('sha256', authSecret()).update(data).digest('base64url')}`;
}
export function verifyToken(token: string) {
  try {
    const parts = token.split('.');
    assert(parts.length === 3, 'Invalid session', 401);
    const signature = createHmac('sha256', authSecret())
      .update(parts.slice(0, 2).join('.'))
      .digest();
    const supplied = Buffer.from(parts[2], 'base64url');
    assert(
      signature.length === supplied.length && timingSafeEqual(signature, supplied),
      'Invalid session',
      401,
    );
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    assert(
      header.alg === 'HS256' &&
        claims.iss === 'peakpickle' &&
        claims.aud === 'peakpickle-local' &&
        Number.isFinite(claims.exp) &&
        claims.exp > Date.now() / 1000 &&
        /^[a-f\d]{24}$/i.test(claims.sub) &&
        Number.isInteger(claims.version),
      'Session expired or invalid',
      401,
    );
    return claims as { sub: string; version: number; exp: number };
  } catch {
    assert(false, 'Session expired or invalid. Please log in.', 401);
  }
}
