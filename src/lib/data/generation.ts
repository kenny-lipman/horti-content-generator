import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type {
  GenerationJobInsert,
  GeneratedImageInsert,
} from '@/lib/supabase/types'

// ============================================
// Image type mapping: legacy (hyphens) ↔ database (underscores)
// ============================================

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

// ============================================
// Generation Jobs
// ============================================

/**
 * Maak een nieuwe generation job aan.
 */
export async function createGenerationJob(data: {
  organizationId: string
  productId: string
  imageTypes: string[]
  createdBy?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const dbImageTypes = data.imageTypes.map(toDbImageType)

  const insert: GenerationJobInsert = {
    organization_id: data.organizationId,
    product_id: data.productId,
    image_types_requested: dbImageTypes,
    total_images: data.imageTypes.length,
    status: 'processing',
    started_at: new Date().toISOString(),
    created_by: data.createdBy ?? null,
  }

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .insert(insert)
    .select('id')
    .single()

  if (error || !job) {
    console.error('[createGenerationJob] Error:', error?.message)
    return null
  }

  return job.id
}

/**
 * Update generation job voortgang.
 */
export async function updateGenerationJob(
  jobId: string,
  update: {
    completedImages?: number
    failedImages?: number
    status?: 'processing' | 'completed' | 'failed'
  }
): Promise<void> {
  const supabase = createAdminClient()

  const dbUpdate: Record<string, unknown> = {}
  if (update.completedImages !== undefined) dbUpdate.completed_images = update.completedImages
  if (update.failedImages !== undefined) dbUpdate.failed_images = update.failedImages
  if (update.status !== undefined) dbUpdate.status = update.status
  if (update.status === 'completed' || update.status === 'failed') {
    dbUpdate.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('generation_jobs')
    .update(dbUpdate)
    .eq('id', jobId)

  if (error) {
    console.error('[updateGenerationJob] Error:', error.message)
  }
}

// ============================================
// Generated Images
// ============================================

/**
 * Maak een generated_images record aan.
 */
export async function createGeneratedImage(data: {
  organizationId: string
  productId: string
  sourceImageId?: string
  parentImageId?: string
  imageType: string
  imageUrl: string
  status: 'completed' | 'failed'
  promptUsed?: string
  seed?: number
  temperature?: number
  generationDurationMs?: number
  error?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const insert: GeneratedImageInsert = {
    organization_id: data.organizationId,
    product_id: data.productId,
    source_image_id: data.sourceImageId ?? null,
    parent_image_id: data.parentImageId ?? null,
    image_type: toDbImageType(data.imageType),
    image_url: data.imageUrl ?? null,
    status: data.status,
    prompt_used: data.promptUsed ?? null,
    seed: data.seed ?? null,
    temperature: data.temperature ?? null,
    generation_duration_ms: data.generationDurationMs ?? null,
    error: data.error ?? null,
  }

  const { data: image, error } = await supabase
    .from('generated_images')
    .insert(insert)
    .select('id')
    .single()

  if (error || !image) {
    console.error('[createGeneratedImage] Error:', error?.message)
    return null
  }

  return image.id
}

/**
 * Haal gegenereerde afbeeldingen op voor een product.
 */
export async function getGeneratedImagesForProduct(
  productId: string
): Promise<Array<{
  id: string
  image_type: string
  image_url: string | null
  status: string
  review_status: string
  created_at: string | null
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_type, image_url, status, review_status, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getGeneratedImagesForProduct] Error:', error.message)
    return []
  }

  return data ?? []
}
