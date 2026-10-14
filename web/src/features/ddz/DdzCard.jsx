// 一张斗地主的牌。card 为 null 是背面；'sj' / 'bj' 是小王 / 大王。
// 其他属性（比如手牌里的 data-i）原样放到牌上。
export default function DdzCard({ card, size = '', selected, className = '', ...rest }) {
  if (!card) return <div {...rest} className={'dz-card back ' + size} />;
  const joker = card === 'sj' || card === 'bj';
  const suit = joker ? '' : card.slice(-1);
  const red = card === 'bj' || suit === '♥' || suit === '♦';
  return (
    <div {...rest} className={'dz-card ' + size + (red ? ' red' : '') + (joker ? ' joker' : '') + (selected ? ' sel' : '') + (className ? ' ' + className : '')}>
      {joker
        ? <span className="jk">{card === 'bj' ? '大王' : '小王'}</span>
        : <><span className={'r' + (card.length > 2 ? ' ten' : '')}>{card.slice(0, -1)}</span><span className="s">{suit}</span></>}
    </div>
  );
}
