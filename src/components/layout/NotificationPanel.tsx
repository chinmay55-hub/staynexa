// NotificationPanel – slide-out notifications panel
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, CheckCheck, ExternalLink, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '../../types';
import { notificationService } from '../../services/demoDataService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Icon by type ─────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  if (type.includes('alert') || type.includes('urgent') || type.includes('maintenance')) {
    return <AlertCircle size={16} className="text-red-500 shrink-0" />;
  }
  if (type.includes('success') || type.includes('check') || type.includes('complete')) {
    return <CheckCircle2 size={16} className="text-green-500 shrink-0" />;
  }
  return <Info size={16} className="text-[#c9a84c] shrink-0" />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onUpdate: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationPanel({ open, onClose, notifications, onUpdate }: NotificationPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleMarkRead(id: string) {
    notificationService.markRead(id);
    onUpdate();
  }

  function handleMarkAllRead() {
    if (!user) return;
    notificationService.markAllRead(user.id);
    onUpdate();
  }

  function handleLink(notification: Notification) {
    handleMarkRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed top-0 right-0 h-full w-[360px] max-w-full bg-white shadow-2xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-[#c9a84c]" />
            <h2 className="text-base font-semibold text-[#242220]">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-[#c9a84c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-[#8a8785] hover:text-[#c9a84c] transition-colors font-medium"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                All read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8a8785] hover:bg-stone-100 hover:text-[#242220] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-3 px-8">
              <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
                <Bell size={20} className="text-stone-400" />
              </div>
              <p className="text-sm text-[#8a8785] font-medium">You're all caught up!</p>
              <p className="text-xs text-stone-400">No notifications right now.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  'flex gap-3 px-4 py-3.5 transition-colors group',
                  !n.is_read ? 'bg-[#c9a84c]/5 hover:bg-[#c9a84c]/10' : 'hover:bg-stone-50',
                )}
              >
                {/* Icon */}
                <div className="mt-0.5">
                  <NotifIcon type={n.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      'text-sm leading-snug',
                      !n.is_read ? 'font-semibold text-[#242220]' : 'font-medium text-[#4a4744]',
                    )}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-[#c9a84c] mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-[#8a8785] mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-stone-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {n.link && (
                        <button
                          onClick={() => handleLink(n)}
                          className="text-[11px] text-[#c9a84c] font-medium flex items-center gap-0.5 hover:underline"
                        >
                          View <ExternalLink size={10} />
                        </button>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[11px] text-[#8a8785] hover:text-[#242220] font-medium"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200/80 px-5 py-3 shrink-0">
          <p className="text-[11px] text-stone-400 text-center">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
