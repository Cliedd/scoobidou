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
  const passport = String(body.passport || '').toUpperCase();
  const destination = body.destination ? String(body.destination).toUpperCase() : null;
  if (!/^[A-Z]{2}$/.test(passport) || (destination && !/^[A-Z]{2}$/.test(destination))) return NextResponse.json({ error: 'Codes pays invalides.' }, { status: 400 });
  await ensureSchema();
  const result = await db.query('INSERT INTO visa_alerts(user_id,passport_code,destination_code) VALUES($1,$2,$3) RETURNING *', [user.id, passport, destination]);
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
