/* Real product bindings. No simulated responses or fallback visa rules. */
(() => {
 'use strict';
 const $ = selector => document.querySelector(selector);
 const all = selector => [...document.querySelectorAll(selector)];
 const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const countryName = code => {try{return new Intl.DisplayNames(['fr'],{type:'region'}).of(code.toUpperCase());}catch{return code;}};
 const screen = $('main')?.dataset.screen;
 const params = new URLSearchParams(location.search);
 const readStored = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}};
 const store = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Server persistence remains available. */}};
 const date = value => value ? new Date(value).toLocaleDateString('fr-FR') : 'Date de vérification non renseignée';
 let passport = params.get('passport')?.toUpperCase() || readStored('passportly-passport','CM');
 let destination = params.get('destination')?.toUpperCase() || '';
 let rules = [], entries = [], calculation = null, mapFeatures = null, zoom = 1;
 const notice = (element,message) => {if(element) element.textContent=message;};
 async function api(url,method='GET',body) {
  const response = await fetch(url,{method,cache:'no-store',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result = await response.json().catch(()=>({}));
  if(!response.ok) {const error=new Error(typeof result.error==='string'?result.error:result.error?.message || 'Le service est temporairement indisponible.');error.status=response.status;throw error;}
  return result;
 }
 const badge = rule => `<span class="nova-badge ${escape(rule.requirement)}">${escape(rule.status)}</span>`;
 const routeUrl = (page,code) => `${page}?passport=${encodeURIComponent(passport)}&destination=${encodeURIComponent(code)}`;
 function destinationOptions() {
  all('[data-destinations]').forEach(select => {
   const previous=select.value || destination;
   select.innerHTML='<option value="">Choisir une destination</option>'+rules.map(r=>`<option value="${escape(r.destination)}">${escape(r.name)}</option>`).join('');
   if(rules.some(r=>r.destination===previous)) select.value=previous;
  });
 }
 async function loadCatalog() {
  const result=await api('/api/countries?catalog=passports');
  all('[data-passports]').forEach(select => {
   const chosen=select.name==='right' ? (select.value || 'FR') : passport;
   select.innerHTML=result.data.map(c=>`<option value="${escape(c.code)}">${escape(c.name)}</option>`).join('');
   select.value=result.data.some(c=>c.code===chosen)?chosen:'CM';
   if(select.name==='passport') select.addEventListener('change',async()=>{
    passport=select.value; store('passportly-passport',passport); destination='';
    all('[data-destinations]').forEach(s=>s.value='');notice($('#visa-result'),'Choisissez une destination pour ce passeport.');
    all('[name="passport"]').forEach(s=>s.value=passport);
    try{await loadRules();}catch(error){notice($('#rules-status') || $('[data-feedback]'),error.message);}
   });
  });
 }
 async function loadRules() {
  notice($('#rules-status'),'Chargement des règles…');
  const result=await api(`/api/countries?passport=${encodeURIComponent(passport)}`);
  rules=result.data; destinationOptions();
  if(screen==='atlas'||screen==='home') {renderCountries();await renderMap();}
  if((screen==='visa'||screen==='assistant') && destination) await showVisa();
 }
 function renderCountries() {
  const query=($('#country-search')?.value || '').toLocaleLowerCase('fr');
  const filter=$('#requirement-filter')?.value || 'all';
  const filtered=rules.filter(r=>(filter==='all'||r.requirement===filter)&&`${r.name} ${r.destination}`.toLocaleLowerCase('fr').includes(query));
  notice($('#rules-status'),`${filtered.length} destination${filtered.length>1?'s':''} affichée${filtered.length>1?'s':''} pour le passeport ${countryName(passport)}.`);
  $('#country-results').innerHTML=filtered.map(r=>`<a class="nova-country" href="${routeUrl('/visa',r.destination)}"><h3>${escape(r.name)}</h3>${badge(r)}<p>${escape(r.days)}</p><small class="nova-muted">${escape(r.sourceName)} · ${escape(date(r.verifiedAt))}</small></a>`).join('');
  const counts=rules.reduce((acc,r)=>(acc[r.status]=(acc[r.status]||0)+1,acc),{});
  $('#rule-counts').innerHTML=Object.entries(counts).map(([label,count])=>`<span><strong>${count}</strong> ${escape(label)}</span>`).join('');
  all('#real-world-map [data-code]').forEach(path=>{const r=rules.find(item=>item.destination===path.dataset.code);path.style.opacity=filter==='all'||r?.requirement===filter?'1':'.18';});
 }
 async function renderMap() {
  const container=$('#real-world-map');if(!container)return;
  try {
   if(!mapFeatures) mapFeatures=(await api('/maps/world.json')).features;
   const project=point=>[(point[0]+180)*1000/360,(90-point[1])*500/180];
   const ringPath=ring=>ring.map((point,i)=>`${i?'L':'M'}${project(point).map(n=>n.toFixed(2)).join(',')}`).join(' ')+' Z';
   const colors={visa_free:'#55633d',eta:'#8a6d1f',evisa:'#ce461b',visa_on_arrival:'#2a5a8a',visa_required:'#ba1a1a',no_admission:'#1d1b18'};
   container.innerHTML=`<svg viewBox="0 0 1000 500" aria-label="Pays par exigence de visa">${mapFeatures.filter(f=>f.properties.code!=='AQ').map(feature=>{
    const code=feature.properties.code;const rule=rules.find(r=>r.destination===code);
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    return `<path d="${polygons.flatMap(poly=>poly.map(ringPath)).join(' ')}" fill="${colors[rule?.requirement]||'#dfd9d4'}" data-code="${escape(code)}" tabindex="0" role="link" aria-label="${escape(countryName(code)||feature.properties.name)}"><title>${escape(countryName(code)||feature.properties.name)} : ${escape(rule?.status || 'Règle non renseignée')}</title></path>`;
   }).join('')}</svg>`;
   all('#real-world-map [data-code]').forEach(path=>{const open=()=>{if(rules.some(r=>r.destination===path.dataset.code))location.assign(routeUrl('/visa',path.dataset.code));};path.addEventListener('click',open);path.addEventListener('keydown',event=>{if(event.key==='Enter')open();});});
   renderCountries();
  } catch {container.textContent='La carte est indisponible. Toutes les destinations restent accessibles dans la liste ci-dessous.';}
 }
 async function showVisa() {
  const container=$('#visa-result');if(!container)return;
  notice(container,'Chargement de la fiche…');
  const result=await api(`/api/visa?passport=${encodeURIComponent(passport)}&destination=${encodeURIComponent(destination)}`);
  const rule=result.data[0];
  if(!rule){notice(container,'Aucune règle enregistrée pour ce trajet.');return;}
  const portals={FR:'https://france-visas.gouv.fr/',CA:'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada.html',GB:'https://www.gov.uk/check-uk-visa',US:'https://travel.state.gov/content/travel/en/us-visas.html',TR:'https://www.evisa.gov.tr/',AE:'https://u.ae/en/information-and-services/visa-and-emirates-id',RW:'https://www.migration.gov.rw/',KE:'https://www.etakenya.go.ke/'};
  container.innerHTML=`<section class="nova-panel"><p class="nova-kicker">${escape(countryName(passport))} → ${escape(rule.name)}</p><h2>${escape(rule.name)}</h2>${badge(rule)}<div class="nova-stats"><span>Séjour : <strong>${rule.days===null?'durée non renseignée':`${escape(rule.days)} jours`}</strong></span>${rule.fee?`<span>Frais enregistrés : ${escape(rule.fee)}</span>`:''}</div><h3>Provenance</h3><p><a href="${escape(rule.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(rule.sourceName)}</a></p><p>${escape(date(rule.verifiedAt))}</p>${rule.sourceQuality==='dataset'?'<p>Cette ligne provient de la matrice du dataset ; aucune page gouvernementale spécifique n’est enregistrée pour ce trajet.</p>':''}<p class="nova-muted">Confirmez les conditions auprès de l’autorité compétente avant de réserver. Frais, délai réel et taux de refus ne sont pas renseignés lorsqu’aucune source ne les documente.</p><div class="nova-toolbar"><a href="${routeUrl('/assistant',destination)}">Préparer mon dossier</a><button data-save-destination>Enregistrer cette destination</button><a href="/data-policy">Méthode et limites</a></div><p role="status" data-save-feedback></p></section>`;
  if(portals[destination]){const p=document.createElement('p');const link=document.createElement('a');link.href=portals[destination];link.target='_blank';link.rel='noopener noreferrer';link.textContent='Vérifier les conditions sur le portail officiel de la destination';p.append(link);container.querySelector('.nova-panel').append(p);}
  $('[data-save-destination]').addEventListener('click',async event=>{
   const button=event.currentTarget;button.disabled=true;
   try{await api('/api/account/saved','POST',{passport,destination});notice($('[data-save-feedback]'),'Destination enregistrée.');}catch(error){notice($('[data-save-feedback]'),error.status===401?'Connectez-vous pour enregistrer une destination.':error.message);}finally{button.disabled=false;}
  });
  if(screen==='assistant') await loadChecklist();
 }
 function checklistKey(){return `route:${passport}:${destination}`;}
 const basicTasks=['Consulter le portail officiel de la destination','Vérifier la validité et les pages libres du passeport','Relever les pièces exigées pour mon motif de séjour','Consulter les frais et délais annoncés par l’autorité','Préparer mon itinéraire et mes justificatifs'];
 let tasks=[],checked=[];
 function renderTasks(){
  $('#checklist-items').innerHTML=tasks.map((task,i)=>`<label class="nova-check"><input type="checkbox" value="${i}" ${checked.includes(i)?'checked':''}>${escape(task)}</label>`).join('');
  all('#checklist-items input').forEach(box=>box.addEventListener('change',()=>{checked=all('#checklist-items input:checked').map(b=>Number(b.value));store(checklistKey(),{tasks,checked});}));
 }
 async function loadChecklist(){
  const saved=readStored(checklistKey(),{tasks:basicTasks,checked:[]});tasks=saved.tasks;checked=saved.checked;
  try{const result=await api('/api/account/checklists');const match=result.data.find(c=>c.guide_slug===checklistKey());if(match){checked=match.checked;if(Array.isArray(match.tasks)&&match.tasks.length)tasks=match.tasks;}}catch{/* Anonymous users can prepare locally. */}
  renderTasks();
 }
 function bindForm(id,handler){
  const form=$(id);if(!form)return;
  form.addEventListener('submit',async event=>{
   event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;
   try{await handler(form,new FormData(form));}catch(error){notice(form.querySelector('[data-feedback]'),error.status===401?'Connectez-vous pour utiliser cette fonctionnalité.':error.message);}finally{button.disabled=false;}
  });
 }
 async function loadCommunity(){
  const result=await api('/api/testimonials');const query=($('#community-search')?.value || '').toLocaleLowerCase('fr');
  const rows=result.data.filter(row=>`${row.destination} ${row.content}`.toLocaleLowerCase('fr').includes(query));
  $('#community-feed').innerHTML=rows.length?rows.map(row=>`<article class="nova-panel"><h3>${escape(row.destination)}</h3><p>${escape(row.content)}</p><small>${escape(row.author_name)} · ${escape(date(row.created_at))} · ${escape(row.rating)} / 5</small></article>`).join(''):'<p>Aucune expérience publiée pour le moment.</p>';
 }
 async function loadAccount(){
  const data=await api('/api/account/data');notice($('#account-status'),`Connecté : ${data.user.email}`);
  $('#saved-list').innerHTML=data.saved.length?data.saved.map(row=>`<div class="nova-row"><span><a href="/visa?passport=${escape(row.passport_code)}&destination=${escape(row.destination_code)}">${escape(countryName(row.passport_code))} → ${escape(countryName(row.destination_code))}</a></span><button data-remove-saved="${escape(row.destination_code)}" data-passport="${escape(row.passport_code)}">Supprimer</button></div>`).join(''):'<p>Aucune destination enregistrée.</p>';
  $('#alerts-list').innerHTML=data.alerts.length?data.alerts.map(row=>`<div class="nova-row"><span>${escape(countryName(row.passport_code))} → ${row.destination_code?escape(countryName(row.destination_code)):'Toutes les destinations'}<br><small>${row.baseline_requirement && row.current_requirement && (row.baseline_requirement!==row.current_requirement || row.baseline_days!==row.current_days)?'Les conditions enregistrées ont changé depuis le début du suivi.':'Aucun changement enregistré depuis le début du suivi.'}</small></span><button data-remove-alert="${escape(row.id)}">Arrêter le suivi</button></div>`).join(''):'<p>Aucun trajet suivi.</p>';
  $('#account-checklists').innerHTML=data.checklists.length?data.checklists.map(row=>{const pair=row.guide_slug.split(':');return `<div class="nova-row"><span>${escape(row.guide_slug)} · ${row.checked.length} tâche(s) cochée(s)</span>${pair.length===3?`<a href="/assistant?passport=${escape(pair[1])}&destination=${escape(pair[2])}">Reprendre</a>`:''}</div>`;}).join(''):'<p>Aucune checklist enregistrée.</p>';
  $('#account-itineraries').innerHTML=data.itineraries.length?data.itineraries.map(row=>`<article class="nova-panel"><h3>${escape(row.name)}</h3><p>Date de contrôle : ${escape(date(row.reference_date))}</p><p>${escape(row.calculation?.usedDays ?? '')} jours comptés</p><button data-load-itinerary="${escape(row.id)}">Ouvrir le calcul</button></article>`).join(''):'<p>Aucun calcul enregistré.</p>';
  $('#account-testimonials').innerHTML=data.testimonials.length?data.testimonials.map(row=>`<article class="nova-panel"><h3>${escape(row.destination)}</h3><p>${escape(row.content)}</p><small>${escape(({pending:'En attente de modération',approved:'Publié',rejected:'Non publié'})[row.status]||row.status)}</small></article>`).join(''):'<p>Aucun témoignage soumis.</p>';
  all('[data-remove-saved]').forEach(button=>button.addEventListener('click',()=>accountAction(()=>api('/api/account/saved','DELETE',{passport:button.dataset.passport,destination:button.dataset.removeSaved}),button)));
  all('[data-remove-alert]').forEach(button=>button.addEventListener('click',()=>accountAction(()=>api('/api/account/alerts','DELETE',{id:Number(button.dataset.removeAlert)}),button)));
  all('[data-load-itinerary]').forEach(button=>button.addEventListener('click',()=>{const item=data.itineraries.find(row=>String(row.id)===button.dataset.loadItinerary);store('passportly-itinerary',item);location.assign('/itinerary?restore=1');}));
 }
 async function accountAction(action,button){button.disabled=true;try{await action();await loadAccount();}catch(error){notice($('#account-status'),error.message);button.disabled=false;}}
 function addStay(stay={}) {
  const row=document.createElement('div');row.className='nova-stay';
  const schengen=['AT','BE','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH'].map(countryName).sort((a,b)=>a.localeCompare(b,'fr'));
  row.innerHTML=`<label>Pays Schengen<select name="country" required>${schengen.map(name=>`<option value="${escape(name)}" ${name===(stay.country || 'France')?'selected':''}>${escape(name)}</option>`).join('')}</select></label><label>Entrée<input name="start" type="date" value="${escape(stay.start||'')}" required></label><label>Sortie<input name="end" type="date" value="${escape(stay.end||'')}" required></label><button type="button" aria-label="Supprimer ce séjour">Supprimer</button>`;
  row.querySelector('button').addEventListener('click',()=>{row.remove();calculation=null;$('#save-itinerary').disabled=true;});
  row.addEventListener('input',()=>{calculation=null;$('#save-itinerary').disabled=true;});$('#stay-rows').append(row);
 }
 async function loadKeys(){
  try{const result=await api('/api/account/keys');$('#api-key-list').innerHTML=result.data.length?result.data.map(row=>`<div class="nova-row"><span>${escape(row.name)} · ${escape(row.key_prefix)}… · ${row.active?'Active':'Révoquée'}</span>${row.active?`<button data-revoke-key="${escape(row.id)}">Révoquer</button>`:''}</div>`).join(''):'<p>Aucune clé API créée.</p>';
   all('[data-revoke-key]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{await api(`/api/account/keys?id=${encodeURIComponent(button.dataset.revokeKey)}`,'DELETE');await loadKeys();}catch(error){notice($('#api-key-form [data-feedback]'),error.message);button.disabled=false;}}));
  }catch(error){notice($('#api-key-list'),error.status===401?'Connectez-vous pour gérer vos clés API.':error.message);}
 }
 async function main(){
  if(screen==='compare')bindForm('#compare-form',async(form,data)=>{const [left,right]=await Promise.all([api(`/api/visa?passport=${encodeURIComponent(data.get('passport'))}`),api(`/api/visa?passport=${encodeURIComponent(data.get('right'))}`)]);const rightMap=new Map(right.data.map(r=>[r.destination,r]));$('#comparison-result').innerHTML=`<div class="nova-table"><table><thead><tr><th>Destination</th><th>${escape(countryName(data.get('passport')))}</th><th>${escape(countryName(data.get('right')))}</th></tr></thead><tbody>${left.data.map(r=>`<tr><td>${escape(r.name)}</td><td>${badge(r)}</td><td>${rightMap.has(r.destination)?badge(rightMap.get(r.destination)):'Non renseigné'}</td></tr>`).join('')}</tbody></table></div>`;notice(form.querySelector('[data-feedback]'),`${left.data.length} destinations comparées.`);});
  all('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
  api('/api/auth/me').then(result=>{const link=$('[data-account-link]');if(!result.user){link.href='/login';link.textContent='Se connecter';}}).catch(()=>{});
  if(all('[data-passports]').length){try{await loadCatalog();await loadRules();}catch(error){notice($('#rules-status')||$('[data-feedback]'),error.message);}}
  all('[data-route-search]').forEach(form=>form.addEventListener('submit',async event=>{
   if(!form.elements.destination.value){event.preventDefault();notice(form.querySelector('[data-feedback]'),'Choisissez une destination.');return;}
   if(screen==='atlas'||screen==='home')return;
   event.preventDefault();passport=form.elements.passport.value;destination=form.elements.destination.value;
   const next=new URL(location.href);next.searchParams.set('passport',passport);next.searchParams.set('destination',destination);history.replaceState(null,'',next);
   try{await showVisa();}catch(error){notice(form.querySelector('[data-feedback]'),error.message);}
  }));
  $('#country-search')?.addEventListener('input',renderCountries);$('#requirement-filter')?.addEventListener('change',renderCountries);
  $('#refresh-rules')?.addEventListener('click',()=>loadRules().catch(error=>notice($('#rules-status'),error.message)));
  all('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{zoom=button.dataset.zoom==='reset'?1:Math.max(1,Math.min(4,zoom+(button.dataset.zoom==='in' ? .5 : -.5)));const svg=$('#real-world-map svg');if(svg){const w=1000/zoom,h=500/zoom;svg.setAttribute('viewBox',`${(1000-w)/2} ${(500-h)/2} ${w} ${h}`);}}));
  if(screen==='assistant') {
   if(!destination){tasks=basicTasks;checked=[];renderTasks();}
   $('#add-task').addEventListener('click',()=>{const input=$('#checklist-form [name="task"]');if(input.value.trim()&&tasks.length<100){tasks.push(input.value.trim().slice(0,200));input.value='';renderTasks();store(checklistKey(),{tasks,checked});}});
   bindForm('#checklist-form',async(form)=>{if(!destination)throw Error('Choisissez une destination.');await api('/api/account/checklists','PUT',{guideSlug:checklistKey(),checked,tasks});notice(form.querySelector('[data-feedback]'),'Checklist enregistrée.');});
  }
  if(screen==='auth'){
   all('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>{const form=$('#auth-form');form.dataset.mode=button.dataset.authMode;form.querySelector('[name="password"]').autocomplete=button.dataset.authMode==='register'?'new-password':'current-password';notice(form.querySelector('[data-feedback]'),button.dataset.authMode==='register'?'Création d’un compte':'Connexion');}));
   bindForm('#auth-form',async(form,data)=>{await api(`/api/auth/${form.dataset.mode}`,'POST',{email:data.get('email'),password:data.get('password')});location.assign('/account');});
  }
  if(screen==='community'){
   try{await loadCommunity();}catch(error){notice($('#community-feed'),error.message);}$('#community-search').addEventListener('input',()=>loadCommunity().catch(error=>notice($('#community-feed'),error.message)));
   bindForm('#testimonial-form',async(form,data)=>{const result=await api('/api/testimonials','POST',{...Object.fromEntries(data),rating:Number(data.get('rating'))});notice(form.querySelector('[data-feedback]'),result.message);form.reset();});
  }
  if(screen==='dashboard'){
   try{await loadAccount();}catch(error){if(error.status===401){location.assign('/login');return;}notice($('#account-status'),error.message);}$('#logout').addEventListener('click',async()=>{try{await api('/api/auth/logout','POST',{});location.assign('/login');}catch(error){notice($('#account-status'),error.message);}});
   $('#export-account').addEventListener('click',async()=>{try{const data=await api('/api/account/data');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='passportly-mes-donnees.json';link.click();URL.revokeObjectURL(url);}catch(error){notice($('#privacy-feedback'),error.message);}});
   $('#delete-account').addEventListener('click',async()=>{if(!confirm('Supprimer définitivement votre compte et vos données enregistrées ?'))return;try{await api('/api/account/data','DELETE');location.assign('/');}catch(error){notice($('#privacy-feedback'),error.message);}});
   bindForm('#saved-form',async(form,data)=>{if(!data.get('destination'))throw Error('Choisissez une destination.');await api('/api/account/saved','POST',Object.fromEntries(data));await loadAccount();notice(form.querySelector('[data-feedback]'),'Destination enregistrée.');});
   bindForm('#alert-form',async(form,data)=>{if(!data.get('destination'))throw Error('Choisissez une destination.');await api('/api/account/alerts','POST',{passport:data.get('passport'),destination:data.get('destination'),emailEnabled:false});await loadAccount();notice(form.querySelector('[data-feedback]'),'Trajet suivi dans votre espace.');});
  }
  if(screen==='schengen'){
   $('#schengen-form [name="referenceDate"]').value=new Date().toISOString().slice(0,10);
   const restored=params.get('restore')?readStored('passportly-itinerary',null):null;
   if(restored){restored.stays.forEach(addStay);$('#schengen-form [name="referenceDate"]').value=String(restored.reference_date).slice(0,10);}else addStay();
   $('#add-stay').addEventListener('click',()=>{if(all('.nova-stay').length<100)addStay();});
   $('#schengen-form [name="referenceDate"]').addEventListener('input',()=>{calculation=null;$('#save-itinerary').disabled=true;});
   bindForm('#schengen-form',async(form,data)=>{entries=all('.nova-stay').map(row=>({country:row.querySelector('[name="country"]').value,start:row.querySelector('[name="start"]').value,end:row.querySelector('[name="end"]').value}));calculation=await api('/api/schengen','POST',{entries,referenceDate:data.get('referenceDate')});$('#schengen-result').innerHTML=`<section class="nova-panel"><h2>${calculation.compliant?'Limite de 90 jours respectée à cette date':'Limite de 90 jours dépassée à cette date'}</h2><div class="nova-stats"><span><strong>${calculation.usedDays}</strong> jours comptés</span><span><strong>${calculation.remainingDays}</strong> jours disponibles dans cette fenêtre</span><span><strong>${calculation.overstayDays}</strong> jours au-delà de la limite</span></div><p>Fenêtre : ${escape(date(calculation.windowStart))} au ${escape(date(calculation.referenceDate))}.</p><p class="nova-muted">Le résultat porte sur la date choisie, pas sur l’ensemble des jours futurs. La validité du visa et les conditions d’admission doivent aussi être respectées.</p></section>`;$('#save-itinerary').disabled=false;notice(form.querySelector('[data-feedback]'),'Calcul effectué.');});
   $('#save-itinerary').addEventListener('click',async()=>{if(!calculation)return;try{await api('/api/account/itineraries','POST',{name:'Mon calendrier Schengen',stays:entries,referenceDate:calculation.referenceDate});notice($('#itinerary-feedback'),'Calcul enregistré.');}catch(error){notice($('#itinerary-feedback'),error.status===401?'Connectez-vous pour enregistrer le calcul.':error.message);}});
  }
  if(screen==='developer'){
   await loadKeys();bindForm('#api-key-form',async(form,data)=>{const result=await api('/api/account/keys','POST',{name:data.get('name')});$('#new-api-key').innerHTML='<p>Copiez cette clé maintenant. Elle ne sera plus affichée.</p><pre></pre>';$('#new-api-key pre').textContent=result.data.key;await loadKeys();notice(form.querySelector('[data-feedback]'),'Clé créée.');});
   bindForm('#api-test-form',async(form,data)=>{if(!data.get('destination'))throw Error('Choisissez une destination.');const response=await fetch(`/api/v1/visa?passport=${encodeURIComponent(data.get('passport'))}&destination=${encodeURIComponent(data.get('destination'))}`,{cache:'no-store',headers:{'x-api-key':data.get('key')}});const result=await response.json();$('#api-test-result').textContent=JSON.stringify(result,null,2);notice(form.querySelector('[data-feedback]'),`Réponse HTTP ${response.status}`);});
  }
  if(screen==='atlas'||screen==='home')setInterval(()=>{if(!document.hidden)loadRules().catch(error=>notice($('#rules-status'),error.message));},60000);
  if(screen==='dashboard')setInterval(()=>{if(!document.hidden)loadAccount().catch(error=>notice($('#account-status'),error.message));},60000);
 }
 main().catch(error=>notice($('#rules-status')||$('#account-status')||$('[data-feedback]')||$('#community-feed'),error.message));
})();
