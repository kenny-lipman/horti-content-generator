import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getImportTemplateById, createImportJob, updateImportJob } from '@/lib/data/import'
import { parseExcelFile, normalizeColumnMappings } from '@/lib/excel/parser'
import { validateAllRows } from '@/lib/excel/validator'
import { createAdminClient } from '@/lib/supabase/server'
import type {
  PlantAttributesInsert,
  CutFlowerAttributesInsert,
  AccessoryInsert,
  RetailAttributesInsert,
} from '@/lib/supabase/types'

export const maxDuration = 120 // 2 minuten max

// ============================================
// POST: Upload + Parse + Validate
// ============================================

export async function POST(request: NextRequest) {
  // Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  // Parse FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: 'Ongeldig formulier', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  const templateId = formData.get('templateId')

  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: 'Geen bestand geupload', code: 'NO_FILE' },
      { status: 400 }
    )
  }

  if (!templateId || typeof templateId !== 'string') {
    return Response.json(
      { error: 'Template ID is verplicht', code: 'NO_TEMPLATE' },
      { status: 400 }
    )
  }

  // Valideer bestandstype
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
    return Response.json(
      { error: 'Alleen Excel bestanden (.xlsx, .xls) zijn toegestaan', code: 'INVALID_FILE_TYPE' },
      { status: 400 }
    )
  }

  // Valideer bestandsgrootte (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return Response.json(
      { error: 'Bestand mag niet groter zijn dan 10MB', code: 'FILE_TOO_LARGE' },
      { status: 400 }
    )
  }

  // Haal template op
  const template = await getImportTemplateById(templateId)
  if (!template) {
    return Response.json(
      { error: 'Import template niet gevonden', code: 'TEMPLATE_NOT_FOUND' },
      { status: 404 }
    )
  }

  // Parse het Excel bestand
  let rows
  try {
    const buffer = await file.arrayBuffer()
    // Converteer column_mappings van DB formaat naar ColumnMapping[]
    const columnMappings = normalizeColumnMappings(template.column_mappings)
    if (!columnMappings || columnMappings.length === 0) {
      return Response.json(
        { error: 'Template heeft geen geldige kolom mappings', code: 'INVALID_MAPPINGS' },
        { status: 400 }
      )
    }
    rows = parseExcelFile(buffer, columnMappings)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return Response.json(
      { error: `Fout bij verwerken Excel: ${message}`, code: 'PARSE_ERROR' },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return Response.json(
      { error: 'Het Excel bestand bevat geen data rijen', code: 'EMPTY_FILE' },
      { status: 400 }
    )
  }

  // Valideer alle rijen
  const validation = validateAllRows(rows, template.product_type)

  return Response.json({
    rows,
    errors: validation.errors,
    validCount: validation.validCount,
    totalCount: rows.length,
    templateId: template.id,
    productType: template.product_type,
  })
}

// ============================================
// PUT: Bevestig import — maak producten aan
// ============================================

