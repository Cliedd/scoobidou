import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const prices = { pro: 'STRIPE_PRICE_PRO', business: 'STRIPE_PRICE_BUSINESS' } as const;
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: { code: 'stripe_not_configured', message: 'Stripe is not configured.' } }, { status: 503 });
  const body = await request.json().catch(() => ({})); const plan = body.plan as keyof typeof prices; const price = plan && process.env[prices[plan]];
  if (!price) return NextResponse.json({ error: { code: 'invalid_parameter', message: 'plan must be pro or business.' } }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const form = new URLSearchParams({ mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': '1', success_url: `${origin}/developer?billing=success`, cancel_url: `${origin}/developer?billing=cancelled`, 'metadata[plan]': plan });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form }); const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: { code: 'stripe_error', message: 'Unable to create checkout session.' } }, { status: 502 });
  return NextResponse.json({ data: { url: data.url, id: data.id } });
}
