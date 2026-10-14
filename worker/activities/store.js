// Where the activity candidates and their votes are stored: one document
// for the whole group (activities span all three bases of the trip).
import { SEED } from './seed.js';

const ACTIVITIES_KEY = 'activities:v1';
// Changes whenever the seed list changes, so a deploy with new/edited
// cards refreshes their text on next read without touching anyone's votes.
const SEED_STAMP = SEED.map(s => s.id).join(',');

export async function getActivities(env) {
  let doc = null;
  const raw = await env.VOTES_KV.get(ACTIVITIES_KEY);
  if (raw) { try { doc = JSON.parse(raw); } catch (e) { doc = null; } }
  if (doc && doc.seedStamp === SEED_STAMP && Array.isArray(doc.items)) {
    if (!Array.isArray(doc.removedIds)) doc.removedIds = [];
    return doc;
  }
  // First run (or the seed changed): rebuild from the seed, keeping the
  // votes of any card that was already there. Seed cards someone deleted
  // stay deleted (removedIds tombstones), and cards members added
  // themselves (ids not in the seed) are carried over untouched.
  const prevItems = (doc && doc.items) || [];
  const prev = new Map(prevItems.map(a => [a.id, a]));
  const removedIds = (doc && doc.removedIds) || [];
  const removed = new Set(removedIds);
  const items = SEED.filter(s => !removed.has(s.id))
    .map(s => ({ ...s, votes: (prev.get(s.id) || {}).votes || [] }));
  for (const a of prevItems) if (!SEED.some(s => s.id === a.id)) items.push(a);
  doc = { seedStamp: SEED_STAMP, items, removedIds, updatedAt: Date.now() };
  await env.VOTES_KV.put(ACTIVITIES_KEY, JSON.stringify(doc));
  return doc;
}

export async function saveActivities(env, doc) {
  doc.updatedAt = Date.now();
  await env.VOTES_KV.put(ACTIVITIES_KEY, JSON.stringify(doc));
}

// True for ids that came from the seed (vs. cards members added).
export const isSeedId = id => SEED.some(s => s.id === id);
