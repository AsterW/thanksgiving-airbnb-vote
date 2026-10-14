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
  if (doc && doc.seedStamp === SEED_STAMP && Array.isArray(doc.items)) return doc;
  // First run (or the seed changed): build the list from the seed, keeping
  // the votes of any card that was already there. Cards dropped from the
  // seed disappear; cards nobody has seen yet start with no votes.
  const prev = new Map(((doc && doc.items) || []).map(a => [a.id, a]));
  const items = SEED.map(s => ({ ...s, votes: (prev.get(s.id) || {}).votes || [] }));
  doc = { seedStamp: SEED_STAMP, items, updatedAt: Date.now() };
  await env.VOTES_KV.put(ACTIVITIES_KEY, JSON.stringify(doc));
  return doc;
}

export async function saveActivities(env, doc) {
  doc.updatedAt = Date.now();
  await env.VOTES_KV.put(ACTIVITIES_KEY, JSON.stringify(doc));
}
