// 斗地主自己的豆子榜（和 21 点的筹码榜分开）
export default function DdzBoard({ rows }) {
  return (
    <aside className="glass-card rounded-2xl p-5 self-start">
      <h2 className="font-bold text-lg mb-1">🏆 斗地主豆子榜</h2>
      <p className="text-xs text-slate-500 mb-3">站起来时才保存豆子 · 初始 1000，输光了自动补给</p>
      {rows.length ? rows.map((r, i) => (
        <div key={r.name} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm">
          <span className="truncate">{i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.'} {r.name}{r.seated && <span className="text-xs text-emerald-600"> 在桌上</span>}</span>
          <span className="font-bold tabular-nums whitespace-nowrap">{r.points.toLocaleString()}
            <span className="text-xs font-normal text-slate-400"> {r.games ? r.wins + '胜/' + r.games + '局' : ''}{r.refills ? ' 补给×' + r.refills : ''}</span>
          </span>
        </div>
      )) : <p className="text-sm text-slate-400">还没人玩过</p>}
      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        规则：一副牌 54 张，三人各 17 张，留 3 张底牌。叫地主 / 抢地主，每抢一次 ×2；炸弹、王炸各 ×2；春天 / 反春 ×2。底分 10 豆，地主一人对两家，输赢都算两份。
        空位由机器人补上；掉线或连着两次没出牌会自动托管。豆子只是好玩，和分账无关。
      </p>
    </aside>
  );
}
