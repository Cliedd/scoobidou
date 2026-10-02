import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { normalizeEmail, passwordDigest, startSession, validPassword } from '../../../../lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !validPassword(body.password)) return NextResponse.json({ error: 'Email ou mot de passe invalide (8 caractères minimum).' }, { status: 400 });
  if (!db) return NextResponse.json({ error: 'Base de données indisponible.' }, { status: 503 });
  await ensureSchema();
  try {
    const result = await db.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'user') RETURNING id,email,role", [email, passwordDigest(body.password)]);
    await startSession(result.rows[0].id);
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') return NextResponse.json({ error: 'Ce compte existe déjà.' }, { status: 409 });
    throw error;
  }
}
