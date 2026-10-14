// Each trip's listings live in KV under the trip's own key.
import { uid } from '../lib/http.js';

export async function getState(env, trip) {
  const raw = await env.VOTES_KV.get(trip.kvKey);
  if (raw) {
    const state = JSON.parse(raw);
    // Migrate states saved before splitwise existed.
    if (!Array.isArray(state.listings)) state.listings = [];
    if (!Array.isArray(state.members)) state.members = [];
    if (!Array.isArray(state.expenses)) state.expenses = [];
    // Seed listings used to carry hand-typed 4-night prices for old dates.
    // Drop them so only live Airbnb prices are shown. Prices typed into the
    // manual-add form have priceNights and are kept. Not saved here (a write
    // on read could clobber a concurrent vote); the next save persists it.
    for (const l of state.listings) if (l.priceUSD != null && l.priceNights == null) delete l.priceUSD;
    return state;
  }
  const state = { listings: trip.seed.map(s => ({ id: uid(), ...s, addedBy: 'Ken', createdAt: Date.now(), votes: [] })), members: [], expenses: [], updatedAt: Date.now() };
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
  return state;
}
export async function saveState(env, trip, state) {
  state.updatedAt = Date.now();
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
}
