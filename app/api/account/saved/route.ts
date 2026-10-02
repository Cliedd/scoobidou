import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';

export async function GET() {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const result = await db.query('SELECT id,passport_code,destination_code,created_at FROM saved_trips WHERE user_id=$1 ORDER BY created_at DESC', [user.id]);
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const passport = String(body.passport || '').toUpperCase();
  const destination = String(body.destination || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(passport) || !/^[A-Z]{2}$/.test(destination)) return NextResponse.json({ error: 'Codes pays invalides.' }, { status: 400 });
  await ensureSchema();
  const result = await db.query('INSERT INTO saved_trips(user_id,passport_code,destination_code) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *', [user.id, passport, destination]);
  return NextResponse.json({ data: result.rows[0] || null }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await db.query('DELETE FROM saved_trips WHERE user_id=$1 AND passport_code=$2 AND destination_code=$3', [user.id, String(body.passport || '').toUpperCase(), String(body.destination || '').toUpperCase()]);
  return NextResponse.json({ ok: true });
}
