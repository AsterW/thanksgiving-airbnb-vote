import { useEffect, useRef, useState } from 'react';
import { useSession } from '../session/SessionContext.jsx';
import './login.css';

// 登录 sheet：玻璃面板 + 右上角关闭钮。点遮罩、按 Esc 也能关（和「先随便看看」一个效果）
export default function LoginModal() {
  const { name, users, loginOpen, closeLogin, login } = useSession();
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const selRef = useRef(null), inputRef = useRef(null);

  useEffect(() => {
    if (!loginOpen) return;
    setNewName(''); setMsg('');
    (users.length ? selRef.current : inputRef.current)?.focus();
    const onKey = e => { if (e.key === 'Escape') closeLogin(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loginOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在打开时聚焦一次

  if (!loginOpen) return null;
  const go = async n => { setMsg(''); const err = await login(n); if (err) setMsg(err); };
  const field = 'flex-1 min-w-0 rounded-xl border border-white/70 bg-white/75 px-3.5 py-2.5 shadow-[inset_0_1px_3px_rgba(15,23,42,.06)] focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="login-fade fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center z-50 px-4"
      onClick={e => { if (e.target === e.currentTarget) closeLogin(); }}>
      <div className="login-pop glass-sheet relative rounded-[28px] px-6 pb-6 pt-3 w-full max-w-sm" role="dialog" aria-modal="true" aria-label="登录">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-400/40" aria-hidden="true" />
        <button onClick={closeLogin} aria-label="关闭"
          className="login-close absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-white/60 text-base leading-none text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,.12),inset_0_1px_0_rgba(255,255,255,.9)] hover:bg-white/90 hover:text-slate-700">✕</button>
        <div className="mb-5 flex items-center gap-3.5 pr-8">
          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[26px] shadow-[0_8px_20px_-6px_rgba(99,60,235,.6),inset_0_1px_0_rgba(255,255,255,.4)]">👋</span>
          <div>
            <h3 className="text-xl font-extrabold leading-tight">你是谁？</h3>
            <p className="mt-0.5 text-sm leading-snug text-slate-500">选一下你的名字就能登录，投票和记账都会记在你名下</p>
          </div>
        </div>
        {users.length > 0 && (
          <div>
            <label className="text-xs font-bold tracking-wide text-slate-500" htmlFor="userSel">我来过了</label>
            <div className="mb-4 mt-1.5 flex gap-2">
              <select id="userSel" ref={selRef} defaultValue={users.some(u => u.name === name) ? name : ''}
                onChange={e => e.target.value && go(e.target.value)} className={field}>
                <option value="">选择你的名字…</option>
                {users.map(u => <option key={u.name}>{u.name}</option>)}
              </select>
              <button onClick={() => go(selRef.current.value)} className="btn-primary shrink-0 rounded-xl px-5 py-2.5 font-bold">登录</button>
            </div>
            <div className="mb-3.5 flex items-center gap-3 text-xs text-slate-400"><span className="flex-1 border-t border-white/60"></span>第一次来？<span className="flex-1 border-t border-white/60"></span></div>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && go(newName)}
            className={field} placeholder="输入你的名字，比如 Ken" maxLength={20} />
          <button onClick={() => go(newName)} className="shrink-0 rounded-xl bg-slate-900/90 px-5 py-2.5 font-bold text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,.5)] transition hover:bg-slate-900 active:scale-[.98]">加入</button>
        </div>
        {msg && <p className="mt-2.5 text-sm font-medium text-rose-600">{msg}</p>}
        <button onClick={closeLogin} className="mt-4 w-full text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">先随便看看 →</button>
      </div>
    </div>
  );
}
