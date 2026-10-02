import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith('/admin') && !request.cookies.get('passportly_session')?.value ? NextResponse.redirect(new URL('/?admin=login', request.url)) : NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY'); response.headers.set('X-Content-Type-Options', 'nosniff'); response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
export const config = { matcher: ['/admin/:path*'] };
