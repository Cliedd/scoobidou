import assert from 'node:assert/strict';
import { calculateSchengen } from './schengen';
const base = calculateSchengen([{ start: '2026-01-01', end: '2026-01-10', country: 'France' }, { start: '2026-01-10', end: '2026-01-20', country: 'Italie' }], '2026-01-20');
assert.equal(base.usedDays, 20); assert.equal(base.daysByCountry.France, 10); assert.equal(base.daysByCountry.Italie, 10);
assert.equal(calculateSchengen([{ start: '2025-01-01', end: '2026-01-20' }], '2026-01-20').usedDays, 180);
assert.equal(calculateSchengen([{ start: '2026-01-01', end: '2026-04-01' }], '2026-04-01').overstayDays, 1);
assert.throws(() => calculateSchengen([{ start: '2026-02-02', end: '2026-02-01' }]));
