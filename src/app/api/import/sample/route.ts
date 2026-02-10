import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getImportTemplateById } from '@/lib/data/import'
import { generateSampleExcel } from '@/lib/excel/parser'
import type { ColumnMapping } from '@/lib/excel/parser'

// ============================================
// GET: Download voorbeeld Excel bestand
// ============================================

export async function GET(request: NextRequest) {
  // Auth check
  try {
    await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  // Haal template ID op uit query params
  const { searchParams } = new URL(request.url)
  const templateId = searchParams.get('template_id')

  if (!templateId) {
    return Response.json(
      { error: 'Template ID is verplicht', code: 'NO_TEMPLATE_ID' },
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

  // Genereer voorbeeld data op basis van product type
  const sampleData = getSampleDataForType(template.product_type)

  // Converteer column_mappings van DB formaat naar ColumnMapping[]
  // DB slaat op als { dbField: excelColumn }, code verwacht [{ excelColumn, dbField }]
  const rawMappings = template.column_mappings as unknown
  let columnMappings: ColumnMapping[]

  if (Array.isArray(rawMappings)) {
    columnMappings = rawMappings
  } else if (rawMappings && typeof rawMappings === 'object') {
    columnMappings = Object.entries(rawMappings).map(([dbField, excelColumn]) => ({
      dbField,
      excelColumn: String(excelColumn),
    }))
  } else {
    return Response.json(
      { error: 'Template heeft geen geldige kolom mappings', code: 'INVALID_MAPPINGS' },
      { status: 400 }
    )
  }

  // Genereer Excel bestand
  const buffer = generateSampleExcel(columnMappings, sampleData)

  // Maak een veilige bestandsnaam
  const safeName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="voorbeeld-${safeName}.xlsx"`,
      'Cache-Control': 'no-cache',
    },
  })
}

// ============================================
// Voorbeeld data per product type
// ============================================

function getSampleDataForType(productType: string): Record<string, unknown> {
  switch (productType) {
    case 'plant':
      return {
        name: 'Phalaenopsis Mix',
        sku: 'PHA-001',
        category: 'Orchidee',
        description: 'Prachtige orchidee in diverse kleuren',
        product_type: 'plant',
        pot_diameter: 12,
        plant_height: 45,
        vbn_code: '10203040',
        is_artificial: 'nee',
        can_bloom: 'ja',
        availability: 'jaarrond',
        carrier_fust_code: 601,
        carrier_fust_type: 'Deense kar',
        carrier_carriage_type: 'Trolley',
        carrier_layers: 4,
        carrier_per_layer: 8,
        carrier_units: 32,
      }

    case 'cut_flower':
      return {
        name: 'Rode Roos',
        sku: 'ROS-001',
        category: 'Roos',
        description: 'Klassieke rode roos, premium kwaliteit',
        product_type: 'cut_flower',
        stem_length: 60,
        bunch_size: 10,
        vase_life_days: 7,
        color_primary: 'rood',
        color_secondary: '',
        season: 'jaarrond',
        fragrant: 'ja',
      }

    case 'accessory':
      return {
        name: 'Terracotta Pot 14cm',
        sku: 'POT-TC-14',
        category: 'Potten',
        description: 'Klassieke terracotta pot',
        product_type: 'accessory',
        accessory_type: 'pot',
        material: 'Terracotta',
        color: 'Terracotta',
      }

    default:
      return {
        name: 'Voorbeeld Product',
        sku: 'EX-001',
        category: 'Algemeen',
        description: 'Voorbeeld beschrijving',
        product_type: productType,
      }
  }
}
