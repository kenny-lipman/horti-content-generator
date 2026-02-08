import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

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
  const supabase = createAdminClient()

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

  // Huidige maand
  const now = new Date()
  const periodStart = subscription?.current_period_start ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = subscription?.current_period_end ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Haal usage op
  const { data: usage } = await supabase
    .from('generation_usage')
    .select('completed_count')
    .eq('organization_id', organizationId)
    .eq('period_start', periodStart)
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
  const supabase = createAdminClient()

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
  product_name: string
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_url, image_type, review_status, created_at, products!inner(name)')
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
