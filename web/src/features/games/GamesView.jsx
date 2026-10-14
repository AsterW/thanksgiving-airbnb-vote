import { useState } from 'react';
import { load, save } from '../../lib/storage.js';
import BlackjackView from '../blackjack/BlackjackView.jsx';
import DdzView from '../ddz/DdzView.jsx';

// Gameroom：几个小游戏放在一个标签页里，每个有自己的筹码 / 豆子榜。
// 每个游戏一直挂着（切走只是藏起来），各自按 active 决定连不连服务器。
const GAMES = [{ key: 'bj', label: '🃏 Blackjack' }, { key: 'ddz', label: '🀄 斗地主' }];

export default function GamesView({ active }) {
  const [game, setGame] = useState(() => (load('game') === 'ddz' ? 'ddz' : 'bj'));
  const pick = g => { setGame(g); save('game', g); };
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        {GAMES.map(g => (
          <button key={g.key} onClick={() => pick(g.key)}
            className={'rounded-full px-5 py-2 font-bold ' + (g.key === game ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-indigo-50')}>{g.label}</button>
        ))}
      </div>
      <div hidden={game !== 'bj'}><BlackjackView active={active && game === 'bj'} /></div>
      <div hidden={game !== 'ddz'}><DdzView active={active && game === 'ddz'} /></div>
    </>
  );
}
