import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
// TODO: Switch to createClient() when auth is implemented
import type {
  Product,
  ProductWithAttributes,
  PlantAttributes,
  CutFlowerAttributes,
  RetailAttributes,
  Accessory,
  ProductInsert,
  PlantAttributesInsert,
  RetailAttributesInsert,
  CutFlowerAttributesInsert,
  AccessoryInsert,
  ProductUpdate,
  PlantAttributesUpdate,
  RetailAttributesUpdate,
  CutFlowerAttributesUpdate,
  AccessoryUpdate,
  ProductType,
} from '@/lib/supabase/types'
import type { Product as LegacyProduct } from '@/lib/types'

// ============================================
// Types
// ============================================

export interface GetProductsOptions {
  /** Organization ID voor RLS filtering - optioneel tijdens development */
  organizationId?: string
  /** Zoektekst op productnaam, SKU of beschrijving */
  search?: string
  /** Filter op categorie */
  category?: string
  /** Filter op product type (plant, cut_flower, accessory) */
  productType?: ProductType
  /** Paginanummer (1-based) */
  page?: number
  /** Aantal producten per pagina */
  pageSize?: number
  /** Filter op actieve status */
  isActive?: boolean
}

export interface GetProductsResult {
  products: ProductWithAttributes[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateProductData {
  product: ProductInsert
  plantAttributes?: Omit<PlantAttributesInsert, 'product_id'>
  cutFlowerAttributes?: Omit<CutFlowerAttributesInsert, 'product_id'>
  retailAttributes?: Omit<RetailAttributesInsert, 'product_id'>
  accessory?: Omit<AccessoryInsert, 'product_id'>
}

export interface UpdateProductData {
  product?: ProductUpdate
  plantAttributes?: Omit<PlantAttributesUpdate, 'product_id'>
  cutFlowerAttributes?: Omit<CutFlowerAttributesUpdate, 'product_id'>
  retailAttributes?: Omit<RetailAttributesUpdate, 'product_id'>
  accessory?: Omit<AccessoryUpdate, 'product_id'>
}

// ============================================
// Select query met alle attribute relaties
// ============================================

const PRODUCT_WITH_ATTRIBUTES_SELECT =
  '*, plant_attributes(*), retail_attributes(*), cut_flower_attributes(*), accessories(*)' as const

// ============================================
// Data Access Functions
// ============================================

/**
 * Haal producten op met paginatie, zoeken en filteren.
 * Geeft een gepagineerd resultaat terug met alle attributen.
 */
export async function getProducts(
  options: GetProductsOptions = {}
): Promise<GetProductsResult> {
  const {
    organizationId,
    search,
    category,
    productType,
    page = 1,
    pageSize = 20,
    isActive,
  } = options

  const supabase = createAdminClient()

  let query = supabase
    .from('products')
    .select(PRODUCT_WITH_ATTRIBUTES_SELECT, { count: 'exact' })

  // Filters toepassen
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  if (search) {
    // Zoek in naam, SKU en beschrijving
    query = query.or(
      `name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`
    )
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (productType) {
    query = query.eq('product_type', productType)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  // Paginatie berekenen
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('[getProducts] Fout bij ophalen producten:', error.message)
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  const total = count ?? 0

  return {
    products: (data ?? []) as ProductWithAttributes[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Haal een enkel product op met alle attributen op basis van ID.
 * Geeft null terug als het product niet gevonden wordt.
 */
export async function getProductById(
  id: string
): Promise<ProductWithAttributes | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_WITH_ATTRIBUTES_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    console.error(
      `[getProductById] Fout bij ophalen product ${id}:`,
      error.message
    )
    return null
  }

  return data as ProductWithAttributes
}

/**
 * Haal alle unieke categorieen op voor producten.
 * Optioneel gefilterd op organisatie.
 */
export async function getCategories(
  organizationId?: string
): Promise<string[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('products')
    .select('category')
    .not('category', 'is', null)
    .eq('is_active', true)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  query = query.order('category', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('[getCategories] Fout bij ophalen categorieen:', error.message)
    return []
  }

  // Handmatig dedupliceren omdat Supabase geen DISTINCT op individuele kolommen ondersteunt
  const rows = (data ?? []) as Array<{ category: string | null }>
  const categories = rows
    .map((row) => row.category)
    .filter((c): c is string => c !== null)
  return [...new Set(categories)]
}

/**
 * Maak een nieuw product aan met bijbehorende attributen.
 * Insert eerst het product, dan de attributen op basis van product_type.
 */
export async function createProduct(
  data: CreateProductData
): Promise<ProductWithAttributes | null> {
  const supabase = createAdminClient()

  // Stap 1: Product aanmaken
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert(data.product)
    .select()
    .single()

  if (productError || !product) {
    console.error(
      '[createProduct] Fout bij aanmaken product:',
      productError?.message
    )
    return null
  }

  const productId = product.id

  // Stap 2: Attributen aanmaken op basis van product_type
  const productType = data.product.product_type as ProductType

  if (productType === 'plant' && data.plantAttributes) {
    const { error } = await supabase
      .from('plant_attributes')
      .insert({ ...data.plantAttributes, product_id: productId })

    if (error) {
      console.error(
        '[createProduct] Fout bij aanmaken plant_attributes:',
        error.message
      )
    }
  }

  if (productType === 'cut_flower' && data.cutFlowerAttributes) {
    const { error } = await supabase
      .from('cut_flower_attributes')
      .insert({ ...data.cutFlowerAttributes, product_id: productId })

    if (error) {
      console.error(
        '[createProduct] Fout bij aanmaken cut_flower_attributes:',
        error.message
      )
    }
  }

  if (productType === 'accessory' && data.accessory) {
    const { error } = await supabase
      .from('accessories')
      .insert({ ...data.accessory, product_id: productId })

    if (error) {
      console.error(
        '[createProduct] Fout bij aanmaken accessories:',
        error.message
      )
    }
  }

  // Retail attributes kunnen voor elk type product bestaan
  if (data.retailAttributes) {
    const { error } = await supabase
      .from('retail_attributes')
      .insert({ ...data.retailAttributes, product_id: productId })

    if (error) {
      console.error(
        '[createProduct] Fout bij aanmaken retail_attributes:',
        error.message
      )
    }
  }

  // Stap 3: Volledig product ophalen met alle attributen
  return getProductById(productId)
}

/**
 * Werk een bestaand product bij inclusief attributen.
 * Update het product en de relevante attributentabel.
 */
export async function updateProduct(
  id: string,
  data: UpdateProductData
): Promise<ProductWithAttributes | null> {
  const supabase = createAdminClient()

  // Stap 1: Product updaten (als er product data is)
  if (data.product && Object.keys(data.product).length > 0) {
    const { error } = await supabase
      .from('products')
      .update({ ...data.product, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error(
        `[updateProduct] Fout bij updaten product ${id}:`,
        error.message
      )
      return null
    }
  }

  // Stap 2: Attributen updaten via upsert (insert als ze nog niet bestaan)
  if (data.plantAttributes && Object.keys(data.plantAttributes).length > 0) {
    // Eerst checken of er al attributes bestaan
    const { data: existing } = await supabase
      .from('plant_attributes')
      .select('id')
      .eq('product_id', id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('plant_attributes')
        .update(data.plantAttributes)
        .eq('product_id', id)

      if (error) {
        console.error(
          '[updateProduct] Fout bij updaten plant_attributes:',
          error.message
        )
      }
    } else {
      const { error } = await supabase
        .from('plant_attributes')
        .insert({
          ...data.plantAttributes,
          product_id: id,
        } as PlantAttributesInsert)

      if (error) {
        console.error(
          '[updateProduct] Fout bij aanmaken plant_attributes:',
          error.message
        )
      }
    }
  }

  if (
    data.cutFlowerAttributes &&
    Object.keys(data.cutFlowerAttributes).length > 0
  ) {
    const { data: existing } = await supabase
      .from('cut_flower_attributes')
      .select('id')
      .eq('product_id', id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('cut_flower_attributes')
        .update(data.cutFlowerAttributes)
        .eq('product_id', id)

      if (error) {
        console.error(
          '[updateProduct] Fout bij updaten cut_flower_attributes:',
          error.message
        )
      }
    } else {
      const { error } = await supabase
        .from('cut_flower_attributes')
        .insert({
          ...data.cutFlowerAttributes,
          product_id: id,
        } as CutFlowerAttributesInsert)

      if (error) {
        console.error(
          '[updateProduct] Fout bij aanmaken cut_flower_attributes:',
          error.message
        )
      }
    }
  }

  if (data.retailAttributes && Object.keys(data.retailAttributes).length > 0) {
    const { data: existing } = await supabase
      .from('retail_attributes')
      .select('id')
      .eq('product_id', id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('retail_attributes')
        .update(data.retailAttributes)
        .eq('product_id', id)

      if (error) {
        console.error(
          '[updateProduct] Fout bij updaten retail_attributes:',
          error.message
        )
      }
    } else {
      const { error } = await supabase
        .from('retail_attributes')
        .insert({
          ...data.retailAttributes,
          product_id: id,
        } as RetailAttributesInsert)

      if (error) {
        console.error(
          '[updateProduct] Fout bij aanmaken retail_attributes:',
          error.message
        )
      }
    }
  }

  if (data.accessory && Object.keys(data.accessory).length > 0) {
    const { data: existing } = await supabase
      .from('accessories')
      .select('id')
      .eq('product_id', id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('accessories')
        .update(data.accessory)
        .eq('product_id', id)

      if (error) {
        console.error(
          '[updateProduct] Fout bij updaten accessories:',
          error.message
        )
      }
    } else {
      const { error } = await supabase
        .from('accessories')
        .insert({
          ...data.accessory,
          product_id: id,
        } as AccessoryInsert)

      if (error) {
        console.error(
          '[updateProduct] Fout bij aanmaken accessories:',
          error.message
        )
      }
    }
  }

  // Stap 3: Bijgewerkt product ophalen
  return getProductById(id)
}

/**
 * Verwijder een product (soft delete).
 * Zet is_active op false in plaats van daadwerkelijk verwijderen.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error(
      `[deleteProduct] Fout bij deactiveren product ${id}:`,
      error.message
    )
    return false
  }

  return true
}

// ============================================
// Legacy Converter
// ============================================

/**
 * Converteer een Supabase ProductWithAttributes naar het legacy Product formaat.
 * Gebruikt door de bestaande generatie-pipeline.
 */
export function toLegacyProduct(product: ProductWithAttributes): LegacyProduct {
  const pa = product.plant_attributes

  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? '',
    vbnCode: pa?.vbn_code ?? '',
    category: product.category ?? '',
    carrier: {
      fustCode: pa?.carrier_fust_code ?? 0,
      fustType: pa?.carrier_fust_type ?? '',
      carriageType: pa?.carrier_carriage_type ?? '',
      layers: pa?.carrier_layers ?? 0,
      perLayer: pa?.carrier_per_layer ?? 0,
      units: pa?.carrier_units ?? 0,
    },
    potDiameter: pa?.pot_diameter ?? 0,
    plantHeight: pa?.plant_height ?? 0,
    availability: pa?.availability ?? '',
    catalogImage: product.catalog_image_url ?? '',
    isArtificial: pa?.is_artificial ?? false,
    canBloom: pa?.can_bloom ?? false,
  }
}
