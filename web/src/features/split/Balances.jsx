import { fmtMoney, sameName } from '../../lib/format.js';

// 先给结论（谁转给谁、转多少），再给明细（每人总账）。金额单位是分。
export default function Balances({ balances, settlements, me }) {
  const entries = Object.entries(balances || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <>
      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-1">💸 怎么结清</h2>
        {settlements.length > 0 ? (
          <>
            <p className="text-sm text-slate-500 mb-3">照着转就行，这是转账次数最少的结清方式：</p>
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/60 border border-white/70 rounded-xl px-3 py-2.5">
                  <span className="chip !m-0 inline-flex items-center gap-1.5 !py-1"><span className="avatar w-5 h-5 text-[10px]">{Array.from(s.from)[0].toUpperCase()}</span>{s.from}</span>
                  <span className="text-slate-400">转给 →</span>
                  <span className="chip !m-0 inline-flex items-center gap-1.5 !py-1"><span className="avatar w-5 h-5 text-[10px]">{Array.from(s.to)[0].toUpperCase()}</span>{s.to}</span>
                  <span className="ml-auto font-black">{fmtMoney(s.amountCents)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-emerald-600 font-medium">都结清了，谁也不欠谁 🎉</p>
        )}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-3">🧾 每人总账</h2>
        <div>
          {entries.map(([n, c]) => (
            <div key={n} className={'flex items-center gap-2.5 border-b border-white/50 last:border-0 py-2.5 ' + (me && sameName(n, me) ? 'font-bold' : '')}>
              <span className="avatar w-7 h-7 text-xs">{Array.from(n)[0].toUpperCase()}</span>
              <span className="text-sm">{n}{me && sameName(n, me) ? '（我）' : ''}</span>
              {c === 0
                ? <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">已结清</span>
                : c > 0
                  ? <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">应收回 {fmtMoney(c)}</span>
                  : <span className="ml-auto text-xs font-bold text-rose-700 bg-rose-50 rounded-full px-2.5 py-1">应付出 {fmtMoney(-c)}</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">应收回 = 垫出去的比自己该摊的多；应付出反过来。上面「怎么结清」已经把它们轧差成最少的几笔转账。</p>
      </section>
    </>
  );
}
