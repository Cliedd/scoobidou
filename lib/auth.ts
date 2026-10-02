import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db, ensureSchema } from './db';

const SESSION_COOKIE = 'passportly_session';
const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex');

export function passwordDigest(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${hashPassword(password, salt)}`;
}

export function passwordMatches(password: string, digest: string) {
  const [salt, expected] = digest.split(':');
  if (!salt || !expected) return false;
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const wanted = Buffer.from(expected, 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function currentUser() {
  if (!db) return null;
  await ensureSchema();
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await db.query("SELECT u.id, u.email, COALESCE(u.role, 'user') AS role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at > now()", [token]);
  return result.rows[0] || null;
}

export async function startSession(userId: string) {
  if (!db) return false;
  const token = randomBytes(32).toString('hex');
  await db.query("INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')", [token, userId]);
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return true;
}

export async function endSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (db && token) await db.query('DELETE FROM sessions WHERE token=$1', [token]);
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0), path: '/' });
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validPassword = (password: string) => typeof password === 'string' && password.length >= 8;

export async function consumeRateLimit(bucket: string, limit: number, windowSeconds = 900) {
  if (!db) return true;
  await ensureSchema();
  const result = await db.query(`INSERT INTO rate_limits(bucket,count,window_started_at) VALUES($1,1,now()) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN rate_limits.window_started_at <= now() - ($2::int * interval '1 second') THEN 1 ELSE rate_limits.count + 1 END, window_started_at=CASE WHEN rate_limits.window_started_at <= now() - ($2::int * interval '1 second') THEN now() ELSE rate_limits.window_started_at END RETURNING count`, [bucket, windowSeconds]);
  return Number(result.rows[0]?.count || 0) <= limit;
}
