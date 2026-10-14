import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { confetti, CONFETTI_COLORS } from '../../lib/confetti.js';
import { reduceMotion } from '../../lib/motion.js';
import { HZ } from '../../../../worker/dodge/sim.js';
import DodgeGame, { killedBy } from './DodgeGame.jsx';
import './dodge.css';

// 鲁班七号躲技能：一个人玩，活得越久越好，全时间排行榜。
// 手机上开打就全屏、锁成横屏（安卓）；锁不了的（iPhone）竖着拿就提示横过来，并且先暂停。
const secs = ticks => (ticks / HZ).toFixed(1);
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const PORTRAIT = '(orientation: portrait)';

async function enterFull() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (e) { /* not allowed here (iPhone) */ }
  try { await window.screen.orientation?.lock?.('landscape'); } catch (e) { /* not allowed here */ }
}
function leaveFull() {
  try { window.screen.orientation?.unlock?.(); } catch (e) { /* fine */ }
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

export default function DodgeView({ active }) {
  const { name, ensureName } = useSession();
  const [board, setBoard] = useState([]);
  const [run, setRun] = useState(null);      // { run, seed, n } while playing
  const [result, setResult] = useState(null); // { ticks, by, server?, error? }
  const [msg, setMsg] = useState('');
  const [touch] = useState(isTouch);
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT).matches);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false); // the 3-2-1 is over and the run is going

  const loadBoard = useCallback(() => api('/api/dodge/board').then(r => r.ok && setBoard(r.board)).catch(() => {}), []);
  useEffect(() => { if (active) loadBoard(); }, [active, loadBoard]);
  useEffect(() => {
    const q = window.matchMedia(PORTRAIT), f = () => setPortrait(q.matches);
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  // leaving the page, switching apps or turning the phone upright pauses the run
  const playing = run && !result;
  useEffect(() => { if (playing && (!active || (touch && portrait))) setPaused(true); }, [playing, active, touch, portrait]);
  // turned sideways before the run got going: just start, no 继续 needed
  useEffect(() => { if (playing && !started && active && !(touch && portrait)) setPaused(false); }, [playing, started, active, touch, portrait]);
  useEffect(() => {
    const f = () => { if (document.hidden && playing) setPaused(true); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [playing]);
  const full = touch && !!run;
  useEffect(() => {
    if (!full) return;
    document.documentElement.classList.add('dg-lock');
    return () => document.documentElement.classList.remove('dg-lock');
  }, [full]);

  function start() {
    if (touch) enterFull(); // must happen right on the tap
    setMsg('');
    ensureName(async me => {
      let r;
      try { r = await api('/api/dodge/start', 'POST', { name: me.name, token: me.token }); } catch (e) { r = { ok: false, error: '网络有点问题，稍后再试' }; }
      if (!r.ok) { setMsg(r.error); return; }
      setResult(null); setPaused(false); setStarted(false);
      setRun(x => ({ run: r.run, seed: r.seed, n: (x?.n || 0) + 1 }));
    });
  }
  async function dead(sim, events) {
    setResult({ ticks: sim.tick, by: sim.by });
    let r;
    try { r = await api('/api/dodge/finish', 'POST', { run: run.run, events }); } catch (e) { r = { ok: false, error: '网络有点问题，这局没记上' }; }
    setResult(x => ({ ...x, server: r.ok ? r : null, error: r.ok ? '' : r.error }));
    if (r.ok) {
      setBoard(r.board);
      if (r.newBest && !reduceMotion) confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    }
  }
  function quit() { setRun(null); setResult(null); setPaused(false); if (touch) leaveFull(); loadBoard(); }

  const mine = board.find(r => name && r.name.toLowerCase() === name.toLowerCase());
  const overlay = result && (
    <div className="dg-over">
      <div className="text-2xl font-extrabold">阵亡！存活 {secs(result.server?.ticks ?? result.ticks)} 秒</div>
      <div className="text-sm mt-1 text-slate-200">{killedBy(result.by)}</div>
      <div className="text-sm mt-2 min-h-[1.25rem] text-amber-200">
        {result.server ? (result.server.newBest ? `🎉 新纪录！排第 ${result.server.rank} 名` : `你的最好 ${secs(result.server.best)} 秒 · 第 ${result.server.rank} 名`)
          : result.error || '记分中…'}
      </div>
      <div className="flex gap-2 justify-center mt-3">
        <button onClick={start} className="dg-btn bg-amber-400 text-slate-900">再来一局</button>
        <button onClick={quit} className="dg-btn bg-white/15 text-white">{touch ? '退出' : '看排行榜'}</button>
      </div>
    </div>
  );
  const pause = paused && !result && (
    <div className="dg-over">
      {touch && portrait
        ? <><div className="text-4xl">📱↻</div><div className="text-lg font-bold mt-2">把手机横过来</div><div className="text-sm text-slate-300 mt-1">横屏才能玩，转过来就能继续</div></>
        : <><div className="text-lg font-bold">暂停了</div><button onClick={() => setPaused(false)} className="dg-btn bg-amber-400 text-slate-900 mt-3">继续</button></>}
      <button onClick={quit} className="dg-btn bg-white/15 text-white mt-2">不玩了</button>
    </div>
  );
  // the first run on an upright phone: wait for it to be turned before counting down
  const hold = paused || (touch && portrait);
  const game = run && (
    <DodgeGame key={run.n} seed={run.seed} touch={touch} hold={hold} onGo={() => setStarted(true)} onDead={dead} onPause={() => setPaused(true)}>
      {overlay}{pause}
    </DodgeGame>
  );

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-5">
        <section className={run && !touch ? "lg:col-span-3" : "lg:col-span-2"}>
          {run && !touch ? <div className="dg-box">{game}</div> : (
            <div className="dg-intro rounded-2xl shadow-xl p-5 md:p-7 text-white">
              <div className="text-2xl md:text-3xl font-extrabold">🎯 鲁班七号 · 躲技能</div>
              <p className="mt-2 text-emerald-50/90">钟馗的钩子、安琪拉的火球、王昭君的冰、小乔的扇子、后羿的大鸟、姜子牙的激光……全冲着鲁班来。被打中一下就阵亡，活得越久越好，越往后技能越多越快。</p>
              <ul className="mt-3 text-sm text-emerald-50/90 space-y-1">
                {touch
                  ? <><li>📱 横屏全屏玩：左手摇杆走位，右手「闪现」</li><li>闪现朝摇杆方向跳一段，8 秒冷却</li></>
                  : <><li>🖱️ 鼠标右键点哪走哪（按住右键会一直跟着鼠标）</li><li>⌨️ F 或 D 闪现，朝鼠标方向跳一段，8 秒冷却</li></>}
                <li>地上先出现提示（线、圈、框），然后技能才放出来</li>
              </ul>
              {mine && <p className="mt-3 text-amber-200 font-bold">你的最好：{secs(mine.ticks)} 秒</p>}
              <button onClick={start} className="dg-btn bg-amber-400 text-slate-900 mt-4 text-lg">开始</button>
              {msg && <p className="mt-2 text-sm text-amber-200">{msg}</p>}
            </div>
          )}
        </section>
        <aside className="glass-card rounded-2xl p-5 self-start">
          <h2 className="font-bold text-lg mb-1">🏆 躲技能排行榜</h2>
          <p className="text-xs text-slate-500 mb-3">每人最好的一次 · 成绩由服务器重放验证</p>
          {board.length ? board.map((r, i) => (
            <div key={r.name} className={'flex items-center justify-between gap-2 border-b py-1.5 text-sm' + (mine && r.name === mine.name ? ' font-bold text-indigo-700' : '')}>
              <span className="truncate">{i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.'} {r.name}</span>
              <span className="tabular-nums whitespace-nowrap">{secs(r.ticks)} 秒<span className="text-xs font-normal text-slate-400"> · {r.runs} 局</span></span>
            </div>
          )) : <p className="text-sm text-slate-400">还没人玩过，来当第一</p>}
        </aside>
      </div>
      {full && createPortal(<div className="dg-full">{game}</div>, document.body)}
    </div>
  );
}
