// Split that bill routes: one expense ledger for the whole group.
import { j, uid } from '../lib/http.js';
import { addUsers, canonName, cleanName, publicUsers } from '../users/users.js';
import { splitView } from './ledger.js';
import { getSplit, saveSplit } from './store.js';

// Validates the fields of an expense being added or edited.
// Returns { error } or { fields, users }.
async function readExpense(body, env) {
  const cents = Math.round(Number(body.amountUSD) * 100);
  if (!isFinite(cents) || cents <= 0) return { error: '金额要大于 0' };
  let paidBy = cleanName(body.paidBy);
  if (!paidBy) return { error: '请选择付款人' };
  let splitAmong = (Array.isArray(body.splitAmong) ? body.splitAmong : []).map(cleanName).filter(Boolean);
  if (!splitAmong.length) return { error: '至少选一个人分摊' };
  // New names join the user list; known names use its spelling so "ken" and "Ken" share one balance.
  const users = await addUsers(env, [paidBy, ...splitAmong]);
  paidBy = canonName(users, paidBy);
  splitAmong = [...new Set(splitAmong.map(n => canonName(users, n)))];
  const description = String(body.description || '').trim().slice(0, 120) || '未命名支出';
  return { users, fields: { description, amountCents: cents, paidBy, splitAmong } };
}

async function handleExpenseAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  const split = await getSplit(env);
  const expense = { id: uid(), ...fields, createdAt: Date.now() };
  split.expenses.unshift(expense);
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

// Fix a wrong description, amount, payer or set of people. The expense keeps
// its id and its place in the list.
async function handleExpenseUpdate(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const expense = split.expenses.find(e => e.id === body.id);
  if (!expense) return j({ ok: false, error: '支出不存在' });
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  Object.assign(expense, fields, { updatedAt: Date.now() });
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

async function handleExpenseRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const i = split.expenses.findIndex(e => e.id === body.id);
  if (i < 0) return j({ ok: false, error: '支出不存在' });
  split.expenses.splice(i, 1);
  await saveSplit(env, split);
  return j({ ok: true, ...splitView(split) });
}

export const routes = {
  'GET /api/split': async (req, env) => j({ ok: true, ...splitView(await getSplit(env)) }),
  'POST /api/expense': handleExpenseAdd,
  'POST /api/expense-update': handleExpenseUpdate,
  'POST /api/expense-remove': handleExpenseRemove,
};
