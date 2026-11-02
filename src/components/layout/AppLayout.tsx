// AppLayout – main layout wrapper with role-based sidebar and header
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/useAuth';
import { hotelService } from '../../services/demoDataService';
import { isDemoMode } from '../../lib/supabase';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { UserRole } from '../../types';

// ─── Roles that skip the sidebar ─────────────────────────────────────────────

const NO_SIDEBAR_ROLES: UserRole[] = ['GUEST'];
const HEADER_ONLY_ROLES: UserRole[] = ['KITCHEN'];

// ─── Kitchen layout (fullscreen KDS header) ───────────────────────────────────

function KitchenLayout() {
  return (
    <div className="min-h-screen bg-[#111] flex flex-col">
      {/* Simple KDS top bar */}
      <div className="h-12 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-[#c9a84c] flex items-center justify-center">
            <span className="text-white text-[10px] font-black">SN</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">Kitchen Display System</span>
        </div>
        <span className="text-white/40 text-xs font-medium">StayNexa · KDS</span>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

// ─── Guest layout (mobile-first, no sidebar) ──────────────────────────────────

function GuestLayout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Outlet />
    </div>
  );
}

// ─── Main layout (with sidebar) ───────────────────────────────────────────────

function MainLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('staynexa_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapse state
  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('staynexa_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  const hotel = user.hotel_id ? hotelService.getById(user.hotel_id) : null;
  const hotelName = hotel?.name;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – desktop (always visible) */}
      <div className="hidden md:flex h-full">
        <Sidebar
          role={user.role}
          hotelName={hotelName}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      {/* Sidebar – mobile (drawer) */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="h-full w-[240px]">
          <Sidebar
            role={user.role}
            hotelName={hotelName}
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header isDemoMode={isDemoMode()} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── AppLayout (root) ─────────────────────────────────────────────────────────

export function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#c9a84c] flex items-center justify-center animate-pulse shadow-md">
            <span className="text-white font-black text-sm">SN</span>
          </div>
          <p className="text-sm text-[#8a8785] font-medium">Loading StayNexa…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (NO_SIDEBAR_ROLES.includes(user.role)) {
    return <GuestLayout />;
  }

  if (HEADER_ONLY_ROLES.includes(user.role)) {
    return <KitchenLayout />;
  }

  return <MainLayout />;
}

export default AppLayout;
