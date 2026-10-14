// Activity routes: the seeded candidate cards and one vote toggle per
// person, same shape as the listing vote (token identifies the voter,
// sending a name votes, sending name:null takes the vote back).
import { j } from '../lib/http.js';
import { getActivities, saveActivities } from './store.js';

async function handleActivityVote(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { id, token, name } = body;
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const doc = await getActivities(env);
  const act = doc.items.find(a => a.id === id);
  if (!act) return j({ ok: false, error: '活动不存在' });
  act.votes = (act.votes || []).filter(v => v.token !== token);
  let voted = false;
  if (name) {
    act.votes.push({ token: String(token).slice(0, 80), name: String(name).slice(0, 20), at: Date.now() });
    voted = true;
  }
  await saveActivities(env, doc);
  return j({ ok: true, votes: act.votes, voted });
}

export const routes = {
  'GET /api/activities': async (req, env) => j({ ok: true, activities: (await getActivities(env)).items }),
  'POST /api/activity-vote': handleActivityVote,
};
