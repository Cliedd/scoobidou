import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!db) return NextResponse.json({ status: 'degraded', database: 'not_configured' }, { status: 503 });
  try { await db.query('SELECT 1'); return NextResponse.json({ status: 'ok', database: 'ok', version: '0.1.0' }); }
  catch { return NextResponse.json({ status: 'degraded', database: 'unavailable' }, { status: 503 }); }
}
