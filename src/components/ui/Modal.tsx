import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

// ─── Modal sizes ───────────────────────────────────────────────────────────────

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeStyles: Record<ModalSize, string> = {
  xs:   'max-w-xs',
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

// ─── Modal props ───────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Prevent closing when clicking the backdrop */
  closeOnBackdrop?: boolean;
  /** Hide the X close button */
  hideCloseButton?: boolean;
  className?: string;
}

// ─── Modal component ───────────────────────────────────────────────────────────

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  hideCloseButton = false,
  className,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/40 backdrop-blur-[2px]',
        // animate-in
        'animate-in fade-in duration-150',
      )}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={clsx(
          'relative w-full rounded-2xl bg-white shadow-xl',
          'animate-in zoom-in-95 fade-in duration-200',
          'flex flex-col max-h-[90vh]',
          sizeStyles[size],
          className,
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#242220]/8 shrink-0">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-[#242220] leading-tight"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[#242220]/55">{description}</p>
              )}
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={clsx(
                  'shrink-0 flex h-8 w-8 items-center justify-center rounded-lg',
                  'text-[#242220]/40 hover:text-[#242220] hover:bg-[#242220]/8',
                  'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/50',
                )}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#242220]/8 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ConfirmModal ──────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const confirmColors: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-[#c9a84c] hover:bg-[#b8933d] text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xs">
      {message && <p className="text-sm text-[#242220]/70">{message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-9 px-4 rounded-lg border border-[#242220]/20 text-sm font-medium text-[#242220] hover:bg-[#242220]/5 transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={clsx(
            'h-9 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            confirmColors[variant],
          )}
        >
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default Modal;
