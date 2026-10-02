import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

function validSignature(payload: string, header: string, secret: string) {
  const timestamp = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signature = header.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1];
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return Response.json({ error: { code: 'stripe_not_configured', message: 'Stripe webhook is not configured.' } }, { status: 503 });
  const payload = await request.text();
  if (!validSignature(payload, signature, secret)) return Response.json({ error: { code: 'invalid_signature', message: 'Invalid Stripe signature.' } }, { status: 400 });
  const event = JSON.parse(payload) as { id?: string; type?: string };
  // Entitlements are intentionally not inferred here: connect a billing store before enabling paid access.
  console.info('Stripe event received', { id: event.id, type: event.type });
  return Response.json({ received: true, id: event.id });
}
