import './cards.css';

// 一张扑克牌（斗地主、掼蛋）。card 为 null 是背面；'sj' / 'bj' 是小王 / 大王。
// 掼蛋两副牌，id 末尾多一位第几副（'10♥1'、'sj2'），显示时去掉。
// wild：掼蛋的逢人配（红心级牌），角上标个「配」。其他属性（比如手牌里的 data-i）原样放到牌上。
export const faceOf = card => (/[♠♥♣♦j][12]$/.test(card) ? card.slice(0, -1) : card);

export default function PlayingCard({ card, size = '', selected, wild, className = '', ...rest }) {
  if (!card) return <div {...rest} className={'pc back ' + size} />;
  const face = faceOf(card);
  const joker = face === 'sj' || face === 'bj';
  const suit = joker ? '' : face.slice(-1);
  const rank = joker ? '' : face.slice(0, -1);
  const red = face === 'bj' || suit === '♥' || suit === '♦';
  return (
    <div {...rest} className={'pc ' + size + (red ? ' red' : '') + (joker ? ' joker' : '') + (selected ? ' sel' : '') + (className ? ' ' + className : '')}>
      {joker
        ? <span className="jk">{face === 'bj' ? '大王' : '小王'}</span>
        : <><span className={'r' + (rank.length > 1 ? ' ten' : '')}>{rank}</span><span className="s">{suit}</span>{wild && <span className="w">配</span>}</>}
    </div>
  );
}

// 出的一手牌：小牌叠在一起
export function CardRun({ cards, isWild }) {
  return <div className="pc-run">{cards.map(c => <PlayingCard key={c} card={c} size="sm" wild={isWild?.(c)} />)}</div>;
}
