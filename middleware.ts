import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(request: NextRequest) {
  const screens: Record<string,string> = {'/':'atlas','/explorer':'atlas','/visa':'visa','/assistant':'assistant','/itinerary':'schengen','/schengen':'schengen','/developer':'developer','/community':'community','/dashboard':'dashboard','/account':'dashboard','/login':'auth','/register':'auth','/compare':'compare','/guides':'resources','/data-policy':'data-policy','/privacy':'privacy','/legal':'legal','/terms':'terms'};
  const screen = request.nextUrl.pathname.startsWith('/guides/') ? 'resources' : screens[request.nextUrl.pathname];
  if ((screen === 'dashboard') && !request.cookies.get('passportly_session')?.value) return NextResponse.redirect(new URL('/login', request.url));
  const target = request.nextUrl.clone();
  if(screen) target.pathname = `/design-preview/${screen}`;
  const requestHeaders=new Headers(request.headers);requestHeaders.set('x-passportly-path',request.nextUrl.pathname);
  const response = request.nextUrl.pathname.startsWith('/admin') && !request.cookies.get('passportly_session')?.value ? NextResponse.redirect(new URL('/login', request.url)) : screen ? NextResponse.rewrite(target,{request:{headers:requestHeaders}}) : NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY'); response.headers.set('X-Content-Type-Options', 'nosniff'); response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!screen && !request.nextUrl.pathname.startsWith('/design-preview/')) response.headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://scoobidou.onrender.com");
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (request.cookies.get('passportly_session')?.value || request.nextUrl.pathname.startsWith('/api/account')) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
