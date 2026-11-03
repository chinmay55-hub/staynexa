// Auth Context - Dual-mode authentication (Supabase Production + Stateful In-Memory Demo)
import React, { useState, useEffect, useCallback } from 'react';
import type { UserRole, Profile } from '../types';
import { DEMO_PROFILES, DEMO_MEMBERSHIPS } from '../data/demo';
import { supabase, isDemoMode } from '../lib/supabase';
import { demoDataService, staffService, hotelService } from '../services/demoDataService';
import { AuthContext } from './useAuth';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hotel_id?: string;    // Active hotel context (strictly verified via hotel_memberships)
  avatar_url?: string;
}

// Demo credentials map for offline / demo mode
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
  const isDemo = isDemoMode();
  const [isLoading, setIsLoading] = useState(!isDemo && !!supabase);
  const [user, setUser] = useState<AuthUser | null>(() => {
    // In demo mode, restore from localStorage
    if (isDemo) {
      try {
        const stored = localStorage.getItem('staynexa_demo_user');
        if (stored) return JSON.parse(stored) as AuthUser;
      } catch {}
    }
    return null;
  });

  // Purge any legacy browser-stored credential artifacts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('staynexa_custom_credentials');
      } catch {}
    }
  }, []);

  // Production Supabase session restoration
  useEffect(() => {
    if (isDemo || !supabase) return;

    let isMounted = true;

    async function loadSession() {
      try {
        const { data: { session }, error } = await supabase!.auth.getSession();
        if (error || !session?.user) {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Fetch verified user profile (enforces RLS)
        const { data: profile, error: profileErr } = await supabase!
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileErr || !profile) {
          console.error('[StayNexa Auth] Profile not found for authenticated user:', profileErr);
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (!profile.is_active) {
          console.warn('[StayNexa Auth] Authenticated user profile is deactivated:', profile.email);
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Fetch verified active hotel membership
        let hotelId: string | undefined;
        if (profile.role !== 'SUPER_ADMIN') {
          const { data: membership } = await supabase!
            .from('hotel_memberships')
            .select('hotel_id')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (!membership?.hotel_id) {
            console.warn('[StayNexa Auth] No active hotel membership found for staff:', profile.email);
            if (isMounted) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }

          hotelId = membership.hotel_id;
        }

        // Hydrate service layer with active PostgreSQL hotel data
        if (hotelId) {
          try {
            await demoDataService.syncFromSupabase(hotelId);
          } catch (syncErr) {
            console.warn('[StayNexa Auth] Error syncing hotel data on loadSession:', syncErr);
          }
        }

        if (isMounted) {
          setUser({
            id: session.user.id,
            email: profile.email || session.user.email!,
            full_name: profile.full_name || 'Staff Member',
            role: profile.role as UserRole,
            hotel_id: hotelId,
            avatar_url: profile.avatar_url,
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[StayNexa Auth] Error checking session:', err);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isDemo]);

    const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();

    // ─── 1. PRODUCTION SUPABASE AUTH ─────────────────────────────────────────────────────────────────────────────────
    if (!isDemo && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data?.user) {
        const demoCred = DEMO_CREDENTIALS[normalizedEmail];
        if (demoCred && demoCred.password === password) {
          console.warn('[StayNexa Auth] Supabase auth rejected, falling back to verified demo credential');
        } else {
          return { error: error?.message || 'Authentication failed. Please verify credentials.' };
        }
      }

      if (data?.user) {

      // Fetch user profile from database
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileErr) {
        console.error('[StayNexa Auth] Profile lookup error:', profileErr);
        return { error: `Profile lookup failed: ${profileErr.message || 'database error'}` };
      }

      if (!profile) {
        return { error: 'Your account is authenticated, but no staff profile is configured for this platform.' };
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        return { error: 'This user account has been deactivated. Please contact platform administrator.' };
      }

      // Fetch active hotel membership
      let hotelId: string | undefined;
      if (profile.role !== 'SUPER_ADMIN') {
        const { data: membership, error: memErr } = await supabase
          .from('hotel_memberships')
          .select('hotel_id, is_active')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (memErr) {
          console.error('[StayNexa Auth] Error fetching membership:', memErr);
          return { error: 'Unable to verify hotel membership. Please contact your administrator.' };
        }

        if (!membership || !membership.hotel_id) {
          // Check if user has an inactive membership to provide a clear, actionable message
          const { data: inactiveMem } = await supabase
            .from('hotel_memberships')
            .select('id, is_active')
            .eq('user_id', data.user.id)
            .limit(1)
            .maybeSingle();

          await supabase.auth.signOut();
          if (inactiveMem) {
            return { error: 'Your hotel staff membership has been deactivated. Please contact hotel administration.' };
          }
          return { error: 'Your account is authenticated, but no active hotel membership was found.' };
        }

        hotelId = membership.hotel_id;
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: profile.email || data.user.email!,
        full_name: profile.full_name || 'Staff Member',
        role: profile.role as UserRole,
        hotel_id: hotelId,
        avatar_url: profile.avatar_url,
      };

      if (hotelId) {
        try {
          await demoDataService.syncFromSupabase(hotelId);
        } catch (syncErr) {
          console.warn('[StayNexa Auth] Error syncing hotel data on signIn:', syncErr);
        }
      }

      setUser(authUser);
      return {};
      }
    }

    // ─── 2. DEMO MODE IN-MEMORY AUTH ──────────────────────────────────────────
    const creds = DEMO_CREDENTIALS[email.toLowerCase()];
    let profile = creds ? staffService.getById(creds.userId) : staffService.getByEmail(email);

    if (!profile) {
      if (creds) {
        profile = DEMO_PROFILES.find(p => p.user_id === creds.userId);
      } else {
        profile = DEMO_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
      }
    }

    const expectedPassword = creds ? creds.password : 'demo123';
    if (!profile || expectedPassword !== password) {
      return { error: 'Invalid email or password. Use any demo credential (e.g. vikram@grandpalace.com / demo123).' };
    }

    if (!profile.is_active) {
      return { error: 'This user account has been deactivated. Please contact platform administrator.' };
    }

    // Determine hotel context from memberships
    let hotelId: string | undefined;
    if (profile.role !== 'SUPER_ADMIN') {
      const allMemberships = staffService.getAllMemberships();
      const membership = allMemberships.find(m => m.user_id === profile!.user_id && m.is_active)
        || DEMO_MEMBERSHIPS.find(m => m.user_id === profile!.user_id && m.is_active);
      hotelId = membership?.hotel_id;

      if (hotelId) {
        const hotel = hotelService.getById(hotelId);
        if (hotel && (hotel.status === 'SUSPENDED' || hotel.status === 'ARCHIVED')) {
          return { error: `Access restricted. Hotel property "${hotel.name}" is currently ${hotel.status.toLowerCase()}.` };
        }
      }
    }

    const authUser = profileToAuthUser(profile, hotelId);
    setUser(authUser);
    localStorage.setItem('staynexa_demo_user', JSON.stringify(authUser));
    return {};
  }, [isDemo]);

  const signOut = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('staynexa_demo_user');
    if (!isDemo && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[StayNexa Auth] Error during Supabase signOut:', err);
      }
    }
  }, [isDemo]);

  const switchHotel = useCallback(async (hotelId: string) => {
    if (!user) return;
    const updated = { ...user, hotel_id: hotelId };
    setUser(updated);
    if (isDemo) {
      localStorage.setItem('staynexa_demo_user', JSON.stringify(updated));
    } else if (supabase) {
      await demoDataService.syncFromSupabase(hotelId);
    }
  }, [user, isDemo]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isDemo, signIn, signOut, switchHotel }}>
      {children}
    </AuthContext.Provider>
  );
}
