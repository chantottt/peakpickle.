import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
interface Notice {
  id: string;
  message: string;
  kind: 'success' | 'error';
}
const ToastContext = createContext<(message: string, kind?: 'success' | 'error') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const toast = (message: string, kind: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setNotices((previous) => [...previous.slice(-2), { id, message, kind }]);
    timers.current.push(
      window.setTimeout(
        () => setNotices((previous) => previous.filter((notice) => notice.id !== id)),
        5500,
      ),
    );
  };
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {notices.map((notice) => (
          <div
            className={`toast toast-${notice.kind}`}
            key={notice.id}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            {notice.kind === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            <span>{notice.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setNotices((previous) => previous.filter((item) => item.id !== notice.id))
              }
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
