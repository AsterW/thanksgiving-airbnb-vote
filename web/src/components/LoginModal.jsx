import { useEffect, useRef, useState } from 'react';
import { useSession } from '../session/SessionContext.jsx';

export default function LoginModal() {
  const { name, users, loginOpen, closeLogin, login } = useSession();
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const selRef = useRef(null), inputRef = useRef(null);

  useEffect(() => {
    if (!loginOpen) return;
    setNewName(''); setMsg('');
    (users.length ? selRef.current : inputRef.current)?.focus();
  }, [loginOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在打开时聚焦一次

  if (!loginOpen) return null;
  const go = async n => { setMsg(''); const err = await login(n); if (err) setMsg(err); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="glass-sheet rounded-3xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-lg mb-1">👋 你是谁？</h3>
        <p className="text-sm text-slate-500 mb-4">选一下你的名字就能登录，投票和记账都会记在你名下</p>
        {users.length > 0 && (
          <div>
            <label className="text-sm font-medium" htmlFor="userSel">我来过了</label>
            <div className="flex gap-2 mt-1 mb-4">
              <select id="userSel" ref={selRef} defaultValue={users.some(u => u.name === name) ? name : ''}
                onChange={e => e.target.value && go(e.target.value)} className="flex-1 min-w-0 border rounded-lg px-3 py-2 bg-white">
                <option value="">选择你的名字…</option>
                {users.map(u => <option key={u.name}>{u.name}</option>)}
              </select>
              <button onClick={() => go(selRef.current.value)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-bold">登录</button>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-3"><span className="flex-1 border-t"></span>第一次来？<span className="flex-1 border-t"></span></div>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && go(newName)}
            className="flex-1 min-w-0 border rounded-lg px-3 py-2" placeholder="输入你的名字，比如 Ken" maxLength={20} />
          <button onClick={() => go(newName)} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 py-2 font-bold">加入</button>
        </div>
        <p className="text-sm text-rose-600 mt-2">{msg}</p>
        <button onClick={closeLogin} className="mt-2 text-sm text-slate-400 hover:text-slate-600">先随便看看 →</button>
      </div>
    </div>
  );
}
