import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { toDbImageType } from './generation-utils'
import type {
  GenerationJobInsert,
  GeneratedImageInsert,
} from '@/lib/supabase/types'

// Re-export client-safe utils
export { toDbImageType, toLegacyImageType } from './generation-utils'

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

/**
 * Check of een organisatie een actieve (processing) generation job heeft.
 * Voorkomt dat meerdere batch-generaties tegelijk draaien.
 */
export async function hasActiveGenerationJob(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { count, error } = await supabase
    .from('generation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'processing')

  if (error) {
    console.error('[hasActiveGenerationJob] Error:', error.message)
    return false // fail open — don't block legitimate requests on DB error
  }

  return (count ?? 0) > 0
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
  const supabase = await createClient()

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

// ============================================
// Review Status
// ============================================

/**
 * Update de review status van een gegenereerde afbeelding.
 */
export async function updateReviewStatus(
  imageId: string,
  reviewStatus: 'pending' | 'approved' | 'rejected',
  reviewedBy?: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('generated_images')
    .update({
      review_status: reviewStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy ?? null,
    })
    .eq('id', imageId)

  if (error) {
    console.error('[updateReviewStatus] Error:', error.message)
    return false
  }

  return true
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Track generatie-gebruik voor de huidige factureringsperiode.
 * Atomische upsert via RPC om race conditions te voorkomen.
 */
export async function trackGenerationUsage(
  organizationId: string,
  completedCount: number,
  failedCount: number
): Promise<void> {
  const supabase = createAdminClient()

  // Gebruik de huidige maand als factureringsperiode
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { error } = await supabase.rpc('upsert_generation_usage' as never, {
    p_organization_id: organizationId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_completed_count: completedCount,
    p_failed_count: failedCount,
  } as never)

  if (error) {
    console.error('[trackGenerationUsage] RPC error:', error.message)
  }
}

// ============================================
// Content Library
// ============================================

export interface ContentLibraryImage {
  id: string
  image_type: string
  image_url: string | null
  status: string
  review_status: string
  created_at: string | null
  product_id: string
  product_name: string
  product_sku: string | null
}

export interface GetContentLibraryOptions {
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  imageType?: string
  productId?: string
  page?: number
  pageSize?: number
}

/**
 * Haal alle gegenereerde afbeeldingen op voor de content library.
 * Inclusief productnaam voor weergave.
 */
export async function getContentLibrary(
  options: GetContentLibraryOptions = {}
): Promise<{ images: ContentLibraryImage[]; total: number }> {
  const {
    reviewStatus,
    imageType,
    productId,
    page = 1,
    pageSize = 50,
  } = options

  const supabase = await createClient()

  // RLS filtert automatisch op organization
  let query = supabase
    .from('generated_images')
    .select('id, image_type, image_url, status, review_status, created_at, product_id, products!inner(name, sku)', { count: 'exact' })
    .eq('status', 'completed')

  if (reviewStatus) {
    query = query.eq('review_status', reviewStatus)
  }

  if (imageType) {
    query = query.eq('image_type', imageType)
  }

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('[getContentLibrary] Error:', error.message)
    return { images: [], total: 0 }
  }

  const images: ContentLibraryImage[] = (data ?? []).map((row: Record<string, unknown>) => {
    const products = row.products as { name: string; sku: string | null } | null
    return {
      id: row.id as string,
      image_type: row.image_type as string,
      image_url: row.image_url as string | null,
      status: row.status as string,
      review_status: row.review_status as string,
      created_at: row.created_at as string | null,
      product_id: row.product_id as string,
      product_name: products?.name ?? 'Onbekend',
      product_sku: products?.sku ?? null,
    }
  })

  return { images, total: count ?? 0 }
}
