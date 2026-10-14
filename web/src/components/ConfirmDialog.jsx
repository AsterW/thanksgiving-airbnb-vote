import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// 玻璃风确认框，替代浏览器原生的 confirm()（样式跟系统脱节、还带着域名标题）。
// 用法：const confirm = useConfirm(); if (!await confirm({ message, confirmText: '删除', danger: true })) return;
const ConfirmContext = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [ask, setAsk] = useState(null); // { title, message, confirmText, cancelText, danger }
  const [show, setShow] = useState(false);
  const resolveRef = useRef(null);

  const confirm = useCallback(opts => new Promise(resolve => {
    resolveRef.current = resolve;
    setAsk(typeof opts === 'string' ? { message: opts } : opts);
    requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
  }), []);

  const settle = useCallback(result => {
    setShow(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setTimeout(() => { setAsk(null); resolve && resolve(result); }, 180);
  }, []);

  useEffect(() => {
    if (!ask) return;
    const onKey = e => { if (e.key === 'Escape') settle(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {ask && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center z-[80] px-4"
          style={{ transition: 'opacity .18s ease', opacity: show ? 1 : 0 }}
          onClick={() => settle(false)}>
          <div className="glass-sheet relative rounded-[28px] px-6 py-6 w-full max-w-sm"
            style={{ transition: 'transform .22s cubic-bezier(.2,1.4,.4,1), opacity .18s ease', transform: show ? 'scale(1) translateY(0)' : 'scale(.92) translateY(10px)', opacity: show ? 1 : 0 }}
            role="alertdialog" aria-modal="true" aria-label={ask.title || '请确认'}
            onClick={e => e.stopPropagation()}>
            {ask.title && <div className="text-[17px] font-black text-slate-900 leading-snug">{ask.title}</div>}
            <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{ask.message}</div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => settle(false)}
                className="flex-1 rounded-full py-3 font-bold text-slate-600 bg-white/60 border border-slate-900/10 shadow-sm transition hover:bg-white/90 active:scale-[.98]">
                {ask.cancelText || '取消'}
              </button>
              <button onClick={() => settle(true)} autoFocus
                className={'flex-1 rounded-full py-3 font-bold text-white shadow-lg transition active:scale-[.98] '
                  + (ask.danger
                    ? 'bg-gradient-to-b from-rose-500 to-rose-600 shadow-rose-600/30 hover:brightness-110'
                    : 'btn-primary shadow-indigo-600/30')}>
                {ask.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
