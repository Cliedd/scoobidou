import { handleApi } from '../_handler';
import { visaRules } from '../../../../lib/api-keys/data';
export async function GET(request: Request) { const url = new URL(request.url); const passport = (url.searchParams.get('passport') || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(passport)) return Response.json({ error: { code: 'invalid_parameter', message: 'passport must be a two-letter ISO code.' } }, { status: 400 }); return handleApi(request, '/v1/visa', async () => visaRules(passport, url.searchParams.get('destination')?.toUpperCase())); }
