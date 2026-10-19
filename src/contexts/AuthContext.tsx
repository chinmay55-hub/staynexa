// Auth Context - Demo mode authentication
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserRole, Profile } from '../types';
import { DEMO_PROFILES, DEMO_MEMBERSHIPS } from '../data/demo';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hotel_id?: string;    // Active hotel context
  avatar_url?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
  switchHotel: (hotelId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo credentials map
const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  'admin@staynexa.com':       { password: 'demo123', userId: 'user-super' },
  'vikram@grandpalace.com':   { password: 'demo123', userId: 'user-001' },
  'anjali@grandpalace.com':   { password: 'demo123', userId: 'user-002' },
  'mohan@grandpalace.com':    { password: 'demo123', userId: 'user-003' },
  'rekha@grandpalace.com':    { password: 'demo123', userId: 'user-004' },
  'ramesh@grandpalace.com':   { password: 'demo123', userId: 'user-005' },
  'priti@willowboutique.in':  { password: 'demo123', userId: 'user-006' },
  'carlos@azurecove.com':     { password: 'demo123', userId: 'user-007' },
};

function profileToAuthUser(profile: Profile, hotelId?: string): AuthUser {
  return {
    id: profile.user_id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    hotel_id: hotelId,
    avatar_url: profile.avatar_url,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Check localStorage for persisted demo session
    try {
      const stored = localStorage.getItem('staynexa_demo_user');
      if (stored) return JSON.parse(stored) as AuthUser;
    } catch {}
    return null;
  });
  const [isLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const creds = DEMO_CREDENTIALS[email.toLowerCase()];
    if (!creds || creds.password !== password) {
      return { error: 'Invalid email or password. Use any demo credential.' };
    }

    const profile = DEMO_PROFILES.find(p => p.user_id === creds.userId);
    if (!profile) {
      return { error: 'Profile not found.' };
    }

    // Determine hotel context from memberships
    let hotelId: string | undefined;
    if (profile.role !== 'SUPER_ADMIN') {
      const membership = DEMO_MEMBERSHIPS.find(m => m.user_id === profile.user_id && m.is_active);
      hotelId = membership?.hotel_id;
    }

    const authUser = profileToAuthUser(profile, hotelId);
    setUser(authUser);
    localStorage.setItem('staynexa_demo_user', JSON.stringify(authUser));
    return {};
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem('staynexa_demo_user');
  }, []);

  const switchHotel = useCallback((hotelId: string) => {
    if (!user) return;
    const updated = { ...user, hotel_id: hotelId };
    setUser(updated);
    localStorage.setItem('staynexa_demo_user', JSON.stringify(updated));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, switchHotel }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
