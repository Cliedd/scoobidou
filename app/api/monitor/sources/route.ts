import { NextResponse } from 'next/server';
import { db, ensureSchema } from '../../../../lib/db';
import { requireRole } from '../../../../lib/admin';
export async function GET(){const u=await requireRole();if(!u)return NextResponse.json({error:'Forbidden'},{status:403});if(!db)return NextResponse.json({error:'Database unavailable'},{status:503});await ensureSchema();return NextResponse.json({data:(await db.query('SELECT id,name,url,parser,enabled,last_checked_at,last_fingerprint FROM monitor_sources WHERE enabled=true ORDER BY name')).rows});}
