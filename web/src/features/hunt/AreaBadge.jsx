import { useEffect, useRef, useState } from 'react';

// 卡片左上角的区域标签。点开可以改：选一个已有的区域，或者输入新名字（会多出一个标签页）
export default function AreaBadge({ area, zones, onChange }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = a => { setOpen(false); setText(''); if (a !== area) onChange(a); };
  return (
    <div ref={box} className="absolute top-3 left-3 z-10">
      <button onClick={() => setOpen(!open)} title="改区域"
        className={'text-xs px-2 py-1 rounded-full text-white ' + (area ? 'bg-black/60 hover:bg-black/75' : 'bg-black/40 hover:bg-black/60 border border-dashed border-white/70')}>
        {area || '📍 设置区域'} <span className="opacity-70">▾</span>
      </button>
      {open && (
        <div className="mt-1 w-56 glass-sheet rounded-xl p-2 text-sm text-slate-700">
          <div className="max-h-48 overflow-auto">
            {zones.map(z => (
              <button key={z} onClick={() => pick(z)} className={'block w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-50 ' + (z === area ? 'font-bold text-indigo-600' : '')}>
                {z === area ? '✓ ' : ''}{z}
              </button>
            ))}
          </div>
          <form className="flex gap-1 mt-1 border-t pt-2" onSubmit={e => { e.preventDefault(); if (text.trim()) pick(text.trim()); }}>
            <input value={text} onChange={e => setText(e.target.value)} maxLength={30} placeholder="新区域，比如 Breckenridge" className="flex-1 min-w-0 border rounded-lg px-2 py-1" />
            <button className="bg-indigo-600 text-white rounded-lg px-2">加</button>
          </form>
          {area && <button onClick={() => pick('')} className="mt-1 text-xs text-slate-400 hover:text-rose-600 px-2">清除区域</button>}
        </div>
      )}
    </div>
  );
}
