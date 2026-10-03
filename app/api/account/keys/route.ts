import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';
export const dynamic='force-dynamic';
async function context() {
  const user=await currentUser();
  if(!user || !db) return null;
  await ensureSchema();
  await db.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
  return {user,pool:db};
}
export async function GET() {
 const c=await context(); if(!c) return Response.json({error:'Connexion requise.'},{status:401});
 const r=await c.pool.query('SELECT id,name,key_prefix,plan,active,created_at,last_used_at FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC',[c.user.id]);
 return Response.json({data:r.rows},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request) {
 const c=await context(); if(!c) return Response.json({error:'Connexion requise.'},{status:401});
 const body=await request.json().catch(()=>({}));
 if(typeof body.name!=='string' || !body.name.trim() || body.name.length>100) return Response.json({error:'Nom de clé invalide.'},{status:400});
 // Lock per user so concurrent requests cannot bypass the active-key limit.
 const client=await c.pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[c.user.id]);
  const count=await client.query('SELECT count(*) FROM api_keys WHERE user_id=$1 AND active=true',[c.user.id]);
  if(Number(count.rows[0].count)>=5) {await client.query('ROLLBACK');return Response.json({error:'Vous pouvez avoir cinq clés actives. Révoquez-en une avant de continuer.'},{status:409});}
  const {randomBytes,createHash}=await import('node:crypto');
  const raw=`pk_live_${randomBytes(24).toString('base64url')}`;
  const id=randomBytes(16).toString('hex');
  await client.query('INSERT INTO api_keys(id,name,key_prefix,key_hash,plan,user_id) VALUES($1,$2,$3,$4,$5,$6)',[id,body.name.trim(),raw.slice(0,16),createHash('sha256').update(raw).digest('hex'),'free',c.user.id]);
  await client.query('COMMIT');
  return Response.json({data:{id,key:raw,name:body.name.trim(),plan:'free'}},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch {await client.query('ROLLBACK');return Response.json({error:'Impossible de créer la clé.'},{status:503});}finally{client.release();}
}
export async function DELETE(request:Request) {
 const c=await context(); if(!c) return Response.json({error:'Connexion requise.'},{status:401});
 const id=new URL(request.url).searchParams.get('id');
 const result=await c.pool.query('UPDATE api_keys SET active=false WHERE id=$1 AND user_id=$2 AND active=true RETURNING id',[id,c.user.id]);
 return result.rowCount ? Response.json({ok:true}) : Response.json({error:'Clé introuvable.'},{status:404});
}
