/**
 * Cryptographic Password Hashing & Verification Utility (PBKDF2-HMAC-SHA512)
 *
 * Implements OWASP-recommended PBKDF2 with SHA-512 and 100,000 iterations.
 * Uses a cryptographically random 16-byte per-password salt.
 * 
 * SECURITY POLICY:
 * - Never uses fast single-round SHA-256 or MD5.
 * - Never permits plaintext comparisons or fallback.
 * - Employs timing-safe constant-time string comparisons.
 * - Credentials must NEVER be stored in client-readable storage (e.g., localStorage).
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-512';
const SALT_BYTE_LENGTH = 16;
const DERIVED_KEY_BYTE_LENGTH = 32;

/**
 * Constant-time string equality check to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Derives a PBKDF2-HMAC-SHA512 hash using Web Crypto API
 */
async function derivePbkdf2Hash(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    DERIVED_KEY_BYTE_LENGTH * 8
  );

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes a plaintext password using salted PBKDF2-HMAC-SHA512.
 * Returns formatted string: pbkdf2:sha512:100000:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = new Uint8Array(SALT_BYTE_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(salt);
  } else {
    // Fallback for non-browser Node test runners
    const { randomBytes } = await import('crypto');
    salt.set(randomBytes(SALT_BYTE_LENGTH));
  }

  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const hashHex = await derivePbkdf2Hash(password, salt);
  return `pbkdf2:sha512:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 * Strict: Rejects plaintext passwords and malformed hashes unconditionally.
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  if (!inputPassword || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  // Strictly enforce pbkdf2 format: pbkdf2:sha512:<iterations>:<saltHex>:<hashHex>
  const parts = storedHash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha512') {
    // Malformed or deprecated fast hash — reject strictly, NO plaintext fallback
    return false;
  }

  const saltHex = parts[3];
  const expectedHashHex = parts[4];
  if (!saltHex || !expectedHashHex || saltHex.length !== SALT_BYTE_LENGTH * 2) {
    return false;
  }

  try {
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    const computedHashHex = await derivePbkdf2Hash(inputPassword, salt);
    return constantTimeEqual(computedHashHex, expectedHashHex);
  } catch {
    return false;
  }
}