export async function PUT(request: NextRequest) {
  // Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  // Parse body
  let body: {
    rows: Array<{ rowNumber: number; data: Record<string, unknown> }>
    templateId: string
    filename: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Ongeldig JSON body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const { rows, templateId, filename } = body

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return Response.json(
      { error: 'Geen rijen om te importeren', code: 'NO_ROWS' },
      { status: 400 }
    )
  }

  // Haal template op
  const template = await getImportTemplateById(templateId)
  if (!template) {
    return Response.json(
      { error: 'Import template niet gevonden', code: 'TEMPLATE_NOT_FOUND' },
      { status: 404 }
    )
  }

  // Maak import job aan
  const job = await createImportJob({
    organizationId: auth.orgId,
    templateId,
    filename: filename || 'import.xlsx',
    fileUrl: '', // Geen opslag nodig voor directe import
    totalRows: rows.length,
    createdBy: auth.userId,
  })

  if (!job) {
    return Response.json(
      { error: 'Kan import job niet aanmaken', code: 'JOB_CREATE_ERROR' },
      { status: 500 }
    )
  }

  // Update job status naar processing
  await updateImportJob(job.id, { status: 'processing' })

  // Maak producten aan
  const supabase = createAdminClient()
  let successCount = 0
  let errorCount = 0
  const errorLog: Array<{ row: number; error: string }> = []

  for (const row of rows) {
    try {
      const data = row.data
      const productType = data.product_type
        ? String(data.product_type).toLowerCase().trim()
        : template.product_type

      // Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: String(data.name || '').trim(),
          sku: data.sku ? String(data.sku).trim() : null,
          product_type: productType,
          category: data.category ? String(data.category).trim() : null,
          description: data.description ? String(data.description).trim() : null,
          organization_id: auth.orgId,
          is_active: true,
        })
        .select()
        .single()

      if (productError || !product) {
        throw new Error(productError?.message || 'Product insert mislukt')
      }

      // Insert type-specifieke attributen
      if (productType === 'plant') {
        const plantAttrs = {
          product_id: product.id,
        } as PlantAttributesInsert
        if (data.pot_diameter) plantAttrs.pot_diameter = Number(data.pot_diameter)
        if (data.plant_height) plantAttrs.plant_height = Number(data.plant_height)
        if (data.vbn_code) plantAttrs.vbn_code = String(data.vbn_code)
        if (data.availability) plantAttrs.availability = String(data.availability)
        if (data.is_artificial !== null && data.is_artificial !== undefined && data.is_artificial !== '')
          plantAttrs.is_artificial = parseBooleanValue(data.is_artificial)
        if (data.can_bloom !== null && data.can_bloom !== undefined && data.can_bloom !== '')
          plantAttrs.can_bloom = parseBooleanValue(data.can_bloom)
        if (data.carrier_fust_code) plantAttrs.carrier_fust_code = Number(data.carrier_fust_code)
        if (data.carrier_fust_type) plantAttrs.carrier_fust_type = String(data.carrier_fust_type)
        if (data.carrier_carriage_type) plantAttrs.carrier_carriage_type = String(data.carrier_carriage_type)
        if (data.carrier_layers) plantAttrs.carrier_layers = Number(data.carrier_layers)
        if (data.carrier_per_layer) plantAttrs.carrier_per_layer = Number(data.carrier_per_layer)
        if (data.carrier_units) plantAttrs.carrier_units = Number(data.carrier_units)

        const { error } = await supabase.from('plant_attributes').insert(plantAttrs)
        if (error) {
          console.error(`[import] Plant attributes fout voor rij ${row.rowNumber}:`, error.message)
        }
      }

      if (productType === 'cut_flower') {
        const flowerAttrs = {
          product_id: product.id,
        } as CutFlowerAttributesInsert
        if (data.stem_length) flowerAttrs.stem_length = Number(data.stem_length)
        if (data.bunch_size) flowerAttrs.bunch_size = Number(data.bunch_size)
        if (data.vase_life_days) flowerAttrs.vase_life_days = Number(data.vase_life_days)
        if (data.color_primary) flowerAttrs.color_primary = String(data.color_primary)
        if (data.color_secondary) flowerAttrs.color_secondary = String(data.color_secondary)
        if (data.season) flowerAttrs.season = String(data.season)
        if (data.fragrant !== null && data.fragrant !== undefined && data.fragrant !== '')
          flowerAttrs.fragrant = parseBooleanValue(data.fragrant)

        const { error } = await supabase.from('cut_flower_attributes').insert(flowerAttrs)
        if (error) {
          console.error(`[import] Cut flower attributes fout voor rij ${row.rowNumber}:`, error.message)
        }
      }

      if (productType === 'accessory') {
        const accessoryAttrs = {
          product_id: product.id,
          accessory_type: String(data.accessory_type || 'pot').toLowerCase().trim(),
        } as AccessoryInsert
        if (data.material) accessoryAttrs.material = String(data.material)
        if (data.color) accessoryAttrs.color = String(data.color)

        const { error } = await supabase.from('accessories').insert(accessoryAttrs)
        if (error) {
          console.error(`[import] Accessories fout voor rij ${row.rowNumber}:`, error.message)
        }
      }

      // Retail attributes (optioneel, voor elk type)
      if (data.price || data.compare_at_price || data.short_description || data.long_description) {
        const retailAttrs = {
          product_id: product.id,
        } as RetailAttributesInsert
        if (data.price) retailAttrs.price = Number(data.price)
        if (data.compare_at_price) retailAttrs.compare_at_price = Number(data.compare_at_price)
        if (data.currency) retailAttrs.currency = String(data.currency)
        if (data.short_description) retailAttrs.short_description = String(data.short_description)
        if (data.long_description) retailAttrs.long_description = String(data.long_description)

        const { error } = await supabase.from('retail_attributes').insert(retailAttrs)
        if (error) {
          console.error(`[import] Retail attributes fout voor rij ${row.rowNumber}:`, error.message)
        }
      }

      successCount++
    } catch (err) {
      errorCount++
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      errorLog.push({ row: row.rowNumber, error: message })
      console.error(`[import] Fout bij rij ${row.rowNumber}:`, message)
    }

    // Update voortgang
    await updateImportJob(job.id, {
      processedRows: successCount + errorCount,
    })
  }

  // Markeer als voltooid
  await updateImportJob(job.id, {
    status: errorCount === rows.length ? 'failed' : 'completed',
    processedRows: successCount + errorCount,
    errorRows: errorCount,
    errors: errorLog,
    completedAt: new Date().toISOString(),
  })

  return Response.json({
    success: true,
    jobId: job.id,
    totalRows: rows.length,
    successCount,
    errorCount,
    errors: errorLog,
  })
}

// ============================================
// Helpers
// ============================================

function parseBooleanValue(value: unknown): boolean {
  const str = String(value).toLowerCase().trim()
  return ['true', 'ja', '1', 'yes'].includes(str)
}
