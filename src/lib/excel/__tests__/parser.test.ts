import { normalizeColumnMappings } from '../parser'

describe('normalizeColumnMappings', () => {
  it('returns null for null input', () => {
    expect(normalizeColumnMappings(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(normalizeColumnMappings(undefined)).toBeNull()
  })

  it('returns the array as-is when items have valid excelColumn and dbField', () => {
    const input = [
      { excelColumn: 'Naam', dbField: 'name' },
      { excelColumn: 'SKU', dbField: 'sku' },
    ]
    const result = normalizeColumnMappings(input)
    expect(result).toEqual(input)
  })

  it('returns null when array items are missing excelColumn', () => {
    const input = [
      { dbField: 'name' },
      { excelColumn: 'SKU', dbField: 'sku' },
    ]
    expect(normalizeColumnMappings(input)).toBeNull()
  })

  it('returns null when array items are missing dbField', () => {
    const input = [
      { excelColumn: 'Naam' },
    ]
    expect(normalizeColumnMappings(input)).toBeNull()
  })

  it('returns null when array contains null items', () => {
    const input = [null, { excelColumn: 'SKU', dbField: 'sku' }]
    expect(normalizeColumnMappings(input)).toBeNull()
  })

  it('returns an empty array for an empty array input', () => {
    // Array.every() on an empty array returns true (vacuous truth)
    const result = normalizeColumnMappings([])
    expect(result).toEqual([])
  })

  it('converts object format { dbField: excelColumn } to ColumnMapping array', () => {
    const input = { name: 'Naam', sku: 'SKU' }
    const result = normalizeColumnMappings(input)
    expect(result).toEqual(
      expect.arrayContaining([
        { dbField: 'name', excelColumn: 'Naam' },
        { dbField: 'sku', excelColumn: 'SKU' },
      ])
    )
    expect(result).toHaveLength(2)
  })

  it('returns null for an empty object', () => {
    expect(normalizeColumnMappings({})).toBeNull()
  })

  it('filters out non-string values when converting from object format', () => {
    const input = { name: 'Naam', count: 42 }
    const result = normalizeColumnMappings(input)
    // Only the string entry survives the filter
    expect(result).toEqual([{ dbField: 'name', excelColumn: 'Naam' }])
  })

  it('returns null for a string input', () => {
    expect(normalizeColumnMappings('some string')).toBeNull()
  })

  it('returns null for a number input', () => {
    expect(normalizeColumnMappings(42)).toBeNull()
  })

  it('returns null for a boolean input', () => {
    expect(normalizeColumnMappings(true)).toBeNull()
  })
})
