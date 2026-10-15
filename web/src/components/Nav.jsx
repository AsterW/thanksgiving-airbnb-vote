import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV_GROUPS, VIEWS } from '../lib/config.js';
import NavIcon from './NavIcon.jsx';
import { reduceMotion } from '../lib/motion.js';
import './nav.css';

// 左侧导航（md 以上）：按 config 里的分组和顺序全摆出来，每组上面一个小组名
export function Sidebar({ view, onView }) {
  return (
    <aside id="sidebar" className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 px-4 py-6">
      <div className="px-2 mb-8">
        <img src="/icon.svg" alt="" width="40" height="40" className="w-10 h-10 rounded-xl mb-3 shadow-md" />
        <div className="font-extrabold text-lg leading-tight">Denver 感恩节之旅</div>
        <div className="text-xs text-slate-500 mt-1">Thanksgiving 2026 · 大家一起</div>
      </div>
      <nav className="flex flex-col" aria-label="主导航">
        {NAV_GROUPS.map(([g, label]) => (
          <div key={g} className="nav-group">
            <div className="nav-group-label">{label}</div>
            {Object.entries(VIEWS).filter(([, v]) => v.group === g).map(([k, v]) => (
              <button key={k} className={'nav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
                <span className="nav-ico"><NavIcon name={v.icon} /></span>
                <span className="nav-name">{v.nav}</span>
                <span className="nav-sub">{v.navSub}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <p className="mt-auto px-2 text-xs text-slate-500 leading-relaxed">有链接的人都能加房源、投票、记账 · 数据实时共享</p>
    </aside>
  );
}

// 手机底部标签栏：放不下就左右划。哪边还有标签，哪边就淡出；当前页的标签总会滚到看得见的地方
export function BottomNav({ view, onView }) {
  const strip = useRef(null);
  const [more, setMore] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const n = strip.current;
    if (!n) return;
    const l = n.scrollLeft > 4, r = n.scrollLeft + n.clientWidth < n.scrollWidth - 4;
    setMore(m => (m.l === l && m.r === r ? m : { l, r }));
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  const first = useRef(true);
  useEffect(() => {
    const n = strip.current, b = n?.querySelector('[aria-current="page"]');
    if (b) n.scrollTo({ left: b.offsetLeft - (n.clientWidth - b.offsetWidth) / 2, behavior: first.current || reduceMotion ? 'auto' : 'smooth' });
    first.current = false;
  }, [view]);
  return (
    <div id="bottomNav" className="md:hidden fixed z-40">
      <nav ref={strip} onScroll={measure} className={'bnav-strip' + (more.l ? ' more-l' : '') + (more.r ? ' more-r' : '')} aria-label="主导航">
        {Object.entries(VIEWS).map(([k, v]) => (
          <button key={k} className={'bnav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
            <span className="nav-ico"><NavIcon name={v.icon} size={21} /></span>{v.nav}
          </button>
        ))}
      </nav>
    </div>
  );
}
