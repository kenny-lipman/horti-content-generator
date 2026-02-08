/**
 * Image type mapping: legacy (hyphens) ↔ database (underscores).
 * Dit bestand is client-safe (geen 'server-only').
 */

const LEGACY_TO_DB_IMAGE_TYPE: Record<string, string> = {
  'white-background': 'white_background',
  'measuring-tape': 'measuring_tape',
  'detail': 'detail',
  'composite': 'composite',
  'tray': 'tray',
  'lifestyle': 'lifestyle',
  'seasonal': 'seasonal',
  'danish-cart': 'danish_cart',
}

const DB_TO_LEGACY_IMAGE_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_DB_IMAGE_TYPE).map(([k, v]) => [v, k])
)

export function toDbImageType(legacyType: string): string {
  return LEGACY_TO_DB_IMAGE_TYPE[legacyType] ?? legacyType
}

export function toLegacyImageType(dbType: string): string {
  return DB_TO_LEGACY_IMAGE_TYPE[dbType] ?? dbType
}
