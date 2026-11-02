/**
 * StayNexa Tenant & Hotel Identifier Normalization Utility
 * Maps between human-readable demo IDs ('hotel-001') and canonical database UUIDs ('00000000-0000-0000-0000-000000000001').
 * Guarantees cross-environment compatibility between Demo, Staging, and Production.
 */

export const HOTEL_ID_MAP: Record<string, string> = {
  // Grand Palace Hotel
  'hotel-001': '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001': 'hotel-001',

  // The Willow Boutique
  'hotel-002': '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002': 'hotel-002',

  // Azure Cove Resort
  'hotel-003': '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003': 'hotel-003',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the string is a valid RFC4122 UUID
 */
export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Converts any hotel identifier to its canonical Supabase PostgreSQL UUID.
 * If already a valid UUID, returns it unchanged.
 */
export function toDbHotelId(hotelId: string): string {
  if (!hotelId) return hotelId;
  const trimmed = hotelId.trim();
  if (isUuid(trimmed)) return trimmed;
  return HOTEL_ID_MAP[trimmed] || trimmed;
}

/**
 * Checks whether two hotel identifiers refer to the same tenant property,
 * regardless of whether one is a demo slug and the other is a database UUID.
 */
export function isSameHotel(idA?: string | null, idB?: string | null): boolean {
  if (!idA || !idB) return false;
  const a = idA.trim();
  const b = idB.trim();
  if (a === b) return true;
  return HOTEL_ID_MAP[a] === b || HOTEL_ID_MAP[b] === a || toDbHotelId(a) === toDbHotelId(b);
}
