import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

/*
 * Aviso flotante al pie de la pantalla (patrón "TURNO ATENDIDO · GOMEZ, LUCIA · 16:30"):
 * pill oscura al 82 % para confirmaciones y roja para acciones destructivas.
 */

type Tone = 'dark' | 'red';
interface ToastData {
  id: number;
  message: string;
  detail?: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, opts?: { detail?: string; tone?: Tone }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);

  const show = useCallback((message: string, opts?: { detail?: string; tone?: Tone }) => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, message, detail: opts?.detail, tone: opts?.tone ?? 'dark' });
    timer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`} role="status" aria-live="polite">
            <span className={styles.message}>{toast.message}</span>
            {toast.detail && <span className={styles.detail}>{toast.detail}</span>}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
