// Header – top bar with hotel name, search, notifications, user menu
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Settings, FlaskConical } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService, hotelService } from '../../services/demoDataService';
import type { Notification } from '../../types';
import { NotificationPanel } from './NotificationPanel';
import { GlobalSearch } from './GlobalSearch';

// ─── Breadcrumb helper ────────────────────────────────────────────────────────

function useBreadcrumb(): string {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';

  // Convert path segments to title-case labels
  const last = parts[parts.length - 1];
  return last
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Avatar initials ──────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase();
}

// ─── Role display label ───────────────────────────────────────────────────────

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN:        'Super Administrator',
    HOTEL_ADMIN:        'Hotel Administrator',
    HOTEL_MANAGER:      'Hotel Manager',
    RECEPTION:          'Front Desk',
    RESTAURANT_MANAGER: 'Restaurant Manager',
    KITCHEN:            'Kitchen Staff',
    HOUSEKEEPING:       'Housekeeping',
    MAINTENANCE:        'Maintenance',
    GUEST:              'Guest',
  };
  return map[role] ?? role;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  isDemoMode?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Header({ isDemoMode = true }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useBreadcrumb();

  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load notifications
  function loadNotifications() {
    if (!user) return;
    const notifs = notificationService.getAll(user.id);
    setNotifications(notifs);
    setUnreadCount(notificationService.getUnreadCount(user.id));
  }

  useEffect(() => {
    loadNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [userMenuOpen]);

  // Global keyboard shortcut: Cmd/Ctrl + K → search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Get hotel name from user context
  const hotel = user?.hotel_id ? hotelService.getById(user.hotel_id) : null;
  const hotelName = hotel?.name ?? (user?.role === 'SUPER_ADMIN' ? 'StayNexa Platform' : 'StayNexa');

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-stone-200/80 flex items-center px-4 gap-3 shrink-0 z-30">
        {/* Left: hotel name + breadcrumb */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#242220] truncate hidden sm:block">
            {hotelName}
          </span>
          <span className="hidden sm:block text-stone-300">/</span>
          <span className="text-sm text-[#8a8785] truncate">{breadcrumb}</span>
        </div>

        {/* Center / Right: search + actions */}
        <div className="flex items-center gap-2">
          {/* Demo mode banner */}
          {isDemoMode && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
              <FlaskConical size={12} className="text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">Demo Mode</span>
            </div>
          )}

          {/* Search */}
          {user?.role !== 'GUEST' && user?.role !== 'KITCHEN' && (
            <button
              onClick={() => setSearchOpen(true)}
              className={clsx(
                'flex items-center gap-2 h-8 rounded-lg border border-stone-200 text-[#8a8785]',
                'hover:border-stone-300 hover:bg-stone-50 transition-all duration-150',
                'px-3 text-xs hidden sm:flex',
              )}
            >
              <Search size={13} />
              <span>Search…</span>
              <kbd className="ml-1 text-[10px] px-1 py-0.5 bg-stone-100 border border-stone-200 rounded text-stone-400 font-medium">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Mobile search icon */}
          {user?.role !== 'GUEST' && user?.role !== 'KITCHEN' && (
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-[#8a8785] hover:bg-stone-100 hover:text-[#242220] transition-colors"
            >
              <Search size={18} />
            </button>
          )}

          {/* Notifications bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2 rounded-lg text-[#8a8785] hover:bg-stone-100 hover:text-[#242220] transition-colors"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-[16px] px-0.5 flex items-center justify-center bg-[#c9a84c] text-white text-[9px] font-bold rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className={clsx(
                'flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-lg transition-all duration-150',
                'hover:bg-stone-100',
                userMenuOpen && 'bg-stone-100',
              )}
            >
              {/* Avatar */}
              <div className="h-7 w-7 rounded-full bg-[#c9a84c] flex items-center justify-center shrink-0">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-white">
                    {user ? initials(user.full_name) : '?'}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-xs font-semibold text-[#242220] leading-tight truncate max-w-[120px]">
                  {user?.full_name ?? 'Unknown'}
                </p>
                <p className="text-[10px] text-[#8a8785] leading-tight">
                  {user ? roleLabel(user.role) : ''}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={clsx(
                  'text-stone-400 transition-transform duration-150 hidden md:block',
                  userMenuOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                  <p className="text-xs font-semibold text-[#242220] truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-[#8a8785] truncate">{user?.email}</p>
                </div>
                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#4a4744] hover:bg-stone-50 hover:text-[#242220] transition-colors"
                  >
                    <User size={15} className="text-stone-400" />
                    My Profile
                  </button>
                  {(user?.role === 'HOTEL_ADMIN' || user?.role === 'HOTEL_MANAGER') && (
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/hotel/settings'); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#4a4744] hover:bg-stone-50 hover:text-[#242220] transition-colors"
                    >
                      <Settings size={15} className="text-stone-400" />
                      Hotel Settings
                    </button>
                  )}
                </div>
                <div className="border-t border-stone-100 py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Demo banner for mobile */}
      {isDemoMode && (
        <div className="lg:hidden flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 border-b border-amber-200">
          <FlaskConical size={12} className="text-amber-600" />
          <span className="text-[11px] font-semibold text-amber-700">
            Demo Mode — no real data is saved
          </span>
        </div>
      )}

      {/* Notification panel */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onUpdate={loadNotifications}
      />

      {/* Global search modal */}
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}

export default Header;
