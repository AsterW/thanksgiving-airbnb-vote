import { fmtMoney } from '../../lib/format.js';

export default function Balances({ balances, settlements }) {
  const entries = Object.entries(balances || {}).sort((a, b) => b[1] - a[1]);
  return (
    <>
      {entries.length > 0 && (
        <div className="mt-5">
          <h3 className="font-bold mb-2">余额（+ 应收回 · − 应付出）</h3>
          {entries.map(([n, c]) => (
            <div key={n} className="flex justify-between border-b py-1.5 text-sm">
              <span>{n}</span>
              <span className={'font-medium ' + (c > 0 ? 'text-emerald-600' : c < 0 ? 'text-rose-600' : 'text-slate-400')}>
                {c === 0 ? '已结清' : (c > 0 ? '+' : '−') + fmtMoney(c)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        {settlements.length > 0 ? (
          <>
            <h3 className="font-bold mb-2">💸 这样结清最省事</h3>
            {settlements.map((s, i) => <div key={i} className="text-sm py-1">{s.from} 付给 {s.to} <b>{fmtMoney(s.amountCents)}</b></div>)}
          </>
        ) : entries.length > 0 && <p className="text-sm text-emerald-600">大家已经结清了 🎉</p>}
      </div>
    </>
  );
}
