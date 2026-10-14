// Activity routes: the seeded candidate cards, one vote toggle per
// person (same shape as the listing vote: token identifies the voter,
// sending a name votes, sending name:null takes the vote back), plus
// member-added cards — paste a link and the card is built from the
// page's own title/description — and removing cards.
import { j, uid } from '../lib/http.js';
import { cleanName } from '../users/users.js';
import { fetchLinkInfo } from './parse.js';
import { getActivities, saveActivities, isSeedId } from './store.js';

// Cards members add themselves land in this area group, after the seeded ones.
export const CUSTOM_AREA = '大家添加的';

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

async function handleActivityAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim().slice(0, 1000);
  let parsed;
  try { parsed = new URL(url); } catch (e) { /* handled below */ }
  if (!parsed || !/^https?:$/.test(parsed.protocol)) return j({ ok: false, error: '链接看起来不对，粘一个 http/https 开头的网址' });
  // Fast-path dedupe only — do NOT hold this snapshot across the fetch
  // (same lost-update trap as listing adds: read state again after).
  const pre = await getActivities(env);
  if (pre.items.some(a => a.url === url)) return j({ ok: false, error: '这个链接已经在列表里了' });
  // Read the page first, re-read state after: fetching can take seconds.
  const info = await fetchLinkInfo(url);
  const doc = await getActivities(env);
  if (doc.items.some(a => a.url === url)) return j({ ok: false, error: '这个链接已经在列表里了' });
  const givenTitle = String(body.title || '').trim().slice(0, 120);
  const by = cleanName(body.name);
  const act = {
    id: uid(),
    emoji: '🔗',
    area: CUSTOM_AREA,
    title: givenTitle || info.title || parsed.hostname.replace(/^www\./, ''),
    blurb: info.blurb || '',
    url,
    source: by ? '群友添加 · ' + by : '群友添加',
    custom: true,
    createdAt: Date.now(),
    votes: [],
  };
  doc.items.push(act);
  await saveActivities(env, doc);
  return j({ ok: true, activity: act, parsed: info.ok });
}

async function handleActivityRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const doc = await getActivities(env);
  const i = doc.items.findIndex(a => a.id === body.id);
  if (i < 0) return j({ ok: false, error: '活动不存在' });
  doc.items.splice(i, 1);
  // A deleted seed card must not come back on the next seed refresh.
  if (isSeedId(body.id) && !doc.removedIds.includes(body.id)) doc.removedIds.push(body.id);
  await saveActivities(env, doc);
  return j({ ok: true });
}

export const routes = {
  'GET /api/activities': async (req, env) => j({ ok: true, activities: (await getActivities(env)).items }),
  'POST /api/activity-vote': handleActivityVote,
  'POST /api/activity-add': handleActivityAdd,
  'POST /api/activity-remove': handleActivityRemove,
};
