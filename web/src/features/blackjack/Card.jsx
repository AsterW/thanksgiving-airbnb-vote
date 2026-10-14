// 一张牌。新发的牌挂载时播一次发牌动画（delay 让同一批的牌一张张出来）；card 为 null 是扣着的底牌
export default function Card({ card, delay }) {
  const anim = delay != null ? ' deal' : '';
  const style = delay != null ? { animationDelay: delay + 'ms' } : undefined;
  if (!card) return <div className={'bj-card back' + anim} style={style}></div>;
  const rank = card.slice(0, -1), suit = card.slice(-1);
  return <div className={'bj-card' + ('♥♦'.includes(suit) ? ' red' : '') + anim} style={style}><span>{rank}</span><span className="s">{suit}</span></div>;
}
