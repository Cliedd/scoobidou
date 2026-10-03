import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';

export async function GET() {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const result = await db.query('SELECT id,passport_code,destination_code,email_enabled,created_at FROM visa_alerts WHERE user_id=$1 ORDER BY created_at DESC', [user.id]);
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if(body.emailEnabled === true && body.consent !== true) return NextResponse.json({error:'Votre consentement aux emails est requis.'},{status:400});
  if(body.emailEnabled === true) return NextResponse.json({error:'Les notifications email ne sont pas encore activées. Vous pouvez suivre ce trajet dans votre espace.'},{status:503});
  const passport = String(body.passport || '').toUpperCase();
  const destination = body.destination ? String(body.destination).toUpperCase() : null;
  if (!/^[A-Z]{2}$/.test(passport) || (destination && !/^[A-Z]{2}$/.test(destination))) return NextResponse.json({ error: 'Codes pays invalides.' }, { status: 400 });
  await ensureSchema();
  const rule=await db.query('SELECT requirement,max_stay_days FROM visa_rules WHERE passport_code=$1 AND destination_code=$2',[passport,destination]);
  if(!rule.rowCount) return NextResponse.json({error:'Aucune règle enregistrée pour ce trajet.'},{status:404});
  const result = await db.query('INSERT INTO visa_alerts(user_id,passport_code,destination_code,email_enabled,baseline_requirement,baseline_days) VALUES($1,$2,$3,false,$4,$5) RETURNING *', [user.id, passport, destination,rule.rows[0].requirement,rule.rows[0].max_stay_days]);
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({})); const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Alerte invalide.' }, { status: 400 });
  await db.query('DELETE FROM visa_alerts WHERE id=$1 AND user_id=$2', [id, user.id]);
  return NextResponse.json({ ok: true });
}
