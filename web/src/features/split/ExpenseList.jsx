import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { fmtMoney } from '../../lib/format.js';
import { useToast } from '../../components/Toast.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import PeoplePicker from './PeoplePicker.jsx';

// 支出记录。✎ 修改：编辑框直接展开在这一行下面；Enter 保存，Esc 取消
export default function ExpenseList({ expenses, names, onSaved, onGone }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  // 正在改的这笔被别人删了：收起编辑框
  useEffect(() => { if (editingId && !expenses.some(e => e.id === editingId)) { setEditingId(null); setDraft(null); } }, [expenses, editingId]);

  function edit(e) {
    setEditingId(e.id);
    setDraft({ desc: e.description, amount: String(e.amountCents / 100), paidBy: e.paidBy, checked: e.splitAmong || [] });
  }
  const cancel = () => { setEditingId(null); setDraft(null); };

  async function remove(id) {
    if (!await confirm({ title: '删除这笔支出？', message: '删掉后大家的余额会重新计算。', confirmText: '删除', danger: true })) return;
    const r = await api('/api/expense-remove', 'POST', { id });
    if (r.ok) onSaved(r); else toast('删除失败，稍后再试');
  }

  if (!expenses.length) return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="font-bold text-lg mb-1">🧾 支出记录</h2>
      <p className="text-sm text-slate-400">还没有支出 — 第一笔就用上面记上。</p>
    </section>
  );
  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="font-bold text-lg mb-2">🧾 支出记录</h2>
      {expenses.map(e => (
        <div key={e.id}>
          <div className={'flex items-center gap-2 border-b border-white/50 last:border-0 py-2.5 text-sm' + (e.id === editingId ? ' bg-amber-50 -mx-2 px-2 rounded-t-lg' : '')}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{e.description || '（没写说明）'}</div>
              <div className="text-slate-500 text-xs">{e.paidBy} 付的 · {(e.splitAmong || []).length} 人分摊 · 每人 {fmtMoney(Math.round(e.amountCents / Math.max(1, (e.splitAmong || []).length)))}</div>
            </div>
            <div className="font-bold">{fmtMoney(e.amountCents)}</div>
            <button onClick={() => edit(e)} className="text-slate-400 hover:text-indigo-600 px-1" title="修改这笔">✎</button>
            <button onClick={() => remove(e.id)} className="text-slate-400 hover:text-red-600 px-1" title="删除这笔">✕</button>
          </div>
          {e.id === editingId && draft && (
            <Editor id={e.id} draft={draft} setDraft={setDraft} names={names} onCancel={cancel}
              onSaved={r => { cancel(); onSaved(r); }} onGone={() => { cancel(); onGone(); toast('这笔已经被别人删掉了'); }} />
          )}
        </div>
      ))}
    </section>
  );
}

function Editor({ id, draft, setDraft, names, onCancel, onSaved, onGone }) {
  const box = useRef(null), amountRef = useRef(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    box.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    amountRef.current.focus({ preventScroll: true });
  }, [id]);
  const set = k => e => setDraft({ ...draft, [k]: e.target.value });
  // 付款人下拉框：大小写不同也算同一个人
  const payer = names.find(n => n.toLowerCase() === draft.paidBy.toLowerCase()) || draft.paidBy;

  async function save() {
    const amountUSD = draft.amount ? Number(draft.amount) : null;
    if (!amountUSD) { setMsg('先填金额'); return; }
    const r = await api('/api/expense-update', 'POST', { id, description: draft.desc.trim(), amountUSD, paidBy: payer, splitAmong: draft.checked });
    if (r.ok) onSaved(r);
    else if (r.error === '支出不存在') onGone();
    else setMsg(r.error || '修改失败');
  }

  return (
    <div ref={box} className="bg-amber-50 -mx-2 px-2 pb-3 pt-1 mb-1 rounded-b-lg text-sm"
      onKeyDown={e => { if (e.key === 'Enter') save(); else if (e.key === 'Escape') onCancel(); }}>
      <div className="grid md:grid-cols-3 gap-2 mb-2">
        <input className="border rounded-lg px-3 py-2 bg-white" placeholder="支出说明" value={draft.desc} onChange={set('desc')} />
        <input ref={amountRef} type="number" step="0.01" min="0" className="border rounded-lg px-3 py-2 bg-white" placeholder="金额 USD" value={draft.amount} onChange={set('amount')} />
        <select className="border rounded-lg px-3 py-2 bg-white" value={payer} onChange={set('paidBy')}>
          {names.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="mb-2"><span className="font-medium mr-2">和谁分</span>
        <PeoplePicker names={names} checked={draft.checked} onChange={checked => setDraft({ ...draft, checked })} />
      </div>
      <button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-1.5">保存修改</button>
      <button onClick={onCancel} className="border-2 border-slate-200 hover:border-slate-400 bg-white text-slate-600 rounded-xl px-4 py-1 ml-2">取消</button>
      <span className="ml-3 text-rose-600">{msg}</span>
    </div>
  );
}
