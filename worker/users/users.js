// The group's user list: one list shared by every trip and feature, so
// people pick their name from a dropdown instead of typing it again.
import { j, uid } from '../lib/http.js';
import { TRIPS } from '../config/trips.js';
import { getState, saveState } from '../listings/state.js';

export const cleanName = v => String(v || '').trim().slice(0, 20);

// One global user list shared by both trips, so people pick their name
// from a dropdown instead of typing it again on every device. Each user
// owns the vote token their votes are recorded under; picking an existing
// user on a new device adopts that token, so their votes show as theirs.
const USERS_KEY = 'users:v1';
export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export async function getUsers(env) {
  const raw = await env.VOTES_KV.get(USERS_KEY);
  if (raw) return JSON.parse(raw);
  // First run: build the list from everyone who already voted or was added
  // as a splitwise member, reusing the token from their votes.
  const users = [];
  const add = (name, token) => {
    name = cleanName(name);
    if (name && !users.some(u => sameName(u.name, name))) users.push({ name, token: token || uid(), createdAt: Date.now() });
  };
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    state.listings.forEach(l => (l.votes || []).forEach(v => add(v.name, v.token)));
    state.members.forEach(m => add(m));
  }
  await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}
export const publicUsers = users => users.map(u => ({ name: u.name, token: u.token }))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
// The user list's spelling of a name ("ken" -> "Ken"), or the name as given.
export const canonName = (users, name) => (users.find(u => sameName(u.name, name)) || { name }).name;

// Add any names that aren't in the user list yet; returns the list.
export async function addUsers(env, names) {
  const users = await getUsers(env);
  let changed = false;
  for (const raw of names) {
    const name = cleanName(raw);
    if (name && !users.some(u => sameName(u.name, name))) {
      users.push({ name, token: uid(), createdAt: Date.now() });
      changed = true;
    }
  }
  if (changed) await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}

// Log in as an existing name, or create it. Names are unique (case-insensitive).
async function handleLogin(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await getUsers(env);
  let user = users.find(u => sameName(u.name, name));
  if (!user) {
    const token = String(body.token || '').slice(0, 80) || uid();
    user = { name, token: users.some(u => u.token === token) ? uid() : token, createdAt: Date.now() };
    users.push(user);
    await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  }
  // This device may have voted under its own token before logging in as an
  // existing user: move those votes (same name only) onto the user's token.
  const oldToken = String(body.token || '');
  if (oldToken && oldToken !== user.token) {
    for (const key of Object.keys(TRIPS)) {
      const state = await getState(env, TRIPS[key]);
      let changed = false;
      for (const l of state.listings) {
        const votes = l.votes || [];
        if (!votes.some(v => v.token === oldToken && sameName(v.name || '', user.name))) continue;
        const hasUserVote = votes.some(v => v.token === user.token);
        l.votes = votes.flatMap(v => {
          if (v.token !== oldToken || !sameName(v.name || '', user.name)) return [v];
          return hasUserVote ? [] : [{ ...v, token: user.token }];
        });
        changed = true;
      }
      if (changed) await saveState(env, TRIPS[key], state);
    }
  }
  return j({ ok: true, user: { name: user.name, token: user.token }, users: publicUsers(users) });
}

async function handleMemberAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await addUsers(env, [name]);
  return j({ ok: true, users: publicUsers(users) });
}

export const routes = {
  'GET /api/users': async (req, env) => j({ ok: true, users: publicUsers(await getUsers(env)) }),
  'POST /api/login': handleLogin,
  'POST /api/member': handleMemberAdd,
};
