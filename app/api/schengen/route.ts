import { NextResponse } from 'next/server';
import { calculateSchengen } from '../../../lib/schengen';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try { return NextResponse.json(calculateSchengen(Array.isArray(body.entries) ? body.entries : [], body.referenceDate || new Date())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Données invalides' }, { status: 400 }); }
}
