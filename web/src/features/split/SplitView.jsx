import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { fmtMoney, sameName } from '../../lib/format.js';
import { useSession } from '../../session/SessionContext.jsx';
import ExpenseForm from './ExpenseForm.jsx';
import Balances from './Balances.jsx';
import ExpenseList from './ExpenseList.jsx';

// 分账的人：全员共用的用户名单（登录时选的名字）+ 自己 + 账里出现过的名字。
// 这里不单独加人 —— 名单就一份，和登录、投票共用，免得两边对不上。
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

  const total = ledger.expenses.reduce((s, e) => s + (e.amountCents || 0), 0);
  const myEntry = Object.entries(ledger.balances).find(([n]) => name && sameName(n, name));
  const myBalance = myEntry ? myEntry[1] : null;

  return (
    <div className="space-y-5">
      {/* 总览：这趟一共花了多少、我现在是该收还是该付 */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500 mb-1">这趟总支出 · 共 {ledger.expenses.length} 笔</div>
            <div className="text-3xl font-black tracking-tight">{fmtMoney(total)}</div>
          </div>
          {name && (
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">{name} 的账</div>
              {myBalance == null || myBalance === 0
                ? <div className="font-bold text-slate-500">已结清 ✓</div>
                : myBalance > 0
                  ? <div className="font-bold text-emerald-600">还应收回 {fmtMoney(myBalance)}</div>
                  : <div className="font-bold text-rose-600">还要付出 {fmtMoney(-myBalance)}</div>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-white/50">
          <span className="text-xs text-slate-400 mr-1">一起分账的人：</span>
          {names.length ? names.map(n => (
            <span key={n} className="chip !m-0 inline-flex items-center gap-1.5 !py-1">
              <span className="avatar w-5 h-5 text-[10px]">{Array.from(n)[0].toUpperCase()}</span>{n}
            </span>
          )) : <span className="text-sm text-slate-400">还没有人</span>}
        </div>
      </section>

      <ExpenseForm names={names} me={name} onSaved={apply} />
      <Balances balances={ledger.balances} settlements={ledger.settlements} me={name} />
      <ExpenseList expenses={ledger.expenses} names={names} onSaved={apply} onGone={load} />
    </div>
  );
}
