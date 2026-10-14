// Where the group's ledger is stored.
import { TRIPS } from '../config/trips.js';
import { getState } from '../listings/state.js';
import { addUsers, canonName } from '../users/users.js';

// One ledger for the whole group (not per trip); members are the global user list.
const SPLIT_KEY = 'split:v1';
export async function getSplit(env) {
  const raw = await env.VOTES_KV.get(SPLIT_KEY);
  if (raw) return JSON.parse(raw);
  // First run: expenses and members used to be kept per trip. Merge the
  // expenses into one ledger and the member names into the user list.
  const expenses = [], names = [];
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    expenses.push(...state.expenses);
    names.push(...state.members);
  }
  expenses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const users = await addUsers(env, names.concat(...expenses.map(e => [e.paidBy, ...e.splitAmong])));
  for (const e of expenses) {
    e.paidBy = canonName(users, e.paidBy);
    e.splitAmong = [...new Set(e.splitAmong.map(n => canonName(users, n)))];
  }
  const split = { expenses, updatedAt: Date.now() };
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
  return split;
}
export async function saveSplit(env, split) {
  split.updatedAt = Date.now();
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
}
