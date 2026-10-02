import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
export async function GET(){if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});await ensureSchema();return NextResponse.json({data:(await db.query('SELECT id,name,url,parser,enabled,last_checked_at,last_fingerprint FROM monitor_sources ORDER BY name')).rows});}
