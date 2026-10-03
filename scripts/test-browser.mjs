import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const WebSocket=require('next/dist/compiled/ws');
const origin=process.env.TEST_ORIGIN || 'http://localhost:3100';
const tab=await (await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(origin)}`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
let sequence=0;const pending=new Map();const errors=[];
ws.on('message',raw=>{const message=JSON.parse(String(raw));if(message.id){const handler=pending.get(message.id);if(handler){pending.delete(message.id);message.error?handler.reject(Error(message.error.message)):handler.resolve(message.result);}}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
async function wait(expression){const end=Date.now()+60000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,250));}throw Error(`Timed out: ${expression}`);}
const pass=name=>console.log('PASS',name);
try {
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1360,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:origin+'/'});await wait('document.querySelectorAll("#country-results .nova-country").length > 100');
 assert.equal(await evaluate('/INDEX CONFIANCE|Design Stitch|Protocole Diplomatique|TIMATIC conformes/.test(document.body.innerText)'),false);pass('no fabricated public guarantees');
 await wait('document.querySelectorAll("#real-world-map path").length > 150');pass('real geographic map rendered');
 const original=await evaluate('document.querySelector("#real-world-map svg").getAttribute("viewBox")');
 await evaluate('document.querySelector("[data-zoom=in]").click()');assert.notEqual(await evaluate('document.querySelector("#real-world-map svg").getAttribute("viewBox")'),original);pass('map zoom button');
 await evaluate('document.querySelector("[data-zoom=reset]").click()');assert.equal(await evaluate('document.querySelector("#real-world-map svg").getAttribute("viewBox")'),original);pass('map reset button');
 await evaluate('document.querySelector("#country-search").value="France";document.querySelector("#country-search").dispatchEvent(new Event("input",{bubbles:true}))');assert.equal(await evaluate('document.querySelectorAll("#country-results .nova-country").length'),1);pass('country search filters real data');
 await evaluate('document.querySelector("#country-results .nova-country").click()');await wait('location.pathname==="/visa" && document.querySelector("#visa-result .nova-panel")');pass('destination opens populated visa detail');
 const image=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/passportly-visa-live.png',Buffer.from(image.data,'base64'));
 await send('Page.navigate',{url:origin+'/itinerary'});await wait('document.querySelector(".nova-stay")');
 await evaluate(`document.querySelector('[name=referenceDate]').value='2026-01-15';document.querySelector('.nova-stay [name=country]').value='France';document.querySelector('.nova-stay [name=start]').value='2026-01-01';document.querySelector('.nova-stay [name=end]').value='2026-01-10';document.querySelector('#add-stay').click();const row=document.querySelectorAll('.nova-stay')[1];row.querySelector('[name=country]').value='Espagne';row.querySelector('[name=start]').value='2026-01-05';row.querySelector('[name=end]').value='2026-01-15';document.querySelector('#schengen-form').requestSubmit();`);
 await wait('document.querySelector("#schengen-result strong")?.textContent==="15"');pass('Schengen form calls real calculation API');
 await evaluate('document.querySelectorAll(".nova-stay button")[1].click()');assert.equal(await evaluate('document.querySelectorAll(".nova-stay").length'),1);pass('remove stay button');
 await send('Page.navigate',{url:origin+'/compare'});await wait('document.querySelectorAll("[data-passports] option").length > 100');
 await evaluate('document.querySelector("#compare-form").requestSubmit()');await wait('document.querySelectorAll("#comparison-result tbody tr").length>100');pass('passport comparison backed by API');
 await send('Page.navigate',{url:origin+'/login'});await wait('document.querySelector("[data-auth-mode=register]")');await evaluate('document.querySelector("[data-auth-mode=register]").click()');assert.equal(await evaluate('document.querySelector("#auth-form").dataset.mode'),'register');pass('auth mode switch');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:origin+'/'});await wait('document.querySelectorAll("#country-results .nova-country").length>100');
 assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'),true);pass('mobile layout has no horizontal overflow');
 const mobile=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/passportly-mobile-live.png',Buffer.from(mobile.data,'base64'));
 assert.deepEqual(errors,[]);pass('no uncaught browser exceptions');
}finally{await send('Page.close').catch(()=>{});ws.close();}
