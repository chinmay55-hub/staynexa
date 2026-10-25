// StayNexa Supabase Client Configuration
// Handles initialization, environment checking, and dual-mode determination

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appMode = import.meta.env.VITE_APP_MODE;

// Validate that service role key is NEVER exposed on client
const serviceRoleKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY'];
for (const key of serviceRoleKeys) {
  if ((import.meta.env as Record<string, string | undefined>)[key]) {
    console.error(`[SECURITY FATAL] ${key} detected in client environment! Never expose service role key to frontend.`);
  }
}

/**
 * Checks whether Supabase credentials are configured with non-placeholder values
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-anon-key')) {
    return false;
  }
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    return false;
  }
  return true;
}

/**
 * Determines whether the app is currently running in Demo Mode
 */
export function isDemoMode(): boolean {
  // In production mode, NEVER silently fall back to demo mode
  if (appMode === 'production') {
    if (!isSupabaseConfigured()) {
      console.error('[SECURITY FATAL] VITE_APP_MODE is set to production but Supabase credentials are missing or invalid.');
    }
    return false;
  }
  // In demo or unset mode: demo mode if credentials missing OR explicitly set to 'demo'
  if (!isSupabaseConfigured()) return true;
  return appMode === 'demo';
}

/**
 * Helper to obtain the Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

/**
 * Supabase client instance (or null in demo mode when credentials missing)
 */
export let supabase: SupabaseClient | null = isSupabaseConfigured()
  ? (() => {
      try {
        return createClient(supabaseUrl!, supabaseAnonKey!, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        });
      } catch (e) {
        console.warn('[StayNexa] Failed to initialize Supabase client with current credentials:', e);
        return null;
      }
    })()
  : null;

/**
 * Test helper to inject a mock SupabaseClient during unit testing
 */
export function setSupabaseClientForTesting(client: SupabaseClient | null) {
  supabase = client;
}
