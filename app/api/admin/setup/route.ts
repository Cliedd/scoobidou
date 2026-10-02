import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { audit } from '../../../../lib/admin';
import { normalizeEmail, passwordDigest, validPassword } from '../../../../lib/auth';
export async function POST(request: Request) {
  if (!db || !process.env.ADMIN_BOOTSTRAP_TOKEN || request.headers.get('x-admin-bootstrap-token') !== process.env.ADMIN_BOOTSTRAP_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureSchema(); const count = await db.query("SELECT COUNT(*)::int AS count FROM users WHERE role='admin'");
  if (count.rows[0].count > 0) return NextResponse.json({ error: 'An administrator already exists.' }, { status: 409 });
  const body = await request.json().catch(() => ({})); const email = normalizeEmail(body.email || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !validPassword(body.password)) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
  try { const result = await db.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'admin') RETURNING id,email,role", [email, passwordDigest(body.password)]); await audit(result.rows[0].id, 'bootstrap', 'user', result.rows[0].id, null, result.rows[0]); return NextResponse.json({ user: result.rows[0] }, { status: 201 }); }
  catch (error: unknown) { if ((error as { code?: string }).code === '23505') return NextResponse.json({ error: 'This account already exists.' }, { status: 409 }); throw error; }
}
