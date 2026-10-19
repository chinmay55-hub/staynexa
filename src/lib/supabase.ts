// StayNexa Supabase Client Configuration
// Handles initialization, environment checking, and dual-mode determination

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appMode = import.meta.env.VITE_APP_MODE || 'demo';

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
  return true;
}

/**
 * Determines whether the app is currently running in Demo Mode
 */
export function isDemoMode(): boolean {
  return appMode === 'demo' || !isSupabaseConfigured();
}

/**
 * Supabase client instance (or null in demo mode when credentials missing)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
