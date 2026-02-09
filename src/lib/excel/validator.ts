// ============================================
// Types
// ============================================

export interface ValidationError {
  /** Rijnummer in het Excel bestand */
  row: number
  /** Veldnaam die de fout veroorzaakt */
  field: string
  /** Foutmelding */
  message: string
}

export interface ValidationResult {
  /** Of de rij geldig is */
  valid: boolean
  /** Lijst van fouten */
  errors: ValidationError[]
}

// ============================================
// Constanten
// ============================================

const VALID_PRODUCT_TYPES = ['plant', 'cut_flower', 'accessory']

const VALID_ACCESSORY_TYPES = [
  'pot',
  'vase',
  'stand',
  'basket',
  'cover',
  'decoration',
  'packaging',
]

// ============================================
// Validator
// ============================================

/**
 * Valideer een enkele product rij op basis van het product type.
 * Controleert verplichte velden, formaten en numerieke waarden.
 */
export function validateProductRow(
  row: Record<string, unknown>,
  productType: string,
  rowNumber: number
): ValidationResult {
  const errors: ValidationError[] = []

  // --- Verplichte velden ---

  // Productnaam is altijd verplicht
  if (!row.name || String(row.name).trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'name',
      message: 'Productnaam is verplicht',
    })
  }

  // Product type moet geldig zijn
  const effectiveType = row.product_type
    ? String(row.product_type).toLowerCase().trim()
    : productType

  if (!VALID_PRODUCT_TYPES.includes(effectiveType)) {
    errors.push({
      row: rowNumber,
      field: 'product_type',
      message: `Ongeldig producttype "${effectiveType}". Gebruik: ${VALID_PRODUCT_TYPES.join(', ')}`,
    })
  }

  // --- SKU formaat ---
  if (row.sku !== null && row.sku !== undefined && row.sku !== '') {
    const sku = String(row.sku).trim()
    // SKU mag alleen letters, cijfers, streepjes en underscores bevatten
    if (!/^[a-zA-Z0-9_-]+$/.test(sku)) {
      errors.push({
        row: rowNumber,
        field: 'sku',
        message: 'SKU mag alleen letters, cijfers, streepjes (-) en underscores (_) bevatten',
      })
    }
  }

  // --- Numerieke velden: positief getal wanneer aanwezig ---

  const numericFields = [
    { field: 'pot_diameter', label: 'Potdiameter' },
    { field: 'plant_height', label: 'Planthoogte' },
    { field: 'stem_length', label: 'Steellengte' },
    { field: 'bunch_size', label: 'Bosgrootte' },
    { field: 'vase_life_days', label: 'Vaaslevensduur' },
    { field: 'price', label: 'Prijs' },
    { field: 'compare_at_price', label: 'Vergelijkprijs' },
  ]

  for (const { field, label } of numericFields) {
    const value = row[field]
    if (value !== null && value !== undefined && value !== '') {
      const num = Number(value)
      if (isNaN(num)) {
        errors.push({
          row: rowNumber,
          field,
          message: `${label} moet een getal zijn`,
        })
      } else if (num < 0) {
        errors.push({
          row: rowNumber,
          field,
          message: `${label} moet een positief getal zijn`,
        })
      }
    }
  }

  // --- Boolean velden ---
  const booleanFields = ['is_artificial', 'can_bloom', 'fragrant']
  for (const field of booleanFields) {
    const value = row[field]
    if (value !== null && value !== undefined && value !== '') {
      const strValue = String(value).toLowerCase().trim()
      const validBooleans = ['true', 'false', 'ja', 'nee', '1', '0', 'yes', 'no']
      if (!validBooleans.includes(strValue)) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} moet een ja/nee waarde zijn (ja, nee, true, false)`,
        })
      }
    }
  }

  // --- Type-specifieke validatie ---

  if (effectiveType === 'accessory') {
    const accessoryType = row.accessory_type
    if (!accessoryType || String(accessoryType).trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'accessory_type',
        message: 'Accessoire type is verplicht voor accessoires',
      })
    } else if (!VALID_ACCESSORY_TYPES.includes(String(accessoryType).toLowerCase().trim())) {
      errors.push({
        row: rowNumber,
        field: 'accessory_type',
        message: `Ongeldig accessoire type. Gebruik: ${VALID_ACCESSORY_TYPES.join(', ')}`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Valideer meerdere rijen en verzamel alle fouten.
 */
export function validateAllRows(
  rows: Array<{ rowNumber: number; data: Record<string, unknown> }>,
  productType: string
): { validCount: number; errors: ValidationError[] } {
  const allErrors: ValidationError[] = []
  let validCount = 0

  for (const row of rows) {
    const result = validateProductRow(row.data, productType, row.rowNumber)
    if (result.valid) {
      validCount++
    }
    allErrors.push(...result.errors)
  }

  return { validCount, errors: allErrors }
}
