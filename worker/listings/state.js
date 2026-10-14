// Each trip's listings live in the store (worker/store) under the
// trip's own key — the same key they had in KV; the store imports the
// legacy KV value on first read. All writes go through updateState so
// concurrent votes/adds/removes can't overwrite each other.
import { uid } from '../lib/http.js';
import { readDoc, transact } from '../lib/store.js';

// In-place migrations for states saved by older versions.
function normalizeState(state) {
  if (!Array.isArray(state.listings)) state.listings = [];
  if (!Array.isArray(state.members)) state.members = [];
  if (!Array.isArray(state.expenses)) state.expenses = [];
  // Seed listings used to carry hand-typed 4-night prices for old dates.
  // Drop them so only live Airbnb prices are shown. Prices typed into the
  // manual-add form have priceNights and are kept.
  for (const l of state.listings) if (l.priceUSD != null && l.priceNights == null) delete l.priceUSD;
  return state;
}

function seedState(trip) {
  return { listings: trip.seed.map(s => ({ id: uid(), ...s, addedBy: 'Ken', createdAt: Date.now(), votes: [] })), members: [], expenses: [], updatedAt: Date.now() };
}

export async function getState(env, trip) {
  const { doc } = await readDoc(env, trip.kvKey);
  if (doc) return normalizeState(doc);
  // First run ever for this trip: persist the seeded state through the
  // same versioned write path as everything else (exactly once, even
  // if two first-reads race).
  return updateState(env, trip, state => state);
}

// Read the current state, let fn mutate it, and commit — re-reading and
// re-running fn if someone else committed meanwhile. fn returns the
// handler's result (often built from the mutated state). Slow work
// (scraping, geocoding) must happen before calling this, never inside fn.
export async function updateState(env, trip, fn) {
  return transact(env, trip.kvKey, async doc => {
    const state = doc ? normalizeState(doc) : seedState(trip);
    const result = await fn(state);
    state.updatedAt = Date.now();
    return { doc: state, result };
  });
}
