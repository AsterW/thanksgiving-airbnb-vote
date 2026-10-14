import { VIEWS } from '../lib/config.js';
import './nav.css';

// 左侧导航（md 以上）
export function Sidebar({ view, onView }) {
  return (
    <aside id="sidebar" className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 text-white px-4 py-6">
      <div className="px-2 mb-8">
        <div className="text-3xl mb-2">🦃</div>
        <div className="font-extrabold text-lg leading-tight">Denver 感恩节之旅</div>
        <div className="text-xs text-indigo-200 mt-1">Thanksgiving 2026 · 大家一起</div>
      </div>
      <nav className="flex flex-col gap-2" aria-label="主导航">
        {Object.entries(VIEWS).map(([k, v]) => (
          <button key={k} className={'nav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
            <span className="nav-ico">{v.icon}</span>
            <span className="font-bold">{v.nav}<span className="nav-sub">{v.navSub}</span></span>
          </button>
        ))}
      </nav>
      <p className="mt-auto px-2 text-xs text-indigo-200/80 leading-relaxed">有链接的人都能加房源、投票、记账 · 数据实时共享</p>
    </aside>
  );
}

// 手机底部标签栏
export function BottomNav({ view, onView }) {
  return (
    <nav id="bottomNav" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex" aria-label="主导航">
      {Object.entries(VIEWS).map(([k, v]) => (
        <button key={k} className={'bnav-item' + (k === view ? ' active' : '')} aria-current={k === view ? 'page' : undefined} onClick={() => onView(k)}>
          <span className="nav-ico">{v.icon}</span>{v.nav}
        </button>
      ))}
    </nav>
  );
}
