import { getRules, getCatalog } from '../../entities/visa/server';
export async function visaRules(passport:string,destination?:string) { return (await getRules(passport,destination)).map(rule=>({...rule,passport_code:rule.passport,destination_code:rule.destination,max_stay_days:rule.days,source_name:rule.sourceName,source_url:rule.sourceUrl,verified_at:rule.verifiedAt})); }
export async function countries() { return (await getCatalog()).map(c=>({...c,kind:'country'})); }
