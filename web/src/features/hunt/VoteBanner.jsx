import { useEffect, useState } from 'react';
import { countdown, deadlineText } from './deadline.js';

const RULES = '喜欢几间就投几间 · 截止时 Airbnb 还能订、票数最高的那间就是我们的（平票选便宜的）· 截止后票数和房源都会锁定';

// 投票进行中：倒计时 + 规则 + 有多少人投过票。
// vote 还是 null（state 没回来）时渲染加载态：和正式横幅一模一样的结构、
// 排版和渐变，只是数字位置放等长的占位 —— 两边盒子天然同高，数据到了
// 原地换字，不会把下面的内容顶下去（之前单独写了个 104px 的占位块，
// 真横幅在手机上光规则段落就折三行，比占位高出一大截，一加载完就弹）。
export default function VoteBanner({ vote, listings, T }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!vote) {
    return (
      <section className="rounded-2xl shadow p-4 mb-5 text-white bg-gradient-to-r from-indigo-600 to-purple-600" aria-hidden="true">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-bold opacity-90">🗳️ {T.date} 的房子投票还剩</span>
          <span className="text-2xl font-black tabular-nums">— 天 — 小时 — 分</span>
          <span className="text-xs opacity-80">截止：加载中…</span>
        </div>
        <p className="text-xs mt-2 opacity-90">{RULES}{' · '}已有 … 人投票</p>
      </section>
    );
  }
  const left = Date.parse(vote.voteEndsAt) - now;
  const voters = [...new Set(listings.flatMap(l => (l.votes || []).map(v => v.name)).filter(Boolean))];
  const urgent = left < 24 * 3600 * 1000;
  return (
    <section className={'rounded-2xl shadow p-4 mb-5 text-white ' + (urgent ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600')}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-bold opacity-90">🗳️ {T.date} 的房子投票还剩</span>
        <span className="text-2xl font-black tabular-nums">{countdown(left)}</span>
        <span className="text-xs opacity-80">截止：{deadlineText(vote.voteEndsAt)}</span>
      </div>
      <p className="text-xs mt-2 opacity-90">
        {RULES}
        {' · '}已有 {voters.length} 人投票{voters.length ? '：' + voters.join('、') : ''}
      </p>
    </section>
  );
}
