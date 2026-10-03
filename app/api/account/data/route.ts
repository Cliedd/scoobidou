import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';
export async function GET() {
  const user = await currentUser();
  if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  await ensureSchema();
  const [saved, alerts, checklists, itineraries, preferences, testimonials] = await Promise.all([
    db.query('SELECT passport_code,destination_code,created_at FROM saved_trips WHERE user_id=$1 ORDER BY created_at DESC', [user.id]),
    db.query('SELECT a.id,a.passport_code,a.destination_code,a.email_enabled,a.created_at,a.baseline_requirement,a.baseline_days,v.requirement AS current_requirement,v.max_stay_days AS current_days FROM visa_alerts a LEFT JOIN visa_rules v ON v.passport_code=a.passport_code AND v.destination_code=a.destination_code WHERE a.user_id=$1 ORDER BY a.created_at DESC', [user.id]),
    db.query('SELECT guide_slug,checked,updated_at FROM saved_checklists WHERE user_id=$1 ORDER BY updated_at DESC', [user.id]),
    db.query('SELECT id,name,stays,reference_date,calculation,updated_at FROM saved_itineraries WHERE user_id=$1 ORDER BY updated_at DESC', [user.id]),
    db.query('SELECT email_enabled,digest_enabled,updated_at FROM notification_preferences WHERE user_id=$1', [user.id]),
    db.query('SELECT author_name,destination,content,rating,status,created_at FROM testimonials WHERE user_id=$1 ORDER BY created_at DESC', [user.id]),
  ]);
  const response = NextResponse.json({ user: { email: user.email }, saved: saved.rows, alerts: alerts.rows, checklists: checklists.rows, itineraries: itineraries.rows, preferences: preferences.rows[0] || null, testimonials: testimonials.rows });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export async function DELETE() { const user = await currentUser(); if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 }); const client=await db.connect(); try{await client.query('BEGIN');await client.query('DELETE FROM testimonials WHERE user_id=$1',[user.id]);await client.query('DELETE FROM users WHERE id=$1', [user.id]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();} const response = NextResponse.json({ ok: true }); response.cookies.set('passportly_session', '', { expires: new Date(0), httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); return response; }
