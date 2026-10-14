// The group's user list: one list shared by every trip and feature, so
// people pick their name from a dropdown instead of typing it again.
// Stored in the store (worker/store) under its old KV key; the store
// imports the legacy KV value on first read.
import { j, uid } from '../lib/http.js';
import { readDoc, transact } from '../lib/store.js';
import { TRIPS } from '../config/trips.js';
import { getState, updateState } from '../listings/state.js';

export const cleanName = v => String(v || '').trim().slice(0, 20);

// One global user list shared by both trips, so people pick their name
// from a dropdown instead of typing it again on every device. Each user
// owns the vote token their votes are recorded under; picking an existing
// user on a new device adopts that token, so their votes show as theirs.
const USERS_KEY = 'users:v1';
export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// First run: build the list from everyone who already voted or was added
// as a splitwise member, reusing the token from their votes.
async function buildUsers(env) {
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
  return users;
}

export async function getUsers(env) {
  const { doc } = await readDoc(env, USERS_KEY);
  if (doc) return doc;
  // Persist the built list once, through the versioned write path.
  return transact(env, USERS_KEY, async current => {
    if (current) return { result: current };
    const users = await buildUsers(env);
    return { doc: users, result: users };
  });
}

// fn(users) mutates the freshest list and returns the caller's result;
// the commit is version-checked (see lib/store.js), so two people
// logging in or being added in the same second can't erase each other.
async function updateUsers(env, fn) {
  return transact(env, USERS_KEY, async doc => {
    const users = doc || await buildUsers(env);
    const result = await fn(users);
    return { doc: users, result };
  });
}
export const publicUsers = users => users.map(u => ({ name: u.name, token: u.token }))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
// The user list's spelling of a name ("ken" -> "Ken"), or the name as given.
export const canonName = (users, name) => (users.find(u => sameName(u.name, name)) || { name }).name;

// Add any names that aren't in the user list yet; returns the list.
export async function addUsers(env, names) {
  return transact(env, USERS_KEY, async doc => {
    const users = doc || await buildUsers(env);
    let changed = !doc; // a freshly built list needs persisting even if no name is new
    for (const raw of names) {
      const name = cleanName(raw);
      if (name && !users.some(u => sameName(u.name, name))) {
        users.push({ name, token: uid(), createdAt: Date.now() });
        changed = true;
      }
    }
    return changed ? { doc: users, result: users } : { result: users };
  });
}

// Log in as an existing name, or create it. Names are unique (case-insensitive).
async function handleLogin(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  await getUsers(env); // make sure the list (and its first-run build) exists
  const { user, users } = await updateUsers(env, users => {
    let user = users.find(u => sameName(u.name, name));
    if (!user) {
      const token = String(body.token || '').slice(0, 80) || uid();
      user = { name, token: users.some(u => u.token === token) ? uid() : token, createdAt: Date.now() };
      users.push(user);
    }
    return { user, users };
  });
  // This device may have voted under its own token before logging in as an
  // existing user: move those votes (same name only) onto the user's token.
  const oldToken = String(body.token || '');
  if (oldToken && oldToken !== user.token) {
    for (const key of Object.keys(TRIPS)) {
      await updateState(env, TRIPS[key], state => {
        for (const l of state.listings) {
          const votes = l.votes || [];
          if (!votes.some(v => v.token === oldToken && sameName(v.name || '', user.name))) continue;
          const hasUserVote = votes.some(v => v.token === user.token);
          l.votes = votes.flatMap(v => {
            if (v.token !== oldToken || !sameName(v.name || '', user.name)) return [v];
            return hasUserVote ? [] : [{ ...v, token: user.token }];
          });
        }
      });
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
