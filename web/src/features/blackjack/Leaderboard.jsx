export default function Leaderboard({ rows }) {
  return (
    <aside className="glass-card rounded-2xl p-5 self-start">
      <h2 className="font-bold text-lg mb-1">🏆 筹码榜</h2>
      <p className="text-xs text-slate-500 mb-3">站起来时才保存筹码 · 初始 1000，输光了自动补给</p>
      {rows.length ? rows.map((r, i) => (
        <div key={r.name} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm">
          <span className="truncate">{i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.'} {r.name}{r.seated && <span className="text-xs text-emerald-600"> 在桌上</span>}</span>
          <span className="font-bold tabular-nums whitespace-nowrap">{r.chips.toLocaleString()}{r.refills ? <span className="text-xs font-normal text-slate-400"> 补给×{r.refills}</span> : null}</span>
        </div>
      )) : <p className="text-sm text-slate-400">还没人玩过</p>}
      <p className="text-xs text-slate-400 mt-4 leading-relaxed">规则：6 副牌，庄家软 17 停牌，Blackjack 赔 3:2，头两张可以加倍，不能分牌和买保险。每注 10–500。筹码只是好玩，和分账无关。</p>
    </aside>
  );
}
