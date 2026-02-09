import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  ProductCombinationInsert,
  CombinationWithDetails,
} from '@/lib/supabase/types'

// ============================================
// Product Combinations
// ============================================

const COMBINATION_SELECT = `
  *,
  products!product_combinations_product_id_fkey(name, sku, catalog_image_url),
  accessory_product:products!product_combinations_accessory_id_fkey(name, sku, catalog_image_url),
  scene_templates(name, scene_type, thumbnail_url)
` as const

/**
 * Haal een enkele combinatie op.
 */
export async function getCombinationById(
  id: string
): Promise<CombinationWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_combinations')
    .select(COMBINATION_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getCombinationById] Error:', error.message)
    return null
  }

  return data as unknown as CombinationWithDetails
}

/**
 * Haal alle combinaties op voor een product.
 */
export async function getCombinationsForProduct(
  productId: string
): Promise<CombinationWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_combinations')
    .select(COMBINATION_SELECT)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCombinationsForProduct] Error:', error.message)
    return []
  }

  return (data ?? []) as unknown as CombinationWithDetails[]
}

/**
 * Maak een nieuwe product combinatie aan.
 */
export async function createCombination(data: {
  organizationId: string
  productId: string
  accessoryId: string
  sceneTemplateId?: string
  notes?: string
}): Promise<string | null> {
  const supabase = await createClient()

  const insert: ProductCombinationInsert = {
    organization_id: data.organizationId,
    product_id: data.productId,
    accessory_id: data.accessoryId,
    scene_template_id: data.sceneTemplateId ?? null,
    notes: data.notes ?? null,
  }

  const { data: combo, error } = await supabase
    .from('product_combinations')
    .insert(insert)
    .select('id')
    .single()

  if (error || !combo) {
    console.error('[createCombination] Error:', error?.message)
    return null
  }

  return combo.id
}

/**
 * Haal alle accessoire-producten op (voor de dropdown).
 */
export async function getAccessoryProducts(): Promise<Array<{ id: string; name: string; sku: string | null; catalog_image_url: string | null }>> {
  const supabase = await createClient()

  // RLS filtert automatisch op organization
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, catalog_image_url')
    .eq('product_type', 'accessory')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAccessoryProducts] Error:', error.message)
    return []
  }

  return data ?? []
}
