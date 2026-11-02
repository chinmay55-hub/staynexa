import { vi } from 'vitest';
import * as supabaseLib from '../lib/supabase';

/**
 * Forces demo-mode resolution for a test block so it never reaches the live backend.
 * Returns a function that restores the real implementations.
 */
export function pinDemoMode(): () => void {
  const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(true);
  const configuredSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(false);
  return () => {
    demoSpy.mockRestore();
    configuredSpy.mockRestore();
  };
}
