import { NextResponse } from 'next/server';
import { authenticate, logUsage, withApiMeta } from '../../../lib/api-keys';

export async function handleApi(request: Request, endpoint: string, action: (key: { id: string; name: string; plan: 'free'|'pro'|'business' }) => Promise<unknown>) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  try { const result = await action(auth.key); const response = NextResponse.json(withApiMeta(result, auth.requestId, auth.key)); await logUsage(auth.key, auth.requestId, endpoint, 200); response.headers.set('x-request-id', auth.requestId); return response; }
  catch (error) { console.error(`API v1 ${endpoint}`, error); await logUsage(auth.key, auth.requestId, endpoint, 500); return Response.json({ error: { code: 'internal_error', message: 'An unexpected error occurred.', requestId: auth.requestId } }, { status: 500, headers: { 'x-request-id': auth.requestId } }); }
}
