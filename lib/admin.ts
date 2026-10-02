import { currentUser } from './auth';
import { db, ensureSchema } from './db';
export type AdminRole = 'user' | 'editor' | 'admin';
export async function requireRole(allowed: AdminRole[] = ['editor', 'admin']) { const user = await currentUser(); return user && allowed.includes(user.role as AdminRole) ? user : null; }
export async function audit(actorId: string, action: string, entityType: string, entityId?: string, before?: unknown, after?: unknown) { if (db) await db.query('INSERT INTO admin_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6)', [actorId, action, entityType, entityId || null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]); }
export async function adminReady() { if (!db) return false; await ensureSchema(); return true; }
