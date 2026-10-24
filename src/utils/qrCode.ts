/**
 * Dynamic Production Base URL & Guest Portal QR Code Utility
 * Automatically resolves current window.location.origin or environment URL
 * to prevent 404 routing errors on live cloud deployments (e.g. Vercel).
 */

const baseUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : (import.meta.env.VITE_APP_URL || 'https://staynexa-nine.vercel.app');

interface RoomLikeTarget {
  id?: string;
  qrToken?: string;
  token?: string;
  number?: string;
}

/**
 * Generates the canonical Guest Portal access URL for a room QR token or room object.
 * Formats canonical route to `${window.location.origin}/q/${room.qrToken || room.id}`.
 */
export const generateGuestPortalUrl = (target?: string | RoomLikeTarget | null): string => {
  if (!target) return `${baseUrl}/q/101`;
  if (typeof target === 'string') {
    return `${baseUrl}/q/${target}`;
  }
  const identifier = target.qrToken || target.token || target.id || target.number || '101';
  return `${baseUrl}/q/${identifier}`;
};

/**
 * Returns the current application base URL.
 */
export const getBaseUrl = (): string => {
  return baseUrl;
};
