import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const key = process.env.WIDGET_API_KEY;
  if (!key) return NextResponse.json({ error: 'Widget is not configured.' }, { status: 503 });
  const url = new URL(request.url); const passport = (url.searchParams.get('passport') || 'CM').toUpperCase(); const destination = url.searchParams.get('destination') || '';
  const upstream = new URL('/api/v1/visa', url.origin); upstream.searchParams.set('passport', passport); if (destination) upstream.searchParams.set('destination', destination);
  const response = await fetch(upstream, { headers: { 'x-api-key': key }, cache: 'no-store' }); return NextResponse.json(await response.json(), { status: response.status });
}
