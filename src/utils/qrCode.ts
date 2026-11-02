/**
 * Dynamic Base URL & Guest Portal QR Code Utility
 * Automatically resolves current window.location.origin, configured tunnel, or cloud URL
 * to prevent routing errors on live cloud deployments or mobile phone scans.
 */

interface RoomLikeTarget {
  id?: string;
  qrToken?: string;
  token?: string;
  number?: string;
}

export const getStoredTunnelUrl = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('staynexa_public_tunnel_url');
      if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
    } catch {}
  }
  return null;
};

export const setCustomPublicBaseUrl = (url: string | null): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (url && url.trim()) {
        window.localStorage.setItem('staynexa_public_tunnel_url', url.trim().replace(/\/+$/, ''));
      } else {
        window.localStorage.removeItem('staynexa_public_tunnel_url');
      }
      window.dispatchEvent(new Event('staynexa_base_url_changed'));
    } catch {}
  }
};

/**
 * Returns the current application base URL for QR codes.
 * Prefers explicit user override, live public domain, or Cloud URL over raw localhost.
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    // 1. Explicit user override in localStorage (e.g. active tunnel preview)
    const storedTunnel = getStoredTunnelUrl();
    if (storedTunnel) {
      return storedTunnel;
    }

    const origin = window.location.origin || '';
    const hostname = window.location.hostname || '';

    // 2. If currently accessed via live cloud domain or non-localhost hostname, use origin directly
    if (origin && hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }

    // 3. Environment variable override
    if (import.meta.env.VITE_PUBLIC_URL) {
      return (import.meta.env.VITE_PUBLIC_URL as string).replace(/\/+$/, '');
    }
    if (import.meta.env.VITE_APP_URL) {
      return (import.meta.env.VITE_APP_URL as string).replace(/\/+$/, '');
    }

    // 4. Default to live Vercel cloud URL when accessed from localhost so scanned QRs work on mobile phones
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://staynexa-nine.vercel.app';
    }

    if (origin) {
      return origin;
    }
  }
  return (import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_APP_URL || 'https://staynexa-nine.vercel.app').replace(/\/+$/, '');
};

/**
 * Generates the canonical Guest Portal access URL for a room QR token or room object.
 * Formats canonical route to `${getBaseUrl()}/guest/${room.qrToken || room.id}`.
 */
export const generateGuestPortalUrl = (target?: string | RoomLikeTarget | null): string => {
  const origin = getBaseUrl();
  if (!target) return `${origin}/guest/101`;
  if (typeof target === 'string') {
    return `${origin}/guest/${target}`;
  }
  const identifier = target.qrToken || target.token || target.id || target.number || '101';
  return `${origin}/guest/${identifier}`;
};
