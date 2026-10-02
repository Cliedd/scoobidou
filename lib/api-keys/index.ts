import { createHash, randomBytes } from 'crypto';
import { db, ensureSchema } from '../db';

export type ApiPlan = 'free' | 'pro' | 'business';
export const PLAN_LIMITS: Record<ApiPlan, number> = { free: 100, pro: 10000, business: 100000 };
type KeyRecord = { id: string; name: string; plan: ApiPlan; key_prefix: string };

const memoryKeys = new Map<string, KeyRecord>();
const memoryUsage = new Map<string, number[]>();
const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
const requestId = () => randomBytes(12).toString('hex');

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}

export async function createApiKey(name: string, plan: ApiPlan = 'free') {
  const raw = `pk_live_${randomBytes(24).toString('base64url')}`;
  const record = { id: randomBytes(16).toString('hex'), name, plan, key_prefix: raw.slice(0, 16) };
  if (db) { await ensureSchema(); await db.query('INSERT INTO api_keys(id,name,key_prefix,key_hash,plan) VALUES($1,$2,$3,$4,$5)', [record.id, name, record.key_prefix, hashKey(raw), plan]); }
  else memoryKeys.set(hashKey(raw), record);
  return { key: raw, ...record };
}

async function findKey(raw: string): Promise<KeyRecord | null> {
  if (!raw.startsWith('pk_live_')) return null;
  if (db) { await ensureSchema(); const result = await db.query('SELECT id,name,plan,key_prefix FROM api_keys WHERE key_hash=$1 AND active=true', [hashKey(raw)]); return result.rows[0] || null; }
  return memoryKeys.get(hashKey(raw)) || null;
}

export async function authenticate(request: Request) {
  const raw = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const key = raw ? await findKey(raw) : null;
  if (!key) return { error: apiError('invalid_api_key', 'Provide a valid x-api-key or Bearer API key.', 401) };
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  let timestamps: number[];
  if (db) { const result = await db.query("SELECT EXTRACT(EPOCH FROM created_at) * 1000 AS ts FROM api_usage WHERE api_key_id=$1 AND created_at > now() - interval '1 hour'", [key.id]); timestamps = result.rows.map(row => Number(row.ts)); }
  else { timestamps = (memoryUsage.get(key.id) || []).filter(ts => ts > windowStart); memoryUsage.set(key.id, timestamps); }
  if (timestamps.length >= PLAN_LIMITS[key.plan]) return { error: apiError('rate_limit_exceeded', `Hourly ${key.plan} quota exceeded.`, 429, { limit: PLAN_LIMITS[key.plan], reset: new Date(now + 60 * 60 * 1000).toISOString() }) };
  return { key, requestId: requestId() };
}

export async function logUsage(key: KeyRecord, requestIdValue: string, endpoint: string, status: number) {
  if (db) { await db.query('INSERT INTO api_usage(api_key_id,request_id,endpoint,status_code) VALUES($1,$2,$3,$4); UPDATE api_keys SET last_used_at=now() WHERE id=$1', [key.id, requestIdValue, endpoint, status]); }
  else { memoryUsage.set(key.id, [...(memoryUsage.get(key.id) || []), Date.now()]); }
}

export function withApiMeta(body: unknown, requestIdValue: string, key: KeyRecord) {
  return { data: body, meta: { requestId: requestIdValue, plan: key.plan, quota: PLAN_LIMITS[key.plan], version: '1' } };
}
