import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface UsageSummary {
  /** Foto's gegenereerd deze maand */
  used: number
  /** Maximaal aantal foto's in het plan (null = onbeperkt) */
  limit: number | null
  /** Percentage gebruikt (0-100, null als onbeperkt) */
  percentage: number | null
  /** Plan naam */
  planName: string
  /** Plan slug */
  planSlug: string
  /** Huidige periode start */
  periodStart: string
  /** Huidige periode eind */
  periodEnd: string
}

export interface DashboardStats {
  /** Totaal gegenereerde foto's deze maand */
  photosUsed: number
  /** Foto-limiet (null = onbeperkt) */
  photosLimit: number | null
  /** Goedgekeurde foto's (all time) */
  approvedCount: number
  /** Foto's in review */
  pendingReviewCount: number
  /** Plan naam */
  planName: string
}

// ============================================
// Usage
// ============================================

/**
 * Haal de usage summary op voor de huidige factuurperiode.
 */
export async function getUsageSummary(organizationId: string): Promise<UsageSummary> {
  const supabase = await createClient()

  // Haal subscription + plan op
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, current_period_start, current_period_end, subscription_plans(name, slug, max_photos)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  const plan = subscription?.subscription_plans as { name: string; slug: string; max_photos: number | null } | null
  const planName = plan?.name ?? 'Geen plan'
  const planSlug = plan?.slug ?? 'none'
  const maxPhotos = plan?.max_photos ?? null

  // Gebruik altijd de huidige maand voor period matching met trackGenerationUsage
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodStart = subscription?.current_period_start ?? monthStart
  const periodEnd = subscription?.current_period_end ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Haal usage op — altijd op basis van maand-start zodat het matcht met trackGenerationUsage
  const { data: usage } = await supabase
    .from('generation_usage')
    .select('completed_count')
    .eq('organization_id', organizationId)
    .eq('period_start', monthStart)
    .single()

  const used = usage?.completed_count ?? 0
  const percentage = maxPhotos ? Math.round((used / maxPhotos) * 100) : null

  return {
    used,
    limit: maxPhotos,
    percentage,
    planName,
    planSlug,
    periodStart,
    periodEnd,
  }
}

/**
 * Haal dashboard statistieken op.
 */
export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const supabase = await createClient()

  // Parallel: usage + approved count + pending review count + plan
  const [usageSummary, approvedResult, pendingResult] = await Promise.all([
    getUsageSummary(organizationId),
    supabase
      .from('generated_images')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .eq('review_status', 'approved'),
    supabase
      .from('generated_images')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .eq('review_status', 'pending'),
  ])

  return {
    photosUsed: usageSummary.used,
    photosLimit: usageSummary.limit,
    approvedCount: approvedResult.count ?? 0,
    pendingReviewCount: pendingResult.count ?? 0,
    planName: usageSummary.planName,
  }
}

/**
 * Haal recente gegenereerde afbeeldingen op voor het dashboard.
 */
export async function getRecentImages(organizationId: string, limit = 8): Promise<Array<{
  id: string
  image_url: string | null
  image_type: string
  review_status: string
  created_at: string | null
  product_id: string
  product_name: string
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_url, image_type, review_status, created_at, product_id, products!inner(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentImages] Error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const products = row.products as { name: string } | null
    return {
      id: row.id as string,
      image_url: row.image_url as string | null,
      image_type: row.image_type as string,
      review_status: row.review_status as string,
      created_at: row.created_at as string | null,
      product_id: row.product_id as string,
      product_name: products?.name ?? 'Onbekend',
    }
  })
}

// ============================================
// Usage Limit Check
// ============================================

/**
 * Check of de organisatie nog foto's mag genereren.
 * Retourneert { allowed, used, limit, percentage }.
 */
export async function checkUsageLimit(organizationId: string): Promise<{
  allowed: boolean
  used: number
  limit: number | null
  percentage: number | null
}> {
  const summary = await getUsageSummary(organizationId)

  // Onbeperkt plan
  if (summary.limit === null) {
    return { allowed: true, used: summary.used, limit: null, percentage: null }
  }

  return {
    allowed: summary.used < summary.limit,
    used: summary.used,
    limit: summary.limit,
    percentage: summary.percentage,
  }
}

// ============================================
// Atomic Usage Reservation
// ============================================

/**
 * Atomisch usage reserveren: checkt limiet EN reserveert in één transactie.
 * Voorkomt race conditions bij gelijktijdige generatie-requests.
 */
export async function reserveUsage(organizationId: string, requestedCount: number): Promise<{
  allowed: boolean
  used: number
  limit: number | null
  remaining: number | null
}> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('reserve_generation_usage' as never, {
    p_organization_id: organizationId,
    p_requested_count: requestedCount,
  } as never)

  if (error) {
    console.error('[reserveUsage] RPC error:', error.message)
    // Fallback: allow but log (don't block generation on RPC errors)
    return { allowed: true, used: 0, limit: null, remaining: null }
  }

  const result = data as unknown as { allowed: boolean; used: number; limit: number | null; remaining: number | null }
  return result
}

/**
 * Geef gereserveerde usage terug bij gefaalde generaties.
 */
export async function releaseUsage(organizationId: string, releaseCount: number): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { error } = await supabase.rpc('release_generation_usage' as never, {
    p_organization_id: organizationId,
    p_release_count: releaseCount,
  } as never)

  if (error) {
    console.error('[releaseUsage] RPC error:', error.message)
  }
}

/**
 * Haal het meest gebruikte image type op voor een organisatie.
 */
export async function getTopImageType(organizationId: string): Promise<{ imageType: string; count: number } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('generated_images')
    .select('image_type')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')

  if (error || !data || data.length === 0) return null

  const counts = new Map<string, number>()
  for (const row of data) {
    const t = row.image_type as string
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }

  let topType = ''
  let topCount = 0
  for (const [type, count] of counts) {
    if (count > topCount) {
      topType = type
      topCount = count
    }
  }

  return topType ? { imageType: topType, count: topCount } : null
}
