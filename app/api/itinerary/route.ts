import { NextResponse } from 'next/server';
import { calculateFees, calculateSchengen, Stay } from '../../../lib/schengen';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.stays)) return NextResponse.json({ error: 'stays doit être un tableau' }, { status: 400 });
  try {
    const stays = body.stays as Stay[];
    const calculation = calculateSchengen(stays, body.referenceDate || new Date());
    return NextResponse.json({ ...calculation, estimatedFees: calculateFees(stays, Number(body.defaultFee) || 90), checklist: ['Passeport valide au moins 3 mois après la sortie', 'Assurance voyage couvrant tout l’espace Schengen', 'Justificatifs d’hébergement pour chaque pays', 'Preuve de ressources et billets de sortie', 'Vérifier le consulat du pays de séjour principal'] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Données invalides' }, { status: 400 });
  }
}
