import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';

// Super Admin pages
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import HotelsManagementPage from './pages/super-admin/HotelsManagementPage';
import UsersManagementPage from './pages/super-admin/UsersManagementPage';
import SubscriptionsPage from './pages/super-admin/SubscriptionsPage';
import FeatureFlagsPage from './pages/super-admin/FeatureFlagsPage';
import PlatformAnalyticsPage from './pages/super-admin/PlatformAnalyticsPage';
import ActivityLogsPage from './pages/super-admin/ActivityLogsPage';

// Hotel Admin pages
import HotelDashboard from './pages/hotel/HotelDashboard';
import RoomsManagementPage from './pages/hotel/RoomsManagementPage';
import StaffManagementPage from './pages/hotel/StaffManagementPage';
import HotelSettingsPage from './pages/hotel/HotelSettingsPage';
import QRCodesPage from './pages/hotel/QRCodesPage';
import ReportsPage from './pages/hotel/ReportsPage';

// Reception pages
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import RoomBoardPage from './pages/reception/RoomBoardPage';
import ReservationsPage from './pages/reception/ReservationsPage';
import GuestsPage from './pages/reception/GuestsPage';
import RequestsPage from './pages/reception/RequestsPage';
import FoliosPage from './pages/reception/FoliosPage';

// Operations pages
import RestaurantPage from './pages/restaurant/RestaurantPage';
import KitchenDisplayPage from './pages/restaurant/KitchenDisplayPage';
import HousekeepingPage from './pages/housekeeping/HousekeepingPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';

// Guest portal
import GuestPortalPage from './pages/guest/GuestPortalPage';

// Hotel onboarding
import HotelOnboardingPage from './pages/onboarding/HotelOnboardingPage';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'SUPER_ADMIN': return <Navigate to="/super-admin" replace />;
    case 'HOTEL_ADMIN':
    case 'HOTEL_MANAGER': return <Navigate to="/hotel/dashboard" replace />;
    case 'RECEPTION': return <Navigate to="/reception" replace />;
    case 'KITCHEN': return <Navigate to="/kitchen" replace />;
    case 'HOUSEKEEPING': return <Navigate to="/housekeeping" replace />;
    case 'MAINTENANCE': return <Navigate to="/maintenance" replace />;
    case 'RESTAURANT_MANAGER': return <Navigate to="/restaurant" replace />;
    default: return <Navigate to="/reception" replace />;
  }
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/guest" element={<GuestPortalPage />} />
      <Route path="/guest/:token" element={<GuestPortalPage />} />
      <Route path="/guest/*" element={<GuestPortalPage />} />
      <Route path="/q" element={<GuestPortalPage />} />
      <Route path="/q/:token" element={<GuestPortalPage />} />
      <Route path="/q/*" element={<GuestPortalPage />} />

      {/* Home redirect */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleRouter />
        </ProtectedRoute>
      } />

      {/* Super Admin */}
      <Route path="/super-admin" element={
        <ProtectedRoute roles={['SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="hotels" element={<HotelsManagementPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="flags" element={<FeatureFlagsPage />} />
        <Route path="analytics" element={<PlatformAnalyticsPage />} />
        <Route path="logs" element={<ActivityLogsPage />} />
      </Route>

      {/* Hotel Onboarding */}
      <Route path="/onboarding/:hotelId?" element={
        <ProtectedRoute roles={['SUPER_ADMIN', 'HOTEL_ADMIN']}>
          <HotelOnboardingPage />
        </ProtectedRoute>
      } />

      {/* Hotel Admin / Manager */}
      <Route path="/hotel" element={
        <ProtectedRoute roles={['HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<HotelDashboard />} />
        <Route path="rooms" element={<RoomsManagementPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="restaurant" element={<RestaurantPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="settings" element={<HotelSettingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="qr-codes" element={<QRCodesPage />} />
      </Route>

      {/* Reception */}
      <Route path="/reception" element={
        <ProtectedRoute roles={['RECEPTION', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<ReceptionDashboard />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="room-board" element={<RoomBoardPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="restaurant" element={<RestaurantPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="folios" element={<FoliosPage />} />
      </Route>

      {/* Kitchen & KDS (accessible to Kitchen, Restaurant, Reception, and Managers) */}
      <Route path="/kitchen" element={
        <ProtectedRoute roles={['KITCHEN', 'RESTAURANT_MANAGER', 'RECEPTION', 'HOTEL_MANAGER', 'HOTEL_ADMIN', 'SUPER_ADMIN']}>
          <KitchenDisplayPage />
        </ProtectedRoute>
      } />
      <Route path="/kds" element={
        <ProtectedRoute roles={['KITCHEN', 'RESTAURANT_MANAGER', 'RECEPTION', 'HOTEL_MANAGER', 'HOTEL_ADMIN', 'SUPER_ADMIN']}>
          <KitchenDisplayPage />
        </ProtectedRoute>
      } />

      {/* Restaurant Manager */}
      <Route path="/restaurant" element={
        <ProtectedRoute roles={['RESTAURANT_MANAGER', 'HOTEL_ADMIN', 'SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<RestaurantPage />} />
      </Route>

      {/* Housekeeping */}
      <Route path="/housekeeping" element={
        <ProtectedRoute roles={['HOUSEKEEPING', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<HousekeepingPage />} />
        <Route path="rooms" element={<HousekeepingPage defaultTab="ROOMS" />} />
      </Route>

      {/* Maintenance */}
      <Route path="/maintenance" element={
        <ProtectedRoute roles={['MAINTENANCE', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN']}>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<MaintenancePage />} />
        <Route path="all" element={<MaintenancePage />} />
      </Route>

      {/* Route Aliases */}
      <Route path="/admin" element={<Navigate to="/hotel/dashboard" replace />} />
      <Route path="/admin/qrcodes" element={<Navigate to="/hotel/qr-codes" replace />} />
      <Route path="/admin/*" element={<Navigate to="/hotel/dashboard" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
