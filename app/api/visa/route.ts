import { getRules } from '../../../entities/visa/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const passport = (params.get('passport') || 'CM').toUpperCase();
  const destination = params.get('destination')?.toUpperCase();
  if (!/^[A-Z]{2}$/.test(passport) || (destination && !/^[A-Z]{2}$/.test(destination))) return Response.json({error:'Code pays invalide.'},{status:400});
  try { const data = await getRules(passport,destination); return Response.json({data,meta:{passport,count:data.length,source:'postgresql',retrievedAt:new Date().toISOString()}},{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'Les règles de visa sont temporairement indisponibles.'},{status:503}); }
}
