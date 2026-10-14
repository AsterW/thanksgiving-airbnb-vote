import { useState } from 'react';
import { confetti, CONFETTI_COLORS } from '../../lib/confetti.js';
import { reduceMotion } from '../../lib/motion.js';
import { load, save } from '../../lib/storage.js';
import { byId } from './categories.js';

// 抽签结果：一个信封，点开翻过来看你要送礼物给谁，以及 ta 的愿望
export default function RevealCard({ master, drawnAt, me }) {
  const seenKey = 'angelSeen:' + me + ':' + drawnAt;
  const [open, setOpen] = useState(() => load(seenKey) === '1');
  // 「拆没拆过」是按每一次抽签分别记的（seenKey 里带着抽签时间）。但
  // useState 的初始值只在组件挂载时算一次：面板是常驻不卸载的，重新
  // shuffle 后父组件只是换了新数据重渲染，这个组件还活着，open 就
  // 带着上一轮的 true，新结果直接摊开显示人名。所以在渲染期对齐：
  // seenKey 变了就按新一轮的记录重算 open，新信封回到封口状态。
  const [keyFor, setKeyFor] = useState(seenKey);
  if (keyFor !== seenKey) {
    setKeyFor(seenKey);
    setOpen(load(seenKey) === '1');
  }
  const prefs = master.prefs;
  const loves = prefs ? Object.entries(prefs.picks).filter(([, v]) => v === 'love').map(([k]) => byId[k]).filter(Boolean) : [];
  const nopes = prefs ? Object.entries(prefs.picks).filter(([, v]) => v === 'nope').map(([k]) => byId[k]).filter(Boolean) : [];

  function reveal() {
    if (open) return;
    setOpen(true); save(seenKey, '1');
    if (!reduceMotion) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.45 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 30, spread: 70, origin: { y: 0.45 }, shapes: [confetti.shapeFromText({ text: '😇', scalar: 2 })], scalar: 2 });
    }
  }

  return (
    <section className="angel-reveal-wrap">
      <div className={'angel-reveal' + (open ? ' open' : '')} onClick={reveal} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && reveal()}>
        <div className="face front">
          <div className="text-6xl mb-3">💌</div>
          <div className="text-xl font-black">你的 Secret Angel 任务</div>
          <div className="text-sm opacity-80 mt-2">点一下拆开（别让旁边的人偷看 🤫）</div>
        </div>
        <div className="face back">
          <div className="text-sm text-indigo-500 font-bold tracking-widest">你要偷偷送礼物给</div>
          <div className="text-4xl font-black my-2 bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">{master.name}</div>
          {prefs ? (
            <div className="text-left w-full mt-2 space-y-2">
              {loves.length > 0 && <div><span className="text-xs font-bold text-rose-600">💖 ta 想要</span><div className="flex flex-wrap gap-1.5 mt-1">{loves.map(c => <span key={c.id} className="angel-pill">{c.emoji} {c.name}</span>)}</div></div>}
              {nopes.length > 0 && <div><span className="text-xs font-bold text-slate-500">🙅 别送</span><div className="flex flex-wrap gap-1.5 mt-1">{nopes.map(c => <span key={c.id} className="angel-pill nope">{c.emoji} {c.name}</span>)}</div></div>}
              {prefs.note && <div className="text-sm bg-amber-50 rounded-xl px-3 py-2">📝 {prefs.note}</div>}
            </div>
          ) : <div className="text-sm text-slate-500">ta 还没写愿望</div>}
        </div>
      </div>
    </section>
  );
}
