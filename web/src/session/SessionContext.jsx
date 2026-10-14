import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { load, save } from '../lib/storage.js';

// 登录：从后端的用户列表里选名字。名字和投票用的 token 存在 localStorage
// （vn / vt）；登录成已有用户时换成那个用户的 token，投票就跟着人走。
const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

function initialToken() {
  let t = load('vt');
  if (!t) { t = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(); save('vt', t); }
  return t;
}

export function SessionProvider({ children }) {
  const [name, setName] = useState(() => load('vn', ''));
  const [token, setToken] = useState(initialToken);
  const [users, setUsers] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const pending = useRef(null); // 登录后要接着做的事（比如投票），参数是 { name, token }

  const loadUsers = useCallback(async () => {
    try { const r = await api('/api/users'); if (r.ok) setUsers(r.users); } catch (e) {}
  }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openLogin = useCallback(fn => {
    pending.current = fn || null;
    setLoginOpen(true);
    loadUsers(); // 别人可能刚注册，顺手刷新一下列表
  }, [loadUsers]);

  const closeLogin = useCallback(() => { pending.current = null; setLoginOpen(false); }, []);

  // 已登录就直接做；没登录先弹登录框，登录后再做
  const ensureName = useCallback(fn => {
    if (name) fn({ name, token });
    else openLogin(fn);
  }, [name, token, openLogin]);

  // 返回错误文字，成功返回 null
  const login = useCallback(async input => {
    const n = String(input || '').trim();
    if (!n) return null;
    let r;
    try { r = await api('/api/login', 'POST', { name: n, token }); } catch (e) { r = { ok: false, error: '网络有点问题，稍后再试' }; }
    if (!r.ok) return r.error || '登录失败';
    setName(r.user.name); setToken(r.user.token); setUsers(r.users);
    save('vn', r.user.name); save('vt', r.user.token);
    setLoginOpen(false);
    const f = pending.current; pending.current = null;
    if (f) f({ name: r.user.name, token: r.user.token });
    return null;
  }, [token]);

  const value = { name, token, users, setUsers, loadUsers, loginOpen, openLogin, closeLogin, ensureName, login };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
