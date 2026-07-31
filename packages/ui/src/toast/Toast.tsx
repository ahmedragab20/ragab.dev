import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../lib/cx";

export type ToastItem = {
  id: number;
  title: string;
  detail?: string;
  tone?: "default" | "ok" | "warn" | "err";
};

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (title: string, opts?: { detail?: string; tone?: ToastItem["tone"]; ms?: number }) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

export type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, opts?: { detail?: string; tone?: ToastItem["tone"]; ms?: number }) => {
      const id = ++toastSeq;
      const item: ToastItem = {
        id,
        title,
        detail: opts?.detail,
        tone: opts?.tone ?? "default",
      };
      setToasts((prev) => [...prev.slice(-4), item]);
      const ms = opts?.ms ?? 2800;
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ragab-toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cx("ragab-toast", t.tone && t.tone !== "default" && `ragab-toast--${t.tone}`)}
            onClick={() => dismiss(t.id)}
          >
            <span className="ragab-toast__dot" aria-hidden="true" />
            <span className="ragab-toast__body">
              <span className="ragab-toast__title">{t.title}</span>
              {t.detail ? <span className="ragab-toast__detail">{t.detail}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
