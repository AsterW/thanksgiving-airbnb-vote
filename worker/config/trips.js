import { SEED } from './seed.js';

// ---- Trips: each leg has its own shortlist under its own KV key ----
// nov26 keeps the original 'state:v1' key so the existing list carries over.
// zones: the trip's named areas, each a center and a radius in km. A new
// listing inside one gets that area (see listings/zones.js). Names must match
// `areas` in web/src/lib/config.js, which sets their tab order.
export const TRIPS = {
  nov25: { kvKey: 'state:nov25:v1', seed: [], checkIn: '2026-11-25', checkOut: '2026-11-26', people: 9,
    zones: [
      { name: 'Denver 市区', lat: 39.7392, lng: -104.9903, km: 10 },
      { name: 'Denver 周边', lat: 39.7392, lng: -104.9903, km: 50 },
    ] },
  nov26: { kvKey: 'state:v1', seed: SEED, checkIn: '2026-11-26', checkOut: '2026-11-29', people: 14,
    zones: [
      { name: '大沙丘区域', lat: 37.7326, lng: -105.5122, km: 60 },
      { name: '落基山 · Estes Park', lat: 40.3772, lng: -105.5217, km: 30 },
    ] },
};
export const DEFAULT_TRIP = 'nov26'; // requests without a trip (old cached pages) hit the original list
export const tripOf = t => TRIPS[t] || TRIPS[DEFAULT_TRIP];
