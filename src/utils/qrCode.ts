/**
 * Dynamic Base URL & Guest Portal QR Code Utility
 * Automatically resolves current window.location.origin or environment URL
 * to prevent 404 routing errors on live cloud deployments or local tunnels.
 */

interface RoomLikeTarget {
  id?: string;
  qrToken?: string;
  token?: string;
  number?: string;
}

/**
 * Returns the current application base URL.
 * Prefers active public tunnel/domain over localhost so scanned QRs work on mobile phones.
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin || '';
    const hostname = window.location.hostname || '';

    // 1. If currently accessed via a public tunnel, domain, or LAN IP, use origin directly
    if (origin && hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
    // 2. If explicitly configured in localStorage (e.g. active tunnel preview)
    try {
      if (window.localStorage) {
        const storedTunnel = window.localStorage.getItem('staynexa_public_tunnel_url');
        if (storedTunnel) {
          return storedTunnel.replace(/\/+$/, '');
        }
      }
    } catch {}
    // 3. Environment variable override
    if (import.meta.env.VITE_PUBLIC_URL) {
      return (import.meta.env.VITE_PUBLIC_URL as string).replace(/\/+$/, '');
    }
    if (import.meta.env.VITE_APP_URL) {
      return (import.meta.env.VITE_APP_URL as string).replace(/\/+$/, '');
    }
    if (origin) {
      return origin;
    }
  }
  return (import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_APP_URL || 'https://staynexa-nine.vercel.app').replace(/\/+$/, '');
};

/**
 * Generates the canonical Guest Portal access URL for a room QR token or room object.
 * Formats canonical route to `${getBaseUrl()}/q/${room.qrToken || room.id}`.
 */
export const generateGuestPortalUrl = (target?: string | RoomLikeTarget | null): string => {
  const origin = getBaseUrl();
  if (!target) return `${origin}/q/101`;
  if (typeof target === 'string') {
    return `${origin}/q/${target}`;
  }
  const identifier = target.qrToken || target.token || target.id || target.number || '101';
  return `${origin}/q/${identifier}`;
};
