import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { sameName } from '../../lib/format.js';
import { useSession } from '../../session/SessionContext.jsx';
import Members from './Members.jsx';
import ExpenseForm from './ExpenseForm.jsx';
import Balances from './Balances.jsx';
import ExpenseList from './ExpenseList.jsx';

// 成员名单：全员共用的用户列表（登录、投票、分账都是这一份）+ 自己 + 账里出现过的名字
function knownNames(users, me, expenses) {
  const out = [];
  const push = n => { n = String(n || '').trim(); if (n && !out.some(x => sameName(x, n))) out.push(n); };
  users.forEach(u => push(u.name));
  push(me);
  expenses.forEach(e => { push(e.paidBy); (e.splitAmong || []).forEach(push); });
  return out;
}

export default function SplitView({ active }) {
  const { name, users, setUsers } = useSession();
  const [ledger, setLedger] = useState({ expenses: [], balances: {}, settlements: [] });
  const names = useMemo(() => knownNames(users, name, ledger.expenses), [users, name, ledger.expenses]);

  // 后端返回的账本（和可能更新了的用户列表）
  const apply = useCallback(r => {
    setLedger(prev => ({ expenses: r.expenses || prev.expenses, balances: r.balances || prev.balances, settlements: r.settlements || prev.settlements }));
    if (r.users) setUsers(r.users);
  }, [setUsers]);
  const load = useCallback(async () => {
    try { const r = await api('/api/split'); if (r.ok) apply(r); } catch (e) {}
  }, [apply]);
  useEffect(() => { if (active) load(); }, [active, load]); // 每次进来拿最新的账，别人可能刚记了

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <Members names={names} onAdded={apply} />
      <ExpenseForm names={names} me={name} onSaved={apply} />
      <Balances balances={ledger.balances} settlements={ledger.settlements} />
      <ExpenseList expenses={ledger.expenses} names={names} onSaved={apply} onGone={load} />
    </section>
  );
}
