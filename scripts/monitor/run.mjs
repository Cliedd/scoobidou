import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let sources;
try { sources = JSON.parse(process.env.MONITOR_SOURCES_JSON || '[]'); }
catch { throw new Error('MONITOR_SOURCES_JSON must be valid JSON'); }
if (!Array.isArray(sources)) throw new Error('MONITOR_SOURCES_JSON must be an array');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const diff = (oldText, newText) => {
  if (!oldText) return '';
  const counts = text => text.split('\n').reduce((map, line) => map.set(line, (map.get(line) || 0) + 1), new Map());
  const oldCounts = counts(oldText); const newCounts = counts(newText);
  const removed = []; const added = [];
  for (const [line, count] of oldCounts) for (let i = 0; i < count - (newCounts.get(line) || 0); i++) removed.push(`- ${line}`);
  for (const [line, count] of newCounts) for (let i = 0; i < count - (oldCounts.get(line) || 0); i++) added.push(`+ ${line}`);
  return [...removed, ...added].slice(0, 400).join('\n');
};
async function email(to, proposal) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return {sent:false, reason:'email_provider_not_configured'};
  try {
    const r = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject:'Passportly — changement de source à valider',text:`Proposition #${proposal.id}\n\n${proposal.diff}`})});
    if (!r.ok) return {sent:false, reason:`resend_http_${r.status}`, detail:(await r.text()).slice(0,500)};
    return {sent:true};
  } catch (error) { return {sent:false, reason:'resend_request_failed', detail:String(error).slice(0,500)}; }
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = await pool.connect();
try { await client.query('BEGIN'); let checked=0,proposals=0,sent=0;
  for (const config of sources) { if (!config?.name || !config?.url || config.enabled === false) continue;
    let sourceUrl; try { sourceUrl = new URL(config.url); } catch { console.error(`Skipping invalid source URL: ${config.url}`); continue; }
    if (!['http:','https:'].includes(sourceUrl.protocol)) { console.error(`Skipping non-http source URL: ${config.url}`); continue; }
    const source=(await client.query('INSERT INTO monitor_sources(name,url,parser) VALUES($1,$2,$3) ON CONFLICT(url) DO UPDATE SET name=EXCLUDED.name,parser=EXCLUDED.parser RETURNING *',[config.name,config.url,config.parser||'text'])).rows[0];
    let response;
    try { response=await fetch(sourceUrl,{headers:{'user-agent':'Passportly-Monitor/1.0'},signal:AbortSignal.timeout(15000)}); if(!response.ok) throw new Error(`HTTP ${response.status}`); }
    catch (error) { console.error(JSON.stringify({event:'source_fetch_failed',source:config.url,error:String(error).slice(0,500)})); continue; }
    const content=(await response.text()).replace(/\r\n/g,'\n').split('\n').map(line=>line.replace(/[ \t]+/g,' ').trim()).filter(Boolean).join('\n'); const fingerprint=hash(content);
    if(fingerprint===source.last_fingerprint){await client.query('UPDATE monitor_sources SET last_checked_at=now() WHERE id=$1',[source.id]);checked++;continue;}
    const old=source.last_fingerprint?(await client.query('SELECT content FROM monitor_snapshots WHERE source_id=$1 AND fingerprint=$2',[source.id,source.last_fingerprint])).rows[0]?.content:null;
    const snapshot=(await client.query('INSERT INTO monitor_snapshots(source_id,fingerprint,content) VALUES($1,$2,$3) ON CONFLICT(source_id,fingerprint) DO UPDATE SET content=EXCLUDED.content RETURNING *',[source.id,fingerprint,content])).rows[0]; const change=diff(old,content);
    if(change){const proposal=(await client.query('INSERT INTO monitor_proposals(source_id,previous_snapshot_id,current_snapshot_id,diff) SELECT $1,(SELECT id FROM monitor_snapshots WHERE source_id=$1 AND fingerprint=$2),$3,$4 RETURNING *',[source.id,source.last_fingerprint,snapshot.id,change])).rows[0];proposals++; const users=await client.query('SELECT u.id,u.email FROM users u JOIN notification_preferences p ON p.user_id=u.id WHERE p.email_enabled=true'); for(const user of users.rows){const already=await client.query('SELECT 1 FROM notification_deliveries WHERE user_id=$1 AND proposal_id=$2',[user.id,proposal.id]);if(already.rowCount)continue;const result=await email(user.email,proposal);await client.query('INSERT INTO notification_attempts(user_id,proposal_id,email,provider,sent,reason,provider_detail) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.id,proposal.id,user.email,'resend',result.sent,result.reason||null,result.detail||null]);if(result.sent){await client.query('INSERT INTO notification_deliveries(user_id,proposal_id,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[user.id,proposal.id,user.email]);sent++;}else console.error(JSON.stringify({event:'notification_delivery_failed',userId:user.id,proposalId:proposal.id,email:user.email,...result}));}}
    await client.query('UPDATE monitor_sources SET last_checked_at=now(),last_fingerprint=$1 WHERE id=$2',[fingerprint,source.id]);checked++;
  } await client.query('COMMIT'); console.log(JSON.stringify({ok:true,checked,proposals,sent}));
} catch(error){await client.query('ROLLBACK');console.error(error);process.exitCode=1;} finally{client.release();await pool.end();}
