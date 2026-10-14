import { CATEGORIES } from './categories.js';

// 选好的愿望：点一下在 想要 → 不要 → 随便 之间切换
const NEXT = { love: 'nope', nope: undefined, undefined: 'love' };
const BADGE = { love: '💖 想要', nope: '🙅 不要' };

export default function WishGrid({ picks, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {CATEGORIES.map(c => {
        const v = picks[c.id];
        return (
          <button key={c.id} onClick={() => { const n = { ...picks }; const nx = NEXT[v]; if (nx) n[c.id] = nx; else delete n[c.id]; onChange(n); }}
            className={'angel-tile ' + (v || 'meh')} style={v === 'love' ? { background: `linear-gradient(135deg, ${c.from}, ${c.to})` } : undefined}>
            <span className="text-3xl">{c.emoji}</span>
            <span className="font-bold text-sm mt-1">{c.name}</span>
            <span className="angel-badge">{BADGE[v] || '随便'}</span>
          </button>
        );
      })}
    </div>
  );
}
