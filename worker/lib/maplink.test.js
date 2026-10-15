import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapLink, readMapUrl, splitNameAddress } from './maplink.js';
import { rateFresh, readRateLabel, rateLabels, sameHotel, searchState } from '../listings/hotels.js';

test('which links are map links', () => {
  for (const u of ['https://maps.app.goo.gl/caiTwKKFJ4RXUMcC9', 'https://goo.gl/maps/abc', 'https://www.google.com/maps/place/X/@39.7,-104.9,17z',
    'https://maps.google.com/?q=X&ftid=0x1:0x2', 'https://maps.apple.com/?ll=39.7,-104.9&q=Hotel']) assert.equal(isMapLink(u), true, u);
  for (const u of ['https://www.airbnb.com/rooms/123', 'https://www.google.com/search?q=hotel', 'https://goo.gl/abc', 'not a url', 'ftp://maps.google.com/maps'])
    assert.equal(isMapLink(u), false, u);
});

test('the street address the Maps app appends is split off the name', () => {
  assert.deepEqual(splitNameAddress('Sheraton Denver Downtown Hotel, 1550 Court Pl, Denver, CO 80202'), { name: 'Sheraton Denver Downtown Hotel', address: '1550 Court Pl, Denver, CO 80202' });
  assert.deepEqual(splitNameAddress('Snooze, an A.M. Eatery, 2262 Larimer St, Denver, CO 80205'), { name: 'Snooze, an A.M. Eatery', address: '2262 Larimer St, Denver, CO 80205' });
  assert.deepEqual(splitNameAddress('Table 79 Foodbar Steamboat'), { name: 'Table 79 Foodbar Steamboat', address: '' });
});

test('a share link from the Maps app: name and address, no spot, place id', () => {
  const r = readMapUrl('https://www.google.com/maps/place/Sheraton+Denver+Downtown+Hotel,+1550+Court+Pl,+Denver,+CO+80202/data=!4m2!3m1!1s0x876c7938d0ca0bd3:0x5d9b42a6ff2a3b36?utm_source=mstt_1&entry=gps');
  assert.equal(r.name, 'Sheraton Denver Downtown Hotel');
  assert.equal(r.address, '1550 Court Pl, Denver, CO 80202');
  assert.equal(r.lat, null);
  assert.equal(r.placeId, '0x876c7938d0ca0bd3:0x5d9b42a6ff2a3b36');
  const q = readMapUrl('https://maps.google.com/?q=Snooze,+an+A.M.+Eatery,+2262+Larimer+St,+Denver,+CO+80205&ftid=0x876c78d0:0x9a1b');
  assert.equal(q.name, 'Snooze, an A.M. Eatery');
  assert.equal(q.address, '2262 Larimer St, Denver, CO 80205');
  assert.equal(q.placeId, '0x876c78d0:0x9a1b');
});

test('the spot: the pin beats where the map was looking; a zoomed-out view is not the place', () => {
  // the restaurant on the live list: view centred 4 km west of the pin
  const r = readMapUrl('https://www.google.com/maps/place/Table+79+Foodbar+Steamboat/@40.4841381,-106.8763208,13z/data=!4m7!3m6!1s0x874268d9f9c86f5b:0xd4d6dfbcfda035b2!8m2!3d40.4831965!4d-106.8304035!16s%2Fg%2F11c2ln3_td');
  assert.deepEqual([r.lat, r.lng], [40.4831965, -106.8304035]);
  assert.equal(readMapUrl('https://www.google.com/maps/place/X/@39.75,-104.99,13z').lat, null);
  assert.deepEqual([readMapUrl('https://www.google.com/maps/place/X/@39.75,-104.99,17z').lat, readMapUrl('https://www.google.com/maps/place/X/@39.75,-104.99,120m').lat], [39.75, 39.75]);
  assert.deepEqual(readMapUrl('https://www.google.com/maps?q=39.7505,-104.9908'), { name: '', address: '', lat: 39.7505, lng: -104.9908, placeId: '' });
  assert.equal(readMapUrl('https://www.google.com/maps/search/pizza/@39.7,-104.9,13z').name, '', 'a search is not a place');
});

test('Apple Maps and non-Latin names', () => {
  assert.deepEqual(readMapUrl('https://maps.apple.com/?ll=39.7505,-104.9908&q=Kimpton%20Hotel'), { name: 'Kimpton Hotel', address: '', lat: 39.7505, lng: -104.9908, placeId: '' });
  assert.equal(readMapUrl('https://www.google.com/maps/place/%E4%B8%B9%E4%BD%9B%E9%85%92%E5%BA%97/@39.7,-104.9,17z').name, '丹佛酒店');
});

test("Google's hotel price label", () => {
  assert.deepEqual(readRateLabel('$79 for dates Nov 24 – 25, Hyatt House Denver/Downtown DEAL 23% less than usual'), { nightly: 79, dates: 'Nov 24 – 25', hotel: 'Hyatt House Denver/Downtown' });
  assert.deepEqual(readRateLabel('$1,204 for dates Nov 30 – Dec 1, The Ritz-Carlton, Denver GREAT DEAL 30% less than usual'), { nightly: 1204, dates: 'Nov 30 – Dec 1', hotel: 'The Ritz-Carlton, Denver' });
  assert.equal(readRateLabel('Original price: $115'), null);
  assert.equal(readRateLabel('$3 for dates Nov 24 – 25, Somewhere'), null, 'not a hotel rate');
  const page = '<div aria-label="Original price: $115"></div><span aria-label="$79 for dates Nov 24 &ndash; 25, Hyatt House Denver/Downtown DEAL 23% less than usual"></span><b aria-label="$127 for dates Nov 2 – 3, "></b>';
  assert.deepEqual(rateLabels(page).map(r => r.nightly), [79]);
});

test('same hotel, by name', () => {
  assert.equal(sameHotel('Hyatt House Denver Downtown', 'Hyatt House Denver/Downtown'), true);
  assert.equal(sameHotel('the Curtis Denver - A DoubleTree by Hilton Hotel', 'The Curtis Denver - a DoubleTree by Hilton'), true);
  assert.equal(sameHotel('Hyatt House Denver Downtown', 'Hyatt Place Denver Downtown'), false);
  assert.equal(sameHotel('Hilton Garden Inn Denver Downtown', 'Hilton Garden Inn Denver Airport'), false);
  assert.equal(sameHotel('', 'Hyatt'), false);
});

test('searchState puts the trip dates in Google hotel search ts param', () => {
  // the value Google accepted for Nov 26 – 29, 2026 ("$109 for dates Nov 26 – 29")
  assert.equal(searchState('2026-11-26', '2026-11-29'), 'CAESABopCgIaABIaEhQKBwjqDxALGBoSBwjqDxALGB0YAzICEAAqBwoFOgNVU0Q');
});

test('rateFresh: Google rates must be for the trip dates and recent; typed-in rates always count', () => {
  const trip = { checkIn: '2026-11-26', checkOut: '2026-11-29' };
  const now = Date.now();
  assert.equal(rateFresh({ rate: { source: 'google', dates: 'Nov 24 – 25', at: now } }, trip), false);
  assert.equal(rateFresh({ rate: { source: 'google', checkIn: '2026-11-26', checkOut: '2026-11-29', at: now } }, trip), true);
  assert.equal(rateFresh({ rate: { source: 'google', checkIn: '2026-11-26', checkOut: '2026-11-29', at: now - 2 * 864e5 } }, trip), false);
  assert.equal(rateFresh({ rate: { source: 'manual', at: 0 } }, trip), true);
  assert.equal(rateFresh({}, trip), false);
});
