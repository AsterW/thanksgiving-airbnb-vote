import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SessionProvider, useSession } from './session/SessionContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Splash from './components/Splash.jsx';
import { Sidebar, BottomNav } from './components/Nav.jsx';
import Header from './components/Header.jsx';
import AccountButton from './components/AccountButton.jsx';
import LoginModal from './components/LoginModal.jsx';
import HuntView from './features/hunt/HuntView.jsx';
import SplitView from './features/split/SplitView.jsx';
import GamesView from './features/games/GamesView.jsx';
import FoodView from './features/food/FoodView.jsx';
import AngelView from './features/angel/AngelView.jsx';
import FlightsView from './features/flights/FlightsView.jsx';
import ActivitiesView from './features/activities/ActivitiesView.jsx';
import CalendarView from './features/calendar/CalendarView.jsx';
import { useHashRoute } from './lib/useHashRoute.js';

// 每个页面一直挂着（切走只是藏起来），回来时房源、地图、牌桌都还在；切回来时淡入一下。
// animKey 变了（比如在选房/餐厅页切换行程）时，内容再柔和上浮一次，换清单不闪烁
function replayEnter(el, cls) {
  el.classList.remove('view-enter', 'trip-enter');
  void el.offsetWidth;
  el.classList.add(cls);
}
function Pane({ active, animKey, children }) {
  const ref = useRef(null);
  const prev = useRef(null);
  const defer = useRef({ raf: 0, timer: 0 });
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = { active, animKey };
    if (!before || !active || !ref.current) return;
    if (!before.active) { replayEnter(ref.current, 'view-enter'); return; }
    if (before.animKey === animKey) return;
    // 切行程和切标签页不一样：新行程的内容要在这一帧大改（价格重排、
    // 地图钉子全量重建、取景重置，都在随后的被动 effect 里跑）。转场
    // 动画要是和这波重建同时开跑，模糊的每一帧都在重绘正在变的内容，
    // 就是选房页切行程时那个回弹卡；其他页切回来内容不动，所以顺。
    // 解法：先把面板藏一瞬（.trip-pre），推迟两帧等新内容画完、钉子
    // 建完，再在静止的画面上开始转场。
    const el = ref.current;
    cancelAnimationFrame(defer.current.raf);
    clearTimeout(defer.current.timer);
    el.classList.add('trip-pre');
    defer.current.timer = setTimeout(() => el.classList.remove('trip-pre'), 400); // 兜底：rAF 没跑成也不能把面板留黑
    defer.current.raf = requestAnimationFrame(() => {
      defer.current.raf = requestAnimationFrame(() => {
        clearTimeout(defer.current.timer);
        el.classList.remove('trip-pre');
        replayEnter(el, 'trip-enter');
      });
    });
  }, [active, animKey]);
  useEffect(() => () => { cancelAnimationFrame(defer.current.raf); clearTimeout(defer.current.timer); }, []);
  return <div ref={ref} hidden={!active}>{children}</div>;
}

function Shell() {
  const [{ trip, view }, setRoute] = useHashRoute();
  const { name, openLogin } = useSession();
  const [splashDone, setSplashDone] = useState(false);
  const askedOnce = useRef(false);

  // 开场动画收走后，还没登录的人弹一次登录框
  useEffect(() => {
    if (!splashDone || askedOnce.current) return;
    askedOnce.current = true;
    if (!name) openLogin();
  }, [splashDone, name, openLogin]);

  const goView = v => { if (v === view) return; setRoute({ view: v }); window.scrollTo({ top: 0 }); };

  return (
    <div className="md:flex min-h-screen">
      <Splash onDone={() => setSplashDone(true)} />
      <Sidebar view={view} onView={goView} />
      <BottomNav view={view} onView={goView} />
      <div className="flex-1 min-w-0 pb-24 md:pb-0">
        <Header view={view} trip={trip} onTrip={t => setRoute({ trip: t })} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Pane active={view === 'calendar'}><CalendarView active={view === 'calendar'} /></Pane>
          <Pane active={view === 'hunt'} animKey={trip}><HuntView trip={trip} active={view === 'hunt'} /></Pane>
          <Pane active={view === 'food'} animKey={trip}><FoodView trip={trip} active={view === 'food'} /></Pane>
          <Pane active={view === 'split'}><SplitView active={view === 'split'} /></Pane>
          <Pane active={view === 'games'}><GamesView active={view === 'games'} /></Pane>
          <Pane active={view === 'angel'}><AngelView active={view === 'angel'} /></Pane>
          <Pane active={view === 'flights'}><FlightsView active={view === 'flights'} /></Pane>
          <Pane active={view === 'activities'}><ActivitiesView active={view === 'activities'} /></Pane>
          <p className="md:hidden text-center text-slate-400 text-sm mt-10 mb-6">有链接的人都能加房源、投票、记账 · 数据实时共享</p>
        </main>
      </div>
      <AccountButton />
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </SessionProvider>
  );
}
