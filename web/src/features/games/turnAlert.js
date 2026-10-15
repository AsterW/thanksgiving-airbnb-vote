import { useEffect, useRef } from 'react';
import { load, save } from '../../lib/storage.js';

// 轮到你了的提醒（牌桌游戏用）：轮到你时「叮咚」一声、手机震一下（iPhone 的网页不能震）；
// 最后 5 秒每秒滴一声，第 5 秒再震一下；页面在后台时标签页标题闪「🔔 轮到你了！」。
// 声音可以关（🔔/🔕，记在 localStorage 的 turnAlert）。浏览器只允许点过页面之后出声，
// 所以点牌桌任何地方都会 unlock()。
const KEY = 'turnAlert';
let ctx = null;

export const alertsOn = () => load(KEY) !== 'off';
export const setAlertsOn = on => save(KEY, on ? '' : 'off');

export function unlock() {
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
}

function beep(freq, at, dur, peak) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at); o.stop(at + dur + 0.02);
}
const buzz = pattern => { try { navigator.vibrate?.(pattern); } catch (e) { /* not on this phone */ } };
const sound = () => alertsOn() && ctx && ctx.state === 'running';

// 叮咚
export function turnStarts() {
  if (!alertsOn()) return;
  buzz([120, 80, 120]);
  if (!sound()) return;
  const t = ctx.currentTime + 0.01;
  beep(784, t, 0.2, 0.2);
  beep(1175, t + 0.16, 0.32, 0.2);
}
// 滴（最后一秒高一点）
export function hurry(secs) {
  if (!alertsOn()) return;
  if (secs === 5) buzz(220);
  if (!sound()) return;
  beep(secs <= 1 ? 1320 : 880, ctx.currentTime + 0.01, 0.09, 0.16);
}

// turnKey：轮到你的这一回合的标识（比如这回合的截止时间），不是你的回合时为 0/null；
// 换了个新的值就是又轮到你了（叫完地主接着出牌也算新的一回合）。left：还剩几秒。
export function useTurnAlert(turnKey, left) {
  const last = useRef(null), ticked = useRef(null);
  useEffect(() => {
    if (turnKey && turnKey !== last.current) { ticked.current = null; turnStarts(); }
    last.current = turnKey || null;
  }, [turnKey]);
  useEffect(() => {
    if (turnKey && left != null && left >= 1 && left <= 5 && ticked.current !== left) { ticked.current = left; hurry(left); }
  }, [turnKey, left]);
  // 页面在后台（切到别的标签页/App）时，标题一闪一闪
  const mine = !!turnKey;
  useEffect(() => {
    if (!mine) return;
    const base = document.title;
    let on = false;
    const id = setInterval(() => {
      if (document.hidden) { on = !on; document.title = on ? '🔔 轮到你了！' : base; }
      else if (document.title !== base) document.title = base;
    }, 1000);
    return () => { clearInterval(id); document.title = base; };
  }, [mine]);
}
