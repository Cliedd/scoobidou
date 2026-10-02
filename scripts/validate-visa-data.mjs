import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(new URL('../data/visa-data-manifest.json', import.meta.url), 'utf8'));

const file = process.argv[2] || new URL('../data/visa-requirements.csv', import.meta.url);
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function parseCsv(input) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

const rows = parseCsv(text);
const header = rows.shift();
const expected = ['passport', 'destination', 'requirement', 'max_stay_days', 'verified', 'source'];
const errors = [];
const warnings = [];
if (JSON.stringify(header) !== JSON.stringify(expected)) errors.push(`Header must be ${expected.join(',')}`);
const allowed = new Set(['visa_free', 'eta', 'evisa', 'visa_on_arrival', 'visa_required', 'no_admission']);
const pairs = new Set();
const passports = new Set();
const destinations = new Set();
let missingSource = 0;
const today = new Date().toISOString().slice(0, 10);

rows.forEach((values, index) => {
  const line = index + 2;
  if (values.length !== 6) return errors.push(`Line ${line}: expected 6 columns, got ${values.length}`);
  const [passport, destination, requirement, maxStay, verified, source] = values;
  if (!/^[A-Z]{2}$/.test(passport)) errors.push(`Line ${line}: invalid passport code ${passport}`);
  if (!/^[A-Z]{2}$/.test(destination)) errors.push(`Line ${line}: invalid destination code ${destination}`);
  if (!allowed.has(requirement)) errors.push(`Line ${line}: invalid requirement ${requirement}`);
  if (maxStay && (!/^\d+$/.test(maxStay) || Number(maxStay) < 0)) errors.push(`Line ${line}: invalid max_stay_days ${maxStay}`);
  if (verified && (!/^\d{4}-\d{2}-\d{2}$/.test(verified) || verified > today)) errors.push(`Line ${line}: invalid/future verified date ${verified}`);
  const pair = `${passport}|${destination}`;
  if (pairs.has(pair)) errors.push(`Line ${line}: duplicate pair ${pair}`);
  pairs.add(pair); passports.add(passport); destinations.add(destination);
  if (!source) missingSource++;
});
if (!rows.length) errors.push('Dataset is empty');
if (rows.length !== manifest.expected_rows) errors.push(`Expected ${manifest.expected_rows} rows, found ${rows.length}`);
if (pairs.size !== manifest.expected_unique_pairs) errors.push(`Expected ${manifest.expected_unique_pairs} unique pairs, found ${pairs.size}`);
if (passports.size !== manifest.expected_passports) errors.push(`Expected ${manifest.expected_passports} passports, found ${passports.size}`);
if (destinations.size !== manifest.expected_destinations) errors.push(`Expected ${manifest.expected_destinations} destinations, found ${destinations.size}`);
if (missingSource) warnings.push(`${missingSource}/${rows.length} rows have no source URL`);
const missingVerified = rows.filter(r => !r[4]).length;
if (missingVerified) warnings.push(`${missingVerified}/${rows.length} rows have no verification date`);

const result = { file: String(file), manifest, rows: rows.length, passports: passports.size, destinations: destinations.size, unique_pairs: pairs.size, errors, warnings };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
