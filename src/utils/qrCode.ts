/**
 * Dynamic Production Base URL & Guest Portal QR Code Utility
 * Automatically resolves current window.location.origin or environment URL
 * to prevent 404 routing errors on live cloud deployments (e.g. Vercel).
 */

const baseUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : (import.meta.env.VITE_APP_URL || 'https://staynexa-nine.vercel.app');

/**
 * Generates the canonical Guest Portal access URL for a room QR token.
 * Formats canonical route to `/q/:token` with full origin.
 */
export const generateGuestPortalUrl = (token: string): string => {
  return `${baseUrl}/q/${token}`;
};

/**
 * Returns the current application base URL.
 */
export const getBaseUrl = (): string => {
  return baseUrl;
};
