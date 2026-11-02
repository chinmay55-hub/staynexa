import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
}

import { ToastContext } from './useToast';

// ─── ToastProvider ─────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      return id;
    },
    [],
  );

  const success = useCallback(
    (title: string, message?: string) => addToast({ variant: 'success', title, message }),
    [addToast],
  );
  const error = useCallback(
    (title: string, message?: string) => addToast({ variant: 'error', title, message }),
    [addToast],
  );
  const warning = useCallback(
    (title: string, message?: string) => addToast({ variant: 'warning', title, message }),
    [addToast],
  );
  const info = useCallback(
    (title: string, message?: string) => addToast({ variant: 'info', title, message }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// ─── Variant config ────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { Icon: React.FC<{ size?: number; className?: string }>; iconColor: string; bar: string }
> = {
  success: {
    Icon: ({ size, className }) => <CheckCircle2 size={size} className={className} />,
    iconColor: 'text-emerald-500',
    bar: 'bg-emerald-500',
  },
  error: {
    Icon: ({ size, className }) => <XCircle size={size} className={className} />,
    iconColor: 'text-red-500',
    bar: 'bg-red-500',
  },
  warning: {
    Icon: ({ size, className }) => <AlertTriangle size={size} className={className} />,
    iconColor: 'text-amber-500',
    bar: 'bg-amber-500',
  },
  info: {
    Icon: ({ size, className }) => <Info size={size} className={className} />,
    iconColor: 'text-blue-500',
    bar: 'bg-blue-500',
  },
};

const DEFAULT_DURATION = 4500;

// ─── ToastItem ─────────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = VARIANT_CONFIG[toast.variant];
  const duration = toast.duration ?? DEFAULT_DURATION;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    // Trigger enter animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, dismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'relative flex w-full max-w-sm overflow-hidden rounded-xl border border-[#242220]/10',
        'bg-white shadow-lg transition-all duration-300 ease-out',
        visible && !exiting
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8',
      )}
      onMouseEnter={() => timerRef.current && clearTimeout(timerRef.current)}
      onMouseLeave={() => {
        if (duration !== 0) timerRef.current = setTimeout(dismiss, duration);
      }}
    >
      {/* Colored left bar */}
      <div className={clsx('w-1 shrink-0', cfg.bar)} />

      {/* Content */}
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <cfg.Icon size={18} className={clsx('shrink-0 mt-0.5', cfg.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#242220] leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-[#242220]/55 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[#242220]/30 hover:text-[#242220] hover:bg-[#242220]/8 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {duration > 0 && (
        <div
          className={clsx('absolute bottom-0 left-0 h-0.5', cfg.bar, 'opacity-30')}
          style={{
            animation: `toast-shrink ${duration}ms linear forwards`,
            width: '100%',
          }}
        />
      )}
    </div>
  );
};

// ─── ToastContainer ────────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <>
      {/* CSS for progress bar animation */}
      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastProvider;
