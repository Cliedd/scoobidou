import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { adminReady, audit, requireRole } from '../../../../lib/admin';

export async function GET(request: Request) {
  const actor = await requireRole();
  if (!actor || !db || !(await adminReady())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const status = new URL(request.url).searchParams.get('status');
  const result = await db.query("SELECT t.*, u.email AS author_email FROM testimonials t LEFT JOIN users u ON u.id=t.user_id WHERE ($1::text IS NULL OR t.status=$1) ORDER BY t.created_at DESC LIMIT 100", [status]);
  return NextResponse.json({ testimonials: result.rows });
}

export async function PATCH(request: Request) {
  const actor = await requireRole();
  if (!actor || !db || !(await adminReady())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id) || !['approved', 'rejected', 'pending'].includes(body.status)) return NextResponse.json({ error: 'Invalid moderation' }, { status: 400 });
  const before = (await db.query('SELECT * FROM testimonials WHERE id=$1', [id])).rows[0];
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const result = await db.query('UPDATE testimonials SET status=$1 WHERE id=$2 RETURNING *', [body.status, id]);
  await audit(actor.id, `testimonial_${body.status}`, 'testimonial', String(id), before, result.rows[0]);
  return NextResponse.json({ testimonial: result.rows[0] });
}
