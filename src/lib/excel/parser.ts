import * as XLSX from 'xlsx'

// ============================================
// Types
// ============================================

export interface ColumnMapping {
  /** Kolomnaam in het Excel bestand */
  excelColumn: string
  /** Database veldnaam */
  dbField: string
  /** Of het veld verplicht is */
  required?: boolean
  /** Optionele transformatie functie */
  transform?: (value: unknown) => unknown
}

/**
 * Normaliseer column_mappings van database formaat naar ColumnMapping[].
 * DB slaat op als object { dbField: "Excel Kolom" }, code verwacht array.
 * Retourneert null als het formaat ongeldig is.
 */
export function normalizeColumnMappings(raw: unknown): ColumnMapping[] | null {
  if (!raw) return null

  // Al een array: valideer dat items het juiste formaat hebben
  if (Array.isArray(raw)) {
    const valid = raw.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.excelColumn === 'string' &&
        typeof item.dbField === 'string'
    )
    return valid ? raw as ColumnMapping[] : null
  }

  // Object formaat: { dbField: excelColumn }
  if (typeof raw === 'object') {
    try {
      const entries = Object.entries(raw as Record<string, unknown>)
      if (entries.length === 0) return null
      return entries
        .filter(([, v]) => typeof v === 'string')
        .map(([dbField, excelColumn]) => ({
          dbField,
          excelColumn: String(excelColumn),
        }))
    } catch {
      return null
    }
  }

  return null
}

export interface ParsedRow {
  /** Rijnummer in het Excel bestand (1-based, exclusief header) */
  rowNumber: number
  /** Getransformeerde data met database veldnamen */
  data: Record<string, unknown>
  /** Ruwe data met Excel kolomnamen */
  raw: Record<string, unknown>
}

// ============================================
// Parser
// ============================================

/**
 * Parse een Excel bestand (ArrayBuffer) met de gegeven kolom mappings.
 * Leest het eerste werkblad en mapt kolommen op basis van de header rij.
 */
export function parseExcelFile(
  buffer: ArrayBuffer,
  columnMappings: ColumnMapping[]
): ParsedRow[] {
  // Lees de workbook
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Pak het eerste werkblad
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Het Excel bestand bevat geen werkbladen')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error('Kan het werkblad niet lezen')
  }

  // Converteer naar JSON array van objecten (header rij als keys)
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false, // Alle waarden als string voor consistente verwerking
  })

  if (rawRows.length === 0) {
    return []
  }

  // Bouw een lookup map: lowercase Excel kolom naam → ColumnMapping
  const mappingLookup = new Map<string, ColumnMapping>()
  for (const mapping of columnMappings) {
    mappingLookup.set(mapping.excelColumn.toLowerCase().trim(), mapping)
  }

  // Parse elke rij
  const parsedRows: ParsedRow[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i]
    if (!rawRow) continue

    const data: Record<string, unknown> = {}
    const raw: Record<string, unknown> = { ...rawRow }

    // Loop door alle Excel kolommen en map ze
    for (const [excelKey, value] of Object.entries(rawRow)) {
      const mapping = mappingLookup.get(excelKey.toLowerCase().trim())
      if (mapping) {
        // Pas transformatie toe als die er is
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        data[mapping.dbField] = transformedValue
      }
    }

    // Sla volledig lege rijen over (alle waarden null of leeg)
    const hasData = Object.values(data).some(
      (v) => v !== null && v !== undefined && v !== ''
    )
    if (!hasData) continue

    parsedRows.push({
      rowNumber: i + 2, // +2 want i is 0-based en rij 1 is de header
      data,
      raw,
    })
  }

  return parsedRows
}

/**
 * Genereer een voorbeeld Excel bestand op basis van kolom mappings en voorbeeld data.
 * Retourneert een ArrayBuffer die als .xlsx download kan worden verstuurd.
 */
export function generateSampleExcel(
  columnMappings: ColumnMapping[],
  sampleData?: Record<string, unknown>
): ArrayBuffer {
  // Maak headers van de Excel kolom namen
  const headers = columnMappings.map((m) => m.excelColumn)

  // Maak een voorbeeld rij als er sample data is
  const rows: unknown[][] = []
  if (sampleData) {
    const sampleRow = columnMappings.map((m) => {
      const value = sampleData[m.dbField]
      return value !== undefined && value !== null ? String(value) : ''
    })
    rows.push(sampleRow)
  }

  // Maak werkblad
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Stel kolom breedte in
  worksheet['!cols'] = headers.map((h) => ({
    wch: Math.max(h.length + 4, 15),
  }))

  // Maak workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Producten')

  // Schrijf naar buffer
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return buffer
}
