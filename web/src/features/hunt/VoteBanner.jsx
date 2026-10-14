import { useEffect, useState } from 'react';
import { countdown, deadlineText } from './deadline.js';

// 投票进行中：倒计时 + 规则 + 有多少人投过票
export default function VoteBanner({ vote, listings, T }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
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
        喜欢几间就投几间 · 截止时 Airbnb 还能订、票数最高的那间就是我们的（平票选便宜的）· 截止后票数和房源都会锁定
        {' · '}已有 {voters.length} 人投票{voters.length ? '：' + voters.join('、') : ''}
      </p>
    </section>
  );
}
