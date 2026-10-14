import { createContext, useCallback, useContext, useRef, useState } from 'react';

// 顶部横幅（投票成功等）。useToast()(text) 显示 2.4 秒
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ text: '', show: false });
  const timer = useRef(null);
  const show = useCallback(text => {
    setToast({ text, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2400);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" style={{ transition: 'opacity .3s ease, transform .45s cubic-bezier(.2,1.6,.4,1)' }}
        className={'fixed left-1/2 top-6 z-[70] pointer-events-none bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-full px-6 py-3 shadow-xl max-w-[90vw] truncate '
          + (toast.show ? 'opacity-100 -translate-x-1/2 translate-y-0 scale-100' : 'opacity-0 -translate-x-1/2 -translate-y-4 scale-90')}>
        {toast.text}
      </div>
    </ToastContext.Provider>
  );
}
