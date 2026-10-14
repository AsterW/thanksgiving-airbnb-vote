import { useEffect, useRef, useState } from 'react';
import { reduceMotion } from '../lib/motion.js';
import { save } from '../lib/storage.js';
import './splash.css';

// 开场动画（每个会话一次，点一下可跳过）：逐字出现的标题 + 飘落的枫叶，
// 播完（或被点掉）后整块往上收走。onDone 在幕布收到一半时调用（这时可以弹登录框了）。
const TITLE = 'Denver 感恩节之旅';
const LEAVES = ['🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂'];
const root = document.documentElement;

export default function Splash({ onDone }) {
  const [shown] = useState(() => root.classList.contains('splash')); // <head> 里的脚本决定这次要不要播
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(!shown);
  const [leaves] = useState(() => LEAVES.map(leaf => ({
    leaf,
    style: {
      left: (5 + Math.random() * 90) + '%', fontSize: (16 + Math.random() * 18) + 'px',
      animationDuration: (3 + Math.random() * 2.5) + 's', animationDelay: (Math.random() * 1.8) + 's',
      '--dx': (Math.random() * 160 - 80) + 'px', '--rot': (Math.random() * 540 - 270) + 'deg',
    },
  })));
  const done = useRef(onDone);
  const leaveRef = useRef(() => {});
  done.current = onDone;

  useEffect(() => {
    if (!shown) { done.current(); return; }
    save('splashSeen', '1', 'session');
    let left = false;
    const timers = [];
    const leave = () => {
      if (left) return;
      left = true;
      setLeaving(true);
      root.classList.remove('splash-lock'); // 恢复页面滚动
      timers.push(setTimeout(() => { setGone(true); root.classList.remove('splash'); }, 850));
      timers.push(setTimeout(() => done.current(), 450));
      removeEventListener('keydown', leave);
    };
    timers.push(setTimeout(leave, reduceMotion ? 700 : 2900));
    addEventListener('keydown', leave);
    leaveRef.current = leave;
    return () => { timers.forEach(clearTimeout); removeEventListener('keydown', leave); };
  }, [shown]);

  if (gone) return null;
  return (
    <div id="splash" className={leaving ? 'leave' : ''} role="presentation" aria-hidden="true" onClick={() => leaveRef.current()}>
      <div className="sp-sun"></div>
      <svg className="sp-mtn m1" viewBox="0 0 1440 360" preserveAspectRatio="none" style={{ height: '46vh' }}><path fill="#6d28d9" fillOpacity=".55" d="M0 250 L120 170 L230 220 L360 110 L470 190 L600 90 L720 180 L840 70 L980 200 L1100 120 L1220 190 L1340 100 L1440 160 L1440 360 L0 360Z" /></svg>
      <svg className="sp-mtn m2" viewBox="0 0 1440 360" preserveAspectRatio="none" style={{ height: '36vh' }}><path fill="#4c1d95" d="M0 280 L150 190 L260 250 L400 150 L520 230 L660 140 L800 240 L930 160 L1060 250 L1190 170 L1320 240 L1440 200 L1440 360 L0 360Z" /><path className="sp-snow" fill="#fff" fillOpacity=".85" d="M400 150 L372 168 L392 166 L404 178 L418 164 L432 172Z M660 140 L630 160 L652 158 L664 170 L678 156 L694 164Z M930 160 L902 178 L922 176 L934 188 L948 174 L962 180Z M1190 170 L1164 186 L1182 184 L1194 196 L1206 182 L1220 188Z" /></svg>
      <svg className="sp-mtn m3" viewBox="0 0 1440 360" preserveAspectRatio="none" style={{ height: '24vh' }}><path fill="#1e1b4b" d="M0 300 L90 250 L200 290 L320 230 L430 280 L560 220 L700 290 L820 240 L960 300 L1080 250 L1210 290 L1330 240 L1440 270 L1440 360 L0 360Z" /></svg>
      <div className="sp-content">
        <div className="sp-turkey">🦃</div>
        <div className="sp-title">
          {Array.from(TITLE).map((c, i) => <span key={i} style={{ animationDelay: (0.7 + i * 0.06).toFixed(2) + 's' }}>{c}</span>)}
        </div>
        <div className="sp-sub">11月25–29 · 选房 · 投票 · 分账 · 大家一起</div>
        <div className="sp-bar"><i></i></div>
      </div>
      <div className="sp-skip">点击任意处跳过</div>
      {leaves.map((l, i) => <span key={i} className="sp-leaf" style={l.style}>{l.leaf}</span>)}
    </div>
  );
}
