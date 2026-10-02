export function parseFile(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field.trim()); field = ''; if (row.some(Boolean)) rows.push(row); row = []; }
    else field += c;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  const header = rows.shift();
  if (JSON.stringify(header) !== JSON.stringify(['passport','destination','requirement','max_stay_days','verified','source'])) throw new Error('Invalid visa CSV header');
  return rows.map((r, i) => { if (r.length !== 6) throw new Error(`Invalid CSV row ${i + 2}`); return { passport:r[0], destination:r[1], requirement:r[2], maxStay:r[3] || null, verified:r[4] || null, source:r[5] || null }; });
}
