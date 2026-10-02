import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sources = JSON.parse(process.env.MONITOR_SOURCES_JSON || '[]');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const diff = (oldText, newText) => newText.split(/\r?\n/).filter(line => !oldText?.split(/\r?\n/).includes(line)).slice(0, 200).map(line => `+ ${line}`).join('\n');
async function email(to, proposal) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  const r = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject:'Passportly — changement de source à valider',text:`Proposition #${proposal.id}\n\n${proposal.diff}`})});
  return r.ok;
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = await pool.connect();
try { await client.query('BEGIN'); let checked=0,proposals=0,sent=0;
  for (const config of sources) { if (!config?.name || !config?.url) continue;
    const source=(await client.query('INSERT INTO monitor_sources(name,url,parser) VALUES($1,$2,$3) ON CONFLICT(url) DO UPDATE SET name=EXCLUDED.name,parser=EXCLUDED.parser RETURNING *',[config.name,config.url,config.parser||'text'])).rows[0];
    const response=await fetch(config.url,{headers:{'user-agent':'Passportly-Monitor/1.0'},signal:AbortSignal.timeout(15000)}); if(!response.ok) throw new Error(`${config.url}: HTTP ${response.status}`);
    const content=(await response.text()).replace(/\s+/g,' ').trim(); const fingerprint=hash(content);
    if(fingerprint===source.last_fingerprint){await client.query('UPDATE monitor_sources SET last_checked_at=now() WHERE id=$1',[source.id]);checked++;continue;}
    const old=source.last_fingerprint?(await client.query('SELECT content FROM monitor_snapshots WHERE source_id=$1 AND fingerprint=$2',[source.id,source.last_fingerprint])).rows[0]?.content:null;
    const snapshot=(await client.query('INSERT INTO monitor_snapshots(source_id,fingerprint,content) VALUES($1,$2,$3) ON CONFLICT(source_id,fingerprint) DO UPDATE SET content=EXCLUDED.content RETURNING *',[source.id,fingerprint,content])).rows[0]; const change=diff(old,content);
    if(change){const proposal=(await client.query('INSERT INTO monitor_proposals(source_id,previous_snapshot_id,current_snapshot_id,diff) SELECT $1,(SELECT id FROM monitor_snapshots WHERE source_id=$1 AND fingerprint=$2),$3,$4 RETURNING *',[source.id,source.last_fingerprint,snapshot.id,change])).rows[0];proposals++; const users=await client.query('SELECT u.id,u.email FROM users u JOIN notification_preferences p ON p.user_id=u.id WHERE p.email_enabled=true AND EXISTS (SELECT 1 FROM visa_alerts a WHERE a.user_id=u.id AND a.email_enabled=true)'); for(const user of users.rows) if(await email(user.email,proposal)){await client.query('INSERT INTO notification_deliveries(user_id,proposal_id,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[user.id,proposal.id,user.email]);sent++;}}
    await client.query('UPDATE monitor_sources SET last_checked_at=now(),last_fingerprint=$1 WHERE id=$2',[fingerprint,source.id]);checked++;
  } await client.query('COMMIT'); console.log(JSON.stringify({ok:true,checked,proposals,sent}));
} catch(error){await client.query('ROLLBACK');console.error(error);process.exitCode=1;} finally{client.release();await pool.end();}
