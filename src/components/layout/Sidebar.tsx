// Sidebar – role-based navigation for StayNexa
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Hotel, Users, CreditCard, Flag, BarChart3, ScrollText,
  CalendarDays, DoorOpen, UtensilsCrossed, Broom, Wrench, UserCheck, Settings,
  FileBarChart, QrCode, ClipboardList, LayoutGrid, UserCircle2,
  BellRing, FolderOpen, ChevronLeft, ChevronRight, Star,
  Layers, ClipboardCheck,
} from 'lucide-react';
import type { UserRole } from '../../types';

// ─── Nav item type ────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

// ─── Nav configs per role ─────────────────────────────────────────────────────

const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',     path: '/super-admin',               icon: LayoutDashboard },
  { label: 'Hotels',        path: '/super-admin/hotels',        icon: Hotel },
  { label: 'Users',         path: '/super-admin/users',         icon: Users },
  { label: 'Subscriptions', path: '/super-admin/subscriptions', icon: CreditCard },
  { label: 'Feature Flags', path: '/super-admin/flags',         icon: Flag },
  { label: 'Analytics',     path: '/super-admin/analytics',     icon: BarChart3 },
  { label: 'Activity Logs', path: '/super-admin/logs',          icon: ScrollText },
];

const HOTEL_NAV: NavItem[] = [
  { label: 'Dashboard',    path: '/hotel/dashboard',    icon: LayoutDashboard },
  { label: 'Rooms',        path: '/hotel/rooms',        icon: DoorOpen },
  { label: 'Reservations', path: '/hotel/reservations', icon: CalendarDays },
  { label: 'Guests',       path: '/hotel/guests',       icon: UserCircle2 },
  { label: 'Restaurant',   path: '/hotel/restaurant',   icon: UtensilsCrossed },
  { label: 'Housekeeping', path: '/hotel/housekeeping', icon: Broom },
  { label: 'Maintenance',  path: '/hotel/maintenance',  icon: Wrench },
  { label: 'Staff',        path: '/hotel/staff',        icon: UserCheck },
  { label: 'Settings',     path: '/hotel/settings',     icon: Settings },
  { label: 'Reports',      path: '/hotel/reports',      icon: FileBarChart },
  { label: 'QR Codes',     path: '/hotel/qr-codes',    icon: QrCode },
];

const RECEPTION_NAV: NavItem[] = [
  { label: 'Overview',     path: '/reception',                icon: LayoutDashboard },
  { label: 'Reservations', path: '/reception/reservations',  icon: CalendarDays },
  { label: 'Room Board',   path: '/reception/room-board',    icon: LayoutGrid },
  { label: 'Guests',       path: '/reception/guests',        icon: UserCircle2 },
  { label: 'Requests',     path: '/reception/requests',      icon: BellRing },
  { label: 'Restaurant',   path: '/reception/restaurant',    icon: UtensilsCrossed },
  { label: 'Housekeeping', path: '/reception/housekeeping',  icon: Broom },
  { label: 'Maintenance',  path: '/reception/maintenance',   icon: Wrench },
  { label: 'Folios',       path: '/reception/folios',        icon: FolderOpen },
];

const HOUSEKEEPING_NAV: NavItem[] = [
  { label: 'My Tasks',   path: '/housekeeping',         icon: ClipboardList },
  { label: 'Room Board', path: '/housekeeping/rooms',   icon: LayoutGrid },
];

const MAINTENANCE_NAV: NavItem[] = [
  { label: 'My Tickets', path: '/maintenance',          icon: ClipboardCheck },
  { label: 'All Tickets',path: '/maintenance/all',      icon: Layers },
];

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'SUPER_ADMIN':                         return SUPER_ADMIN_NAV;
    case 'HOTEL_ADMIN':
    case 'HOTEL_MANAGER':
    case 'RESTAURANT_MANAGER':                  return HOTEL_NAV;
    case 'RECEPTION':                           return RECEPTION_NAV;
    case 'HOUSEKEEPING':                        return HOUSEKEEPING_NAV;
    case 'MAINTENANCE':                         return MAINTENANCE_NAV;
    default:                                    return [];
  }
}

// ─── Role badge colours ───────────────────────────────────────────────────────

function getRoleBadge(role: UserRole): { label: string; color: string } {
  const map: Partial<Record<UserRole, { label: string; color: string }>> = {
    SUPER_ADMIN:       { label: 'Super Admin',  color: 'bg-purple-100 text-purple-700' },
    HOTEL_ADMIN:       { label: 'Hotel Admin',  color: 'bg-blue-100 text-blue-700'   },
    HOTEL_MANAGER:     { label: 'Manager',      color: 'bg-sky-100 text-sky-700'     },
    RECEPTION:         { label: 'Reception',    color: 'bg-teal-100 text-teal-700'   },
    RESTAURANT_MANAGER:{ label: 'Restaurant',   color: 'bg-orange-100 text-orange-700'},
    KITCHEN:           { label: 'Kitchen',      color: 'bg-red-100 text-red-700'     },
    HOUSEKEEPING:      { label: 'Housekeeping', color: 'bg-green-100 text-green-700' },
    MAINTENANCE:       { label: 'Maintenance',  color: 'bg-yellow-100 text-yellow-700'},
    GUEST:             { label: 'Guest',        color: 'bg-gray-100 text-gray-700'   },
  };
  return map[role] ?? { label: role, color: 'bg-gray-100 text-gray-700' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  role: UserRole;
  hotelName?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ role, hotelName, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navItems = getNavItems(role);
  const badge = getRoleBadge(role);

  function isActive(path: string): boolean {
    // Exact match for root paths, prefix match for sub-paths
    if (path === '/super-admin' || path === '/reception' || path === '/hotel/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-white border-r border-stone-200/80 transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      {/* ── Logo / Hotel name ─────────────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center gap-3 border-b border-stone-200/80 transition-all duration-300',
        collapsed ? 'h-16 px-3 justify-center' : 'h-16 px-4',
      )}>
        {/* Logo mark */}
        <div className="shrink-0 h-8 w-8 rounded-lg bg-[#c9a84c] flex items-center justify-center shadow-sm">
          <Star size={16} className="text-white fill-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#242220] truncate leading-tight">
              {role === 'SUPER_ADMIN' ? 'StayNexa' : (hotelName ?? 'StayNexa')}
            </p>
            <span className={clsx(
              'inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5',
              badge.color,
            )}>
              {badge.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center rounded-lg transition-all duration-150 group relative',
                collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-10 px-3 gap-3',
                active
                  ? 'bg-[#c9a84c]/10 text-[#c9a84c]'
                  : 'text-[#5a5855] hover:bg-stone-100 hover:text-[#242220]',
              )}
            >
              {/* Active indicator pill */}
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#c9a84c]" />
              )}
              <Icon
                size={18}
                className={clsx(
                  'shrink-0 transition-colors',
                  active ? 'text-[#c9a84c]' : 'text-[#8a8785] group-hover:text-[#242220]',
                )}
              />
              {!collapsed && (
                <span className={clsx(
                  'text-sm font-medium truncate',
                  active ? 'text-[#c9a84c] font-semibold' : '',
                )}>
                  {item.label}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-2.5 px-2 py-1 text-xs font-medium text-white bg-[#242220] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Collapse toggle ───────────────────────────────────────────────── */}
      <div className="border-t border-stone-200/80 p-2">
        <button
          onClick={onToggleCollapse}
          className={clsx(
            'flex items-center justify-center h-8 w-full rounded-lg text-[#8a8785]',
            'hover:bg-stone-100 hover:text-[#242220] transition-colors duration-150',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
