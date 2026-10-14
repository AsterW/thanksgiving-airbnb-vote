// Split that bill routes: one expense ledger for the whole group.
import { j, uid } from '../lib/http.js';
import { addUsers, canonName, cleanName, publicUsers } from '../users/users.js';
import { splitView } from './ledger.js';
import { getSplit, updateSplit } from './store.js';

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
  const expense = { id: uid(), ...fields, createdAt: Date.now() };
  const view = await updateSplit(env, split => {
    split.expenses.unshift(expense);
    return splitView(split);
  });
  return j({ ok: true, expense, users: publicUsers(users), ...view });
}

// Fix a wrong description, amount, payer or set of people. The expense keeps
// its id and its place in the list.
async function handleExpenseUpdate(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  // Existence first (as before), then field validation; the check runs
  // again inside the transaction against the freshest ledger.
  const before = await getSplit(env);
  if (!before.expenses.some(e => e.id === body.id)) return j({ ok: false, error: '支出不存在' });
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  const out = await updateSplit(env, split => {
    const expense = split.expenses.find(e => e.id === body.id);
    if (!expense) return { error: '支出不存在' };
    Object.assign(expense, fields, { updatedAt: Date.now() });
    return { expense, view: splitView(split) };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, expense: out.expense, users: publicUsers(users), ...out.view });
}

async function handleExpenseRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const out = await updateSplit(env, split => {
    const i = split.expenses.findIndex(e => e.id === body.id);
    if (i < 0) return { error: '支出不存在' };
    split.expenses.splice(i, 1);
    return { view: splitView(split) };
  });
  if (out.error) return j({ ok: false, error: out.error });
  return j({ ok: true, ...out.view });
}

export const routes = {
  'GET /api/split': async (req, env) => j({ ok: true, ...splitView(await getSplit(env)) }),
  'POST /api/expense': handleExpenseAdd,
  'POST /api/expense-update': handleExpenseUpdate,
  'POST /api/expense-remove': handleExpenseRemove,
};
