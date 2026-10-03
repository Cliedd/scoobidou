import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { publicAppUrl } from '../../../../lib/public-url';

const STATE_COOKIE = 'passportly_google_state';

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) return null;
  return { clientId, redirectUri };
}

export async function GET(request: Request) {
  const oauth = config();
  if (!oauth) return NextResponse.redirect(new URL('/login?error=google_unavailable', publicAppUrl(request.url)));
  const state = randomBytes(32).toString('base64url');
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.search = new URLSearchParams({
    client_id: oauth.clientId,
    redirect_uri: oauth.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  const response = NextResponse.redirect(authorization);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/api/auth/google', maxAge: 600,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
