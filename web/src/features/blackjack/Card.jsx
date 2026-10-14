import { useState } from 'react';

// 一张牌。新发的牌挂载时播一次发牌动画（delay 让同一批的牌一张张出来）；card 为 null 是扣着的底牌。
// delay 在挂载时定住：倒计时每 250ms 会重画整桌，后面的重画不能把还没播完的动画撤掉。
export default function Card({ card, delay }) {
  const [d] = useState(delay);
  const anim = d != null ? ' deal' : '';
  const style = d != null ? { animationDelay: d + 'ms' } : undefined;
  if (!card) return <div className={'bj-card back' + anim} style={style}></div>;
  const rank = card.slice(0, -1), suit = card.slice(-1);
  return <div className={'bj-card' + ('♥♦'.includes(suit) ? ' red' : '') + anim} style={style}><span>{rank}</span><span className="s">{suit}</span></div>;
}
