import { randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { passwordDigest, startSession } from '../../../../../lib/auth';
import { db, ensureSchema } from '../../../../../lib/db';

const STATE_COOKIE = 'passportly_google_state';
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

function finish(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(STATE_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google', expires: new Date(0) });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function sameState(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') || '';
  const expectedState = request.cookies.get(STATE_COOKIE)?.value || '';
  const code = request.nextUrl.searchParams.get('code');
  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError) return finish(request, '/login?error=google_denied');
  if (!state || !expectedState || !sameState(state, expectedState) || !code) return finish(request, '/login?error=google_state');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!db || !clientId || !clientSecret || !redirectUri) return finish(request, '/login?error=google_unavailable');

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    if (!tokenResponse.ok) return finish(request, '/login?error=google_exchange');
    const tokens = await tokenResponse.json() as { access_token?: string; token_type?: string };
    if (!tokens.access_token || tokens.token_type?.toLowerCase() !== 'bearer') return finish(request, '/login?error=google_exchange');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    if (!profileResponse.ok) return finish(request, '/login?error=google_profile');
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean };
    const email = profile.email?.trim().toLowerCase();
    if (!profile.sub || !email || profile.email_verified !== true) return finish(request, '/login?error=google_unverified');

    await ensureSchema();
    const existingGoogleUser = await db.query('SELECT id FROM users WHERE google_sub=$1', [profile.sub]);
    let userId: string;
    if (existingGoogleUser.rows[0]) {
      userId = existingGoogleUser.rows[0].id;
    } else {
      const existingEmail = await db.query('SELECT id,google_sub FROM users WHERE email=$1', [email]);
      if (existingEmail.rows[0]) {
        if (existingEmail.rows[0].google_sub && existingEmail.rows[0].google_sub !== profile.sub) return finish(request, '/login?error=google_account_conflict');
        const linked = await db.query('UPDATE users SET google_sub=$1,updated_at=now() WHERE id=$2 AND (google_sub IS NULL OR google_sub=$1) RETURNING id', [profile.sub, existingEmail.rows[0].id]);
        if (!linked.rows[0]) return finish(request, '/login?error=google_account_conflict');
        userId = linked.rows[0].id;
      } else {
        try {
          const created = await db.query("INSERT INTO users(email,password_hash,role,google_sub) VALUES($1,$2,'user',$3) RETURNING id", [email, passwordDigest(randomBytes(48).toString('hex')), profile.sub]);
          userId = created.rows[0].id;
        } catch (error) {
          if ((error as { code?: string }).code !== '23505') throw error;
          const racedUser = await db.query('SELECT id FROM users WHERE google_sub=$1', [profile.sub]);
          if (!racedUser.rows[0]) return finish(request, '/login?error=google_account_conflict');
          userId = racedUser.rows[0].id;
        }
      }
    }
    if (!await startSession(userId)) return finish(request, '/login?error=google_unavailable');
    return finish(request, '/account');
  } catch {
    return finish(request, '/login?error=google_unavailable');
  }
}
