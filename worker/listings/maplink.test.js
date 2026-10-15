import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMapLink, coordsFromMapUrl, nameFromMapUrl, hotelRoomId, extractCheapestRate } from './maplink.js';

test('isMapLink recognises the share-link families and nothing else', () => {
  assert.equal(isMapLink('https://maps.app.goo.gl/abc123XYZ'), true);
  assert.equal(isMapLink('https://goo.gl/maps/abc123'), true);
  assert.equal(isMapLink('https://www.google.com/maps/place/Hotel/@39.7,-104.9,17z'), true);
  assert.equal(isMapLink('https://maps.apple.com/?ll=39.7,-104.9&q=Hotel'), true);
  assert.equal(isMapLink('https://www.airbnb.com/rooms/123456'), false);
  assert.equal(isMapLink('https://www.google.com/search?q=hotel'), false);
  assert.equal(isMapLink('not a url'), false);
  assert.equal(isMapLink(''), false);
});

test('coords: the exact place pin beats the viewport centre', () => {
  const u = 'https://www.google.com/maps/place/X/@39.7000,-104.9000,17z/data=!3d39.7505!4d-104.9908';
  assert.deepEqual(coordsFromMapUrl(u), { lat: 39.7505, lng: -104.9908 });
  assert.deepEqual(coordsFromMapUrl('https://www.google.com/maps/place/X/@39.75,-104.99,15z'), { lat: 39.75, lng: -104.99 });
});

test('coords: Apple Maps ll= and a bare coordinate q=', () => {
  assert.deepEqual(coordsFromMapUrl('https://maps.apple.com/?ll=39.7505,-104.9908&q=Hotel'), { lat: 39.7505, lng: -104.9908 });
  assert.deepEqual(coordsFromMapUrl('https://www.google.com/maps?q=39.7505,-104.9908'), { lat: 39.7505, lng: -104.9908 });
  assert.equal(coordsFromMapUrl('https://www.google.com/maps/place/X/'), null);
  assert.equal(coordsFromMapUrl('https://maps.apple.com/?ll=0,0'), null);
});

test('name: from the /place/ segment, decoded; Apple q= as fallback', () => {
  assert.equal(nameFromMapUrl('https://www.google.com/maps/place/The+Crawford+Hotel/@39.7,-104.9'), 'The Crawford Hotel');
  assert.equal(nameFromMapUrl('https://www.google.com/maps/place/%E4%B8%B9%E4%BD%9B%E9%85%92%E5%BA%97/@39.7,-104.9'), '丹佛酒店');
  assert.equal(nameFromMapUrl('https://maps.apple.com/?ll=39.7,-104.9&q=Kimpton%20Hotel'), 'Kimpton Hotel');
  assert.equal(nameFromMapUrl('https://www.google.com/maps?q=39.7,-104.9'), '');
});

test('hotelRoomId: same place through different links dedupes, different places differ', () => {
  const a = hotelRoomId({ title: 'The Crawford Hotel', lat: 39.75051, lng: -104.99081, url: 'https://maps.app.goo.gl/x' });
  const b = hotelRoomId({ title: 'the crawford hotel', lat: 39.75054, lng: -104.99084, url: 'https://www.google.com/maps/place/other' });
  assert.equal(a, b);
  assert.match(a, /^map:/);
  const c = hotelRoomId({ title: 'Kimpton Hotel Born', lat: 39.7528, lng: -105.0004, url: '' });
  assert.notEqual(a, c);
});

test('extractCheapestRate: lowest provider-tagged offer wins', () => {
  const html = '..."Booking.com","$214"],["Expedia","$189"],["Hotels.com","$230"]...';
  assert.deepEqual(extractCheapestRate(html), { nightly: 189, provider: 'Expedia' });
});

test('extractCheapestRate: unicode-escaped dollars and per-night labels', () => {
  assert.deepEqual(extractCheapestRate('["\\u0024159 per night"]'), { nightly: 159, provider: '' });
  assert.equal(extractCheapestRate('<html>no prices here</html>'), null);
  assert.equal(extractCheapestRate(''), null);
});

test('extractCheapestRate: implausible amounts stay out', () => {
  assert.equal(extractCheapestRate('"Booking.com","$9"'), null);
  assert.equal(extractCheapestRate('"Booking.com","$9,999"'), null);
});
