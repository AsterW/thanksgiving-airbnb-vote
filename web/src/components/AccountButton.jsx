import { useSession } from '../session/SessionContext.jsx';

// 当前用户（点开可以切换）
export default function AccountButton() {
  const { name, openLogin } = useSession();
  return (
    <button onClick={() => openLogin()} title={name ? '切换用户' : '登录'}
      className="fixed z-[45] right-4 top-[calc(env(safe-area-inset-top,0px)+14px)] flex items-center gap-2 rounded-full bg-white/90 backdrop-blur shadow-lg hover:shadow-xl pl-1 pr-3 py-1 text-sm font-medium text-slate-700">
      <span className="avatar w-7 h-7 text-xs">{name ? Array.from(name)[0].toUpperCase() : '?'}</span>
      <span className="max-w-[8rem] truncate">{name || '登录'}</span>
    </button>
  );
}
