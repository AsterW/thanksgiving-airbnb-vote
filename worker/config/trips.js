import { SEED } from './seed.js';

// ---- Trips: each leg has its own shortlist under its own KV key ----
// nov26 keeps the original 'state:v1' key so the existing list carries over.
export const TRIPS = {
  nov25: { kvKey: 'state:nov25:v1', seed: [], checkIn: '2026-11-25', checkOut: '2026-11-26', people: 9 },
  nov26: { kvKey: 'state:v1', seed: SEED, checkIn: '2026-11-26', checkOut: '2026-11-29', people: 14 },
};
export const DEFAULT_TRIP = 'nov26'; // requests without a trip (old cached pages) hit the original list
export const tripOf = t => TRIPS[t] || TRIPS[DEFAULT_TRIP];
