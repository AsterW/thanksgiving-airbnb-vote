import { useEffect, useState } from 'react';
import { useSession } from '../session/SessionContext.jsx';

// 绑邮箱提醒：没绑邮箱的人每次登录成功后弹一次（关掉就等下次登录再弹，
// 绑上为止）。刷新页面恢复会话不算登录，不弹。"现在绑邮箱"直接打开
// 登录框的绑邮箱那一步。
export default function BindNag() {
  const { name, users, loginTick, loginOpen, openBind } = useSession();
  const [dismissedTick, setDismissedTick] = useState(0);
  const [shown, setShown] = useState(false);
  const me = name ? users.find(u => u.name === name) : null;
  const shouldNag = !!me && !me.emailBound && loginTick > 0 && dismissedTick < loginTick && !loginOpen;

  useEffect(() => {
    if (!shouldNag) { setShown(false); return; }
    const t = setTimeout(() => setShown(true), 550); // 等登录框收完再弹
    return () => clearTimeout(t);
  }, [shouldNag, loginTick]);

  if (!shouldNag) return null;
  const dismiss = () => { setShown(false); setDismissedTick(loginTick); };
  const bindNow = () => { dismiss(); openBind(); };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center z-[60] px-4"
      style={{ transition: 'opacity .2s ease', opacity: shown ? 1 : 0, pointerEvents: shown ? 'auto' : 'none' }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="glass-sheet relative rounded-[28px] px-6 py-6 w-full max-w-sm"
        style={{ transition: 'transform .25s cubic-bezier(.2,1.4,.4,1), opacity .2s ease', transform: shown ? 'scale(1) translateY(0)' : 'scale(.92) translateY(12px)', opacity: shown ? 1 : 0 }}
        role="alertdialog" aria-modal="true" aria-label="绑定邮箱提醒">
        <div className="mb-4 flex items-center gap-3.5">
          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[26px] shadow-[0_8px_20px_-6px_rgba(99,60,235,.6),inset_0_1px_0_rgba(255,255,255,.4)]">📮</span>
          <div>
            <h3 className="text-xl font-extrabold leading-tight">「{name}」还没绑邮箱</h3>
            <p className="mt-0.5 text-sm leading-snug text-slate-500">花半分钟绑一下，账号就丢不了</p>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed text-slate-600">
          绑上邮箱后，换手机、清了缓存都不怕——用邮箱验证码就能找回你的账号，投票和记账都还在。
          没绑的话，这台设备一旦退出，就只能重新建号，之前的记录也认不回来啦。
        </p>
        <button onClick={bindNow} className="btn-primary mt-5 w-full rounded-xl px-5 py-3 font-bold">现在绑邮箱</button>
        <button onClick={dismiss} className="mt-2.5 w-full text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">下次再说（下次登录还会提醒你 😏）</button>
      </div>
    </div>
  );
}
