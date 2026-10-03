import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';

export async function GET() {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  await ensureSchema();
  await db.query("ALTER TABLE saved_checklists ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb");
  const result = await db.query('SELECT guide_slug, checked, tasks, updated_at FROM saved_checklists WHERE user_id=$1 ORDER BY updated_at DESC', [user.id]);
  return NextResponse.json({ data: result.rows });
}
export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const slug = String(body.guideSlug || '').trim();
  const checked = Array.isArray(body.checked) ? body.checked.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1000).slice(0, 1000) : [];
  const tasks = Array.isArray(body.tasks) ? body.tasks.filter((t:unknown)=>typeof t==='string').map((t:string)=>t.slice(0,200)).slice(0,100) : [];
  if (!slug || slug.length > 100) return NextResponse.json({ error: 'Guide invalide.' }, { status: 400 });
  await ensureSchema();
  await db.query("ALTER TABLE saved_checklists ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb");
  const result = await db.query(`INSERT INTO saved_checklists(user_id,guide_slug,checked,tasks,updated_at) VALUES($1,$2,$3::jsonb,$4::jsonb,now())
    ON CONFLICT(user_id,guide_slug) DO UPDATE SET checked=EXCLUDED.checked,tasks=EXCLUDED.tasks,updated_at=now() RETURNING guide_slug,checked,tasks,updated_at`, [user.id, slug, JSON.stringify(checked),JSON.stringify(tasks)]);
  return NextResponse.json({ data: result.rows[0] });
}
