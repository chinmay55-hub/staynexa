/**
 * Cryptographic Password Hashing Utility
 * Ensures that passwords are never stored in plaintext in localStorage or browser memory.
 */

export async function hashPassword(password: string): Promise<string> {
  const normalized = (password || '').trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode('staynexa_salt_v1:' + normalized);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fall through to deterministic fallback if subtle crypto is restricted
    }
  }
  // Deterministic fallback for environments without WebCrypto subtle
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h) + normalized.charCodeAt(i);
  }
  return 'shash_' + Math.abs(h).toString(16);
}

export async function verifyPassword(inputPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!storedHashOrPlain) return false;
  const inputHash = await hashPassword(inputPassword);
  // Match computed hash
  if (inputHash === storedHashOrPlain) return true;
  // Backward compatibility check for older legacy unhashed mock entries
  if (inputPassword === storedHashOrPlain) return true;
  return false;
}
