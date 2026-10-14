import { useState } from 'react';
import { api } from '../../lib/api.js';
import PeoplePicker from './PeoplePicker.jsx';

// 记一笔。分摊默认全选：记的是「取消勾选的人」，后来新加的成员自动是勾上的
export default function ExpenseForm({ names, me, onSaved }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [unchecked, setUnchecked] = useState([]);
  const [msg, setMsg] = useState('');
  const payer = names.includes(paidBy) ? paidBy : names.includes(me) ? me : names[0] || '';
  const checked = names.filter(n => !unchecked.includes(n));

  async function add() {
    const amountUSD = amount ? Number(amount) : null;
    if (!amountUSD) { setMsg('先填金额'); return; }
    if (!payer) { setMsg('先加成员并选择付款人'); return; }
    const r = await api('/api/expense', 'POST', { description: desc.trim(), amountUSD, paidBy: payer, splitAmong: checked });
    if (r.ok) { setDesc(''); setAmount(''); setMsg('记上了 ✅'); onSaved(r); }
    else setMsg(r.error || '记账失败');
  }

  return (
    <>
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <input value={desc} onChange={e => setDesc(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="支出说明，比如 房费 / 晚餐" />
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" min="0" className="border rounded-lg px-3 py-2" placeholder="金额 USD" />
        <select value={payer} onChange={e => setPaidBy(e.target.value)} className="border rounded-lg px-3 py-2">
          {names.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <div className="text-sm font-medium mb-1">分摊给（默认全选）</div>
        <PeoplePicker names={names} checked={checked} onChange={c => setUnchecked(names.filter(n => !c.includes(n)))} />
      </div>
      <button onClick={add} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 py-2">记一笔</button>
      <p className="text-sm mt-2 text-slate-500">{msg}</p>
    </>
  );
}
