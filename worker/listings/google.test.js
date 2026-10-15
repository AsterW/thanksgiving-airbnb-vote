// Parser tests for the dated Google price pull (listings/google.js)
// against a synthetic page fragment shaped like the real one. Run:
//   node --test worker/listings/google.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleOffers, findEntityInSearch, datesLabel } from './google.js';

const TRIP = { checkIn: '2026-11-25', checkOut: '2026-11-26' };
// One offer record, shaped like Google's blob: provider, id, click URL,
// then the price block ["$nightly","$total", nightly, total, n, t].
const offer = (name, id, n, t) => `["${name}",${id},"/travel/lodging/clk?pc\\u003dXYZ",[null],null,0,`
  + `[null,null,null,null,["$${n}","$${t}",${n}.5,${t}.5,${n},${t}],["$${n}","$${t}",${n}.5,${t}.5,${n},${t}]]]`;
const PAGE = offer('Traveluro', 1073209370, 89, 103)
  + offer('Booking.com', 1234567890, 93, 107)
  + offer('Traveluro', 1073209370, 95, 110) // a worse duplicate of the same provider
  + '["2026-11-25","2026-11-26",1,42,2,null,0]';

test('offers: cheapest provider wins, duplicates keep the min', () => {
  const o = parseGoogleOffers(PAGE, TRIP);
  assert.equal(o.provider, 'Traveluro');
  assert.equal(o.nightly, 89);
  assert.equal(o.total, 103);
  assert.equal(o.offers, 2);
});

test('offers: a page dated for other dates is refused', () => {
  assert.equal(parseGoogleOffers(PAGE, { checkIn: '2026-12-24', checkOut: '2026-12-25' }), null);
  assert.equal(parseGoogleOffers('<html>no data</html>', TRIP), null);
});

test('entity: found by hotel name on the search page cards', () => {
  const html = '<a aria-label="$89 for dates Nov 25 – 26, Hilton Garden Inn Denver Downtown" href="/travel/hotels/entity/ChcI_p23-Jvop9JsGgsvZy8xdGh3X3ljehAB">x</a>'
    + '<a aria-label="$74 for dates Nov 25 – 26, Sonesta Denver Downtown" href="/travel/hotels/entity/ChgI3o_Y_bqPl9lnGgwvZy8xaGR6NnI1Y2YQAQ">y</a>';
  assert.equal(findEntityInSearch(html, 'Hilton Garden Inn Denver Downtown'), 'ChcI_p23-Jvop9JsGgsvZy8xdGh3X3ljehAB');
  assert.equal(findEntityInSearch(html, 'Hyatt Regency Denver'), null);
});

test('dates label matches the shape Google itself uses', () => {
  assert.equal(datesLabel({ checkIn: '2026-11-25', checkOut: '2026-11-26' }), 'Nov 25 – 26');
  assert.equal(datesLabel({ checkIn: '2026-11-26', checkOut: '2026-11-29' }), 'Nov 26 – 29');
  assert.equal(datesLabel({ checkIn: '2026-11-30', checkOut: '2026-12-02' }), 'Nov 30 – Dec 2');
});
