import { handleApi } from '../_handler';
import { visaRules } from '../../../../lib/api-keys/data';
export async function GET(request: Request) { const passport = new URL(request.url).searchParams.get('passport')?.toUpperCase() || ''; if (!/^[A-Z]{2}$/.test(passport)) return Response.json({ error: { code: 'invalid_parameter', message: 'passport must be a two-letter ISO code.' } }, { status: 400 }); return handleApi(request, '/v1/map', async () => ({ passport, destinations: await visaRules(passport) })); }
