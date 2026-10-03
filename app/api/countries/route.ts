import { getRules, getCatalog } from '../../../entities/visa/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if(params.get('catalog') === 'passports') return Response.json({data:await getCatalog()},{headers:{'Cache-Control':'no-store'}});
    const passport = (params.get('passport') || 'CM').toUpperCase();
    if(!/^[A-Z]{2}$/.test(passport)) return Response.json({error:'Code pays invalide.'},{status:400});
    const requirement = params.get('requirement'), search = (params.get('search') || '').toLocaleLowerCase('fr');
    const data = (await getRules(passport)).filter(r => (!requirement || requirement==='all' || r.requirement===requirement) && (!search || `${r.name} ${r.destination}`.toLocaleLowerCase('fr').includes(search))).map(r => ({...r,code:r.destination.toLowerCase(),days:r.days===null ? 'Durée non renseignée' : `${r.days} jours`,source:r.sourceName,checked:r.verifiedAt,color:r.requirement==='visa_free'?'green':r.requirement==='evisa'||r.requirement==='eta'?'blue':'amber'}));
    return Response.json({data,meta:{passport,count:data.length,source:'postgresql',retrievedAt:new Date().toISOString()}},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { console.error('Country data unavailable',error instanceof Error?error.message:'Unknown database error'); return Response.json({error:'Impossible de charger les pays.'},{status:503}); }
}
