import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV_MORE, NAV_PRIMARY, VIEWS } from '../lib/config.js';
import { reduceMotion } from '../lib/motion.js';
import './nav.css';

// 「更多」的圆形展开菜单：从触发按钮的位置扇形弹出一圈玻璃泡泡。
// dir='up' 往上扇（手机底栏），dir='right' 往右扇（桌面侧栏）。
// 点泡泡跳转，点别处 / Esc / 窗口缩放就收起；当前页的泡泡是品牌渐变色。
function RadialFan({ center, dir, view, onPick, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onClose); };
  }, [onClose]);
  if (!center) return null;
  const R = 118;
  const angles = dir === 'up' ? [160, 113, 67, 20] : [-66, -22, 22, 66];
  return (
    <>
      <div className="radial-backdrop" onClick={onClose} />
      <div className="radial-fan" style={{ left: center.x, top: center.y }} role="menu" aria-label="更多页面">
        {NAV_MORE.map((k, i) => {
          const a = angles[i] * Math.PI / 180;
          const dx = Math.round(R * Math.cos(a));
          const dy = Math.round(dir === 'up' ? -R * Math.sin(a) : R * Math.sin(a));
          return (
            <button key={k} role="menuitem" className={'radial-item' + (k === view ? ' on' : '')}
              style={{ '--dx': dx + 'px', '--dy': dy + 'px', animationDelay: reduceMotion ? '0ms' : (i * 35) + 'ms' }}
              onClick={() => { onPick(k); onClose(); }}>
              <span className="radial-bubble">{VIEWS[k].icon}</span>
              <span className="radial-label">{VIEWS[k].nav}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// 触发按钮的开/关状态：记住展开原点（按钮的位置），切页时自动收起
function useFan(dir) {
  const btn = useRef(null);
  const [center, setCenter] = useState(null);
  const toggle = useCallback(() => {
    if (center) { setCenter(null); return; }
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setCenter(dir === 'up'
      ? { x: Math.min(Math.max(r.left + r.width / 2, 128), window.innerWidth - 128), y: r.top - 6 }
      : { x: r.right + 4, y: r.top + r.height / 2 });
  }, [center, dir]);
  const close = useCallback(() => setCenter(null), []);
  return { btn, center, toggle, close };
}

// 左侧导航（md 以上）
export function Sidebar({ view, onView }) {
  const fan = useFan('right');
  const inMore = NAV_MORE.includes(view);
  useEffect(() => { fan.close(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = VIEWS[view];
  return (
    <>
      <aside id="sidebar" className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 px-4 py-6">
        <div className="px-2 mb-8">
          <div className="text-3xl mb-2">🦃</div>
          <div className="font-extrabold text-lg leading-tight">Denver 感恩节之旅</div>
          <div className="text-xs text-slate-500 mt-1">Thanksgiving 2026 · 大家一起</div>
        </div>
        <nav className="flex flex-col gap-2" aria-label="主导航">
          {NAV_PRIMARY.map(k => (
            <button key={k} className={'nav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
              <span className="nav-ico">{VIEWS[k].icon}</span>
              <span className="font-bold">{VIEWS[k].nav}<span className="nav-sub">{VIEWS[k].navSub}</span></span>
            </button>
          ))}
          <button ref={fan.btn} className={'nav-item' + (inMore ? ' active' : '')} aria-current={inMore ? 'page' : undefined}
            aria-haspopup="menu" aria-expanded={!!fan.center} onClick={fan.toggle}>
            <span className="nav-ico">{inMore ? cur.icon : '＋'}</span>
            <span className="font-bold">{inMore ? cur.nav : 'More'}<span className="nav-sub">{inMore ? cur.navSub : 'Calendar · 游戏 · 天使 · 分账'}</span></span>
          </button>
        </nav>
        <p className="mt-auto px-2 text-xs text-slate-500 leading-relaxed">有链接的人都能加房源、投票、记账 · 数据实时共享</p>
      </aside>
      <RadialFan center={fan.center} dir="right" view={view} onPick={onView} onClose={fan.close} />
    </>
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
  const fan = useFan('up');
  const inMore = NAV_MORE.includes(view);
  useEffect(() => { fan.close(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = VIEWS[view];
  return (
    <>
      <div id="bottomNav" className="md:hidden fixed z-40">
        <nav ref={strip} onScroll={measure} className={'bnav-strip' + (more.l ? ' more-l' : '') + (more.r ? ' more-r' : '')} aria-label="主导航">
          {NAV_PRIMARY.map(k => (
            <button key={k} className={'bnav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
              <span className="nav-ico">{VIEWS[k].icon}</span>{VIEWS[k].nav}
            </button>
          ))}
          <button ref={fan.btn} className={'bnav-item' + (inMore ? ' active' : '')} aria-current={inMore ? 'page' : undefined}
            aria-haspopup="menu" aria-expanded={!!fan.center} onClick={fan.toggle}>
            <span className="nav-ico">{inMore ? cur.icon : '＋'}</span>{inMore ? cur.nav : 'More'}
          </button>
        </nav>
      </div>
      <RadialFan center={fan.center} dir="up" view={view} onPick={onView} onClose={fan.close} />
    </>
  );
}
