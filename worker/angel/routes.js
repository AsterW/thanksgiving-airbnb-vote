// Secret Angel: everyone saves gift preferences; once they're all in, the
// admin draws who gives a gift to whom. Each person is only ever sent their
// own match. Stored in KV under angel:v1, keyed by lower-cased user name.
import { j } from '../lib/http.js';
import { cleanName, getUsers, sameName } from '../users/users.js';
import { drawCycle } from './draw.js';

const ANGEL_KEY = 'angel:v1';
const ADMIN = 'aster';
const PICK_VALUES = ['love', 'nope'];

async function getAngel(env) {
  const raw = await env.VOTES_KV.get(ANGEL_KEY);
  return raw ? JSON.parse(raw) : { prefs: {}, excluded: [], draw: null };
}
const saveAngel = (env, a) => env.VOTES_KV.put(ANGEL_KEY, JSON.stringify(a));

// The caller, if their name and token match the user list (same check as
// sitting down at Blackjack).
async function caller(env, name, token) {
  const users = await getUsers(env);
  const user = users.find(u => sameName(u.name, cleanName(name)));
  return user && token && user.token === token ? { users, user, key: user.name.toLowerCase() } : { users };
}

// Who's in: every user the admin hasn't excluded.
const roster = (users, a) => users
  .map(u => ({ key: u.name.toLowerCase(), name: u.name }))
  .filter(u => !a.excluded.includes(u.key))
  .sort((x, y) => x.name.localeCompare(y.name, 'zh-CN'));

function view(users, a, me) {
  const people = users.map(u => {
    const key = u.name.toLowerCase();
    return { name: u.name, submitted: !!a.prefs[key], excluded: a.excluded.includes(key) };
  }).sort((x, y) => x.name.localeCompare(y.name, 'zh-CN'));
  const masterKey = me && a.draw ? a.draw.pairs[me] : null;
  const master = masterKey ? users.find(u => u.name.toLowerCase() === masterKey) : null;
  return {
    ok: true,
    people,
    isAdmin: me === ADMIN,
    drawn: !!a.draw, drawnAt: a.draw ? a.draw.at : null,
    inDraw: !!(me && a.draw && a.draw.pairs[me]),
    mine: me ? a.prefs[me] || null : null,
    master: master ? { name: master.name, prefs: a.prefs[masterKey] || null } : null,
  };
}

async function handleGet(req, env, url) {
  const { users, key } = await caller(env, url.searchParams.get('name'), url.searchParams.get('token'));
  return j(view(users, await getAngel(env), key));
}

async function handlePrefs(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { users, key } = await caller(env, body.name, body.token);
  if (!key) return j({ ok: false, error: '先登录' });
  const picks = {};
  for (const [cat, v] of Object.entries(body.picks || {}).slice(0, 40)) {
    if (/^[a-z_]{1,24}$/.test(cat) && PICK_VALUES.includes(v)) picks[cat] = v;
  }
  if (!Object.values(picks).includes('love')) return j({ ok: false, error: '至少选一样想要的 💖' });
  const a = await getAngel(env);
  a.prefs[key] = { picks, note: String(body.note || '').trim().slice(0, 200), updatedAt: Date.now() };
  await saveAngel(env, a);
  return j(view(users, a, key));
}

// Admin: leave someone out (or back in), e.g. a name on the list who isn't coming.
async function handleExclude(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { users, key } = await caller(env, body.name, body.token);
  if (key !== ADMIN) return j({ ok: false, error: '只有管理员可以操作' });
  const target = cleanName(body.target).toLowerCase();
  if (!users.some(u => u.name.toLowerCase() === target)) return j({ ok: false, error: '没有这个人' });
  const a = await getAngel(env);
  a.excluded = a.excluded.filter(k => k !== target);
  if (body.excluded) a.excluded.push(target);
  await saveAngel(env, a);
  return j(view(users, a, key));
}

// Admin: draw (or redraw). The pool is whoever is in AND has saved
// preferences — no need to wait for stragglers: anyone who hasn't
// filled theirs in yet sits this round out, and a redraw after they
// submit pools them in. A redraw only replaces the pairings; saved
// preferences are never touched here.
async function handleDraw(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { users, key } = await caller(env, body.name, body.token);
  if (key !== ADMIN) return j({ ok: false, error: '只有管理员可以抽签' });
  const a = await getAngel(env);
  const pool = roster(users, a).filter(p => a.prefs[p.key]);
  if (pool.length < 2) return j({ ok: false, error: '至少要有两个人选好愿望才能抽（现在 ' + pool.length + ' 人）' });
  const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const pairs = drawCycle(pool.map(p => p.key), rand);
  if (!pairs) return j({ ok: false, error: '至少要两个人才能抽' });
  a.draw = { at: Date.now(), pairs };
  await saveAngel(env, a);
  return j(view(users, a, key));
}

export const routes = {
  'GET /api/angel': handleGet,
  'POST /api/angel/prefs': handlePrefs,
  'POST /api/angel/exclude': handleExclude,
  'POST /api/angel/draw': handleDraw,
};
