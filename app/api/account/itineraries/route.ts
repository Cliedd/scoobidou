import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth';
import { db, ensureSchema } from '../../../../lib/db';
import { calculateSchengen } from '../../../../lib/schengen';
export async function GET() { const user = await currentUser(); if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 }); await ensureSchema(); const r = await db.query('SELECT id,name,stays,reference_date,calculation,updated_at FROM saved_itineraries WHERE user_id=$1 ORDER BY updated_at DESC', [user.id]); return NextResponse.json({ data: r.rows }); }
export async function POST(request: Request) {
  const user = await currentUser(); if (!user || !db) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.stays) || body.stays.length > 100 || !body.referenceDate) return NextResponse.json({ error: 'Itinéraire incomplet ou trop volumineux.' }, { status: 400 });
  let calculation;
  try{calculation=calculateSchengen(body.stays,body.referenceDate);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Séjour invalide.'},{status:400});}
  await ensureSchema();
  const r = await db.query('INSERT INTO saved_itineraries(user_id,name,stays,reference_date,calculation) VALUES($1,$2,$3::jsonb,$4,$5::jsonb) RETURNING *', [user.id, String(body.name || 'Mon itinéraire').slice(0,120), JSON.stringify(calculation.stays), calculation.referenceDate, JSON.stringify(calculation)]);
  return NextResponse.json({ data: r.rows[0] }, { status: 201 });
}
