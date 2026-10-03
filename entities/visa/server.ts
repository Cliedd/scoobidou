import { db, ensureSchema } from '../../lib/db';
import { safeUrl } from '../../shared/lib/html';
export const DATASET_URL = 'https://github.com/maxix7/visa-requirements-dataset';
export const requirementLabels: Record<string,string> = {visa_free:'Sans visa', evisa:'Visa électronique', eta:'Autorisation électronique', visa_on_arrival:'Visa à l’arrivée', visa_required:'Visa requis', no_admission:'Entrée non autorisée'};
const names = new Intl.DisplayNames(['fr'], {type:'region'});
export function countryName(code: string) { try { return names.of(code.trim().toUpperCase()) || code; } catch { return code; } }
export function normalizeRule(row: Record<string,any>) {
  const passport = String(row.passport_code || row.passport).trim().toUpperCase();
  const destination = String(row.destination_code || row.destination).trim().toUpperCase();
  const source = safeUrl(row.source_name) || safeUrl(row.source_url);
  const primary = Boolean(source && !source.includes('github.com/maxix7/'));
  const verified = row.verified_at || row.checked_at;
  return {passport, destination, name:countryName(destination), requirement:row.requirement, status:requirementLabels[row.requirement] || 'Règle non renseignée', days:row.max_stay_days ?? null, fee:null, verifiedAt: verified ? new Date(verified).toISOString().slice(0,10) : null, updatedAt:row.updated_at ? new Date(row.updated_at).toISOString() : null, sourceUrl:primary ? source : DATASET_URL, sourceName:primary ? new URL(source).hostname : 'Visa Requirements Dataset', sourceQuality: primary ? 'primary' : 'dataset', confidence: primary && verified ? 'dated_source' : 'unverified'};
}
export async function getRules(passport: string, destination?: string) {
  if (!db) throw new Error('La base de données est indisponible.');
  await ensureSchema();
  const result = await db.query(`SELECT * FROM visa_rules WHERE passport_code=$1 ${destination ? 'AND destination_code=$2' : ''} ORDER BY destination_code`, destination ? [passport,destination] : [passport]);
  return result.rows.map(normalizeRule);
}
export async function getCatalog() {
  if (!db) throw new Error('La base de données est indisponible.');
  await ensureSchema();
  const result = await db.query('SELECT DISTINCT passport_code AS code FROM visa_rules ORDER BY code');
  return result.rows.map(r => ({code:r.code.trim(), name:countryName(r.code)})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
