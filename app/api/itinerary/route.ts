import { NextResponse } from 'next/server';
import { calculateSchengen, Stay } from '../../../lib/schengen';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.stays)) return NextResponse.json({ error: 'stays doit être un tableau' }, { status: 400 });
  try {
    const stays = body.stays as Stay[];
    const calculation = calculateSchengen(stays, body.referenceDate || new Date());
    return NextResponse.json({ ...calculation, estimatedFees: null, checklist: ['Consulter les conditions officielles pour mon motif de voyage', 'Relever les documents exigés par l’autorité compétente', 'Vérifier les conditions de mon visa et la durée de séjour autorisée'] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Données invalides' }, { status: 400 });
  }
}
