import { useEffect, useRef, useState } from 'react';

// 牌桌表情 + 快捷嘲讽：坐下的人随时点一个，自己的座位旁就冒出来，全桌
// 都看得见，停留约 4 秒。服务器只认这张清单里的值（worker/games/reactions.js，两边保持一致）。
export const REACTION_EMOJIS = ['😏', '🤣', '😂', '🙄', '🥱', '😴', '😤', '🐢', '💩', '🤡', '👎', '👍', '🔥', '💣', '⏰', '😱', '😭', '🤑', '🐶', '👻'];
export const REACTION_PHRASES = [
  '给阿姨倒一杯卡布奇诺 ☕',
  '快点吧，我等到花儿都谢了',
  '就这？就这？',
  '你这牌打得也太好了吧',
  '我要报警了',
  '感谢老板，老板大气',
  '这把我稳了',
  '不服来战',
  '溜了溜了',
  '再来一把！',
];
const isPhrase = v => v && v.length > 2;

// 座位旁冒出来的气泡：单个 emoji 放大，整句话是白色小气泡。
// value 是服务器发来的 { v, at }；span 用 at 做 key —— 同一个座位连发
// 表情时元素必须换新，CSS 动画才会重新播。不换的话动画停在最后一帧
// （透明），后面的表情全都看不见（"按几次就不行了"的元凶）。
export function ReactBubble({ value }) {
  if (!value) return null;
  const { v, at } = typeof value === 'string' ? { v: value, at: value } : value;
  return isPhrase(v)
    ? <span key={at} className="gt-react gt-react-text">{v}</span>
    : <span key={at} className="gt-react gt-react-emoji">{v}</span>;
}

// 右下角的表情钮 + 面板（坐下才渲染）。点完自己这里也回显一个气泡，
// 不用等服务器绕一圈——尤其川麻自己的座位没有座位框，全靠这个回显。
export function ReactionBar({ send, seated }) {
  const [open, setOpen] = useState(false);
  const [echo, setEcho] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!seated) return null;
  const pick = v => {
    send({ type: 'react', value: v });
    setOpen(false);
    setEcho({ v, at: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setEcho(null), 3000);
  };
  return (
    <div className="fixed right-3 z-[65] flex flex-col items-end gap-2" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
      {echo && <div className="relative mr-1"><ReactBubble value={echo} /></div>}
      {open && (
        <div className="glass-sheet rounded-3xl p-3 w-[19rem] max-w-[86vw]">
          <div className="grid grid-cols-5 gap-1">
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => pick(e)} className="text-[26px] leading-none py-1.5 rounded-xl hover:bg-white/70 active:scale-90 transition">{e}</button>
            ))}
          </div>
          <div className="border-t border-slate-900/10 mt-2 pt-2 flex flex-col">
            {REACTION_PHRASES.map(p => (
              <button key={p} onClick={() => pick(p)} className="text-left text-sm font-medium text-slate-700 px-2 py-1.5 rounded-lg hover:bg-white/70 active:scale-[.98] transition">{p}</button>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label="发表情"
        className="glass-sheet w-12 h-12 rounded-full text-[22px] grid place-items-center active:scale-90 transition">
        😆
      </button>
    </div>
  );
}
