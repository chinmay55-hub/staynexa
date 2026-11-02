import { createContext, useContext } from 'react';
import type { Toast } from './Toast';

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const NOOP_TOAST: ToastContextValue = {
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx || NOOP_TOAST;
}
