import { useState } from 'react';
import { api } from '../../lib/api.js';
import { fmtMoney } from '../../lib/format.js';
import PeoplePicker from './PeoplePicker.jsx';

// 记一笔支出。分摊默认全选：记的是「取消勾选的人」，名单后来变长也自动带上新人
export default function ExpenseForm({ names, me, onSaved }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [unchecked, setUnchecked] = useState([]);
  const [msg, setMsg] = useState('');
  const payer = names.includes(paidBy) ? paidBy : names.includes(me) ? me : names[0] || '';
  const checked = names.filter(n => !unchecked.includes(n));
  const amountUSD = amount ? Number(amount) : 0;
  const perPerson = amountUSD > 0 && checked.length ? Math.round(amountUSD * 100 / checked.length) : null;

  async function add() {
    if (!amountUSD) { setMsg('还差金额'); return; }
    if (!payer) { setMsg('还没有可记账的成员'); return; }
    if (!checked.length) { setMsg('至少选一个人来分摊'); return; }
    const r = await api('/api/expense', 'POST', { description: desc.trim(), amountUSD, paidBy: payer, splitAmong: checked });
    if (r.ok) { setDesc(''); setAmount(''); setMsg('记好了 ✅'); onSaved(r); }
    else setMsg(r.error || '记账失败，稍后再试');
  }

  const field = 'w-full border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl px-3 py-2 bg-white/80 text-sm';
  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="font-bold text-lg mb-4">➕ 记一笔支出</h2>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1.5">花在哪</span>
          <input value={desc} onChange={e => setDesc(e.target.value)} className={field} placeholder="比如 房费 / 晚餐 / 门票" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1.5">谁付的钱</span>
          <select value={payer} onChange={e => setPaidBy(e.target.value)} className={field}>
            {names.map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1.5">多少钱（USD）</span>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" min="0" className={field} placeholder="0.00" />
        </label>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">和谁分（点名字取消 / 选上）</span>
          <span className="text-xs">
            <button onClick={() => setUnchecked([])} className="text-indigo-600 font-medium hover:underline">全选</button>
            <span className="text-slate-300 mx-1.5">·</span>
            <button onClick={() => setUnchecked([...names])} className="text-slate-500 font-medium hover:underline">清空</button>
          </span>
        </div>
        <PeoplePicker names={names} checked={checked} onChange={c => setUnchecked(names.filter(n => !c.includes(n)))} />
        {perPerson != null && <p className="text-xs text-slate-400 mt-2">{checked.length} 个人分，每人约 {fmtMoney(perPerson)}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={add} className="btn-primary text-white font-bold rounded-xl px-6 py-2.5 shadow">记上这笔</button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </section>
  );
}
