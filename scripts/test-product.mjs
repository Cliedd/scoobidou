import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const origin=process.env.TEST_ORIGIN || 'http://localhost:3100';
let cookie='',created=false;
async function request(path,method='GET',body,headers={}) {
 const response=await fetch(origin+path,{method,headers:{...(cookie?{cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 const session=response.headers.get('set-cookie');if(session)cookie=session.split(';')[0];
 return {response,data};
}
const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS',name);};
try {
 for(const path of ['/','/login','/visa','/assistant','/community','/itinerary','/developer','/compare','/data-policy','/privacy','/legal']){
  const {response,data}=await request(path);check(`${path} clean public page`,response.status===200 && !/Protocole Diplomatique|INDEX CONFIANCE|Design Stitch|TIMATIC conformes|Dossier #CMR|href="#"/.test(data));
 }
 const catalog=await request('/api/countries?catalog=passports');check('real passport catalog',catalog.data.data.length>100);
 const rules=await request('/api/countries?passport=CM');check('real destination coverage',rules.data.data.length>100 && rules.data.meta.source==='postgresql');
 check('country names resolved',rules.data.data.find(r=>r.destination==='FR')?.name==='France');
 const invalid=await request('/api/visa?passport=invalid');check('invalid codes rejected',invalid.response.status===400);
 const pair=await request('/api/visa?passport=CM&destination=FR');check('database rule with honest provenance',pair.data.meta.source==='postgresql' && pair.data.data[0].sourceUrl && pair.data.data[0].fee===null);
 const calculation=await request('/api/schengen','POST',{entries:[{country:'France',start:'2026-01-01',end:'2026-01-10'},{country:'Espagne',start:'2026-01-05',end:'2026-01-15'}],referenceDate:'2026-01-15'});
 check('overlaps counted once',calculation.data.usedDays===15 && Object.values(calculation.data.daysByCountry).reduce((a,b)=>a+b,0)===15);
 const badDate=await request('/api/schengen','POST',{entries:[{start:'2026-02-31',end:'2026-03-05'}],referenceDate:'2026-03-05'});check('invalid calendar dates rejected',badDate.response.status===400);
 const auth=await request('/api/auth/register','POST',{email:`passportly-e2e-${randomBytes(8).toString('hex')}@example.invalid`,password:randomBytes(20).toString('hex')});check('registration backed by database',auth.response.status===201);created=true;
 const saved=await request('/api/account/saved','POST',{passport:'CM',destination:'FR'});check('save destination',saved.response.status===201);
 const alert=await request('/api/account/alerts','POST',{passport:'CM',destination:'FR',emailEnabled:false});check('create persisted route watch',alert.response.status===201 && alert.data.data.baseline_requirement);
 const checklist=await request('/api/account/checklists','PUT',{guideSlug:'route:CM:FR',checked:[0],tasks:['Consulter le portail officiel','Ma tâche personnelle']});check('save custom checklist',checklist.response.status===200 && checklist.data.data.tasks.length===2);
 const itinerary=await request('/api/account/itineraries','POST',{stays:[{country:'France',start:'2026-01-01',end:'2026-01-10'}],referenceDate:'2026-01-15',calculation:{usedDays:999}});check('itinerary recalculated server-side',itinerary.response.status===201 && itinerary.data.data.calculation.usedDays===10);
 const testimonial=await request('/api/testimonials','POST',{name:'Test automatisé',destination:'France',content:'Compte de test temporaire ; ne pas publier.',rating:4});check('testimonial pending moderation',testimonial.response.status===201 && testimonial.data.data.status==='pending');
 const keys=await request('/api/account/keys','POST',{name:'Test temporaire'});check('create owned API key',keys.response.status===201 && keys.data.data.key);
 const apiResult=await request('/api/v1/visa?passport=CM&destination=FR','GET',undefined,{'x-api-key':keys.data.data.key});check('API key authorization and usage logging',apiResult.response.status===200 && apiResult.data.data[0].source_url);
 const revoke=await request(`/api/account/keys?id=${keys.data.data.id}`,'DELETE');check('revoke owned key',revoke.response.status===200);
 const denied=await request('/api/v1/visa?passport=CM&destination=FR','GET',undefined,{'x-api-key':keys.data.data.key});check('revoked key rejected',denied.response.status===401);
 const account=await request('/api/account/data');check('account reflects real saved state',account.data.saved.length===1 && account.data.alerts[0].id && account.data.itineraries[0].id && account.data.testimonials.length===1);
 const remove=await request('/api/account/saved','DELETE',{passport:'CM',destination:'FR'});check('remove saved destination',remove.response.status===200);
 const removeAlert=await request('/api/account/alerts','DELETE',{id:alert.data.data.id});check('remove route watch',removeAlert.response.status===200);
}finally {
 if(created){const cleanup=await request('/api/account/data','DELETE');check('temporary account and its data deleted',cleanup.response.status===200);}
}
