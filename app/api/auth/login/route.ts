import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { normalizeEmail, passwordMatches, startSession } from '../../../../lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!db) return NextResponse.json({ error: 'Base de données indisponible.' }, { status: 503 });
  await ensureSchema();
  const result = await db.query("SELECT id,email,password_hash,COALESCE(role,'user') AS role FROM users WHERE email=$1", [normalizeEmail(body.email || '')]);
  if (!result.rows[0] || !passwordMatches(body.password || '', result.rows[0].password_hash)) return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
  await startSession(result.rows[0].id);
  return NextResponse.json({ user: { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role } });
}
