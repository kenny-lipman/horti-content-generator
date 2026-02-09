import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Subscription, SubscriptionPlan } from '@/lib/supabase/types'

// ============================================
// Types
// ============================================

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan
}

// ============================================
// Read (RLS-aware)
// ============================================

/**
 * Haal de actieve subscription op met plan details.
 * Gebruikt createClient() (RLS-aware).
 */
export async function getActiveSubscription(
  orgId: string
): Promise<SubscriptionWithPlan | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      // PGRST116 = no rows found, dat is normaal
      console.error('[getActiveSubscription] Error:', error?.message)
    }
    return null
  }

  const plan = data.subscription_plans as unknown as SubscriptionPlan
  return {
    ...data,
    plan,
  } as SubscriptionWithPlan
}

// ============================================
// Read (Admin — webhook context)
// ============================================

/**
 * Zoek subscription op basis van Mollie subscription ID.
 * Gebruikt createAdminClient() (webhook context, geen RLS).
 */
export async function getSubscriptionByPaymentId(
  paymentSubId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('payment_provider_id', paymentSubId)
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('[getSubscriptionByPaymentId] Error:', error?.message)
    }
    return null
  }

  return data
}

/**
 * Haal plan op via slug.
 * Gebruikt createClient() (RLS-aware).
 */
export async function getSubscriptionPlanBySlug(
  slug: string
): Promise<SubscriptionPlan | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('[getSubscriptionPlanBySlug] Error:', error?.message)
    }
    return null
  }

  return data
}

// ============================================
// Write (Admin — webhook context)
// ============================================

/**
 * Maak of update een subscription.
 * Gebruikt createAdminClient() (webhook context, geen RLS).
 */
export async function upsertSubscription(data: {
  organizationId: string
  planId: string
  status: string
  paymentProviderId?: string
  periodStart: string
  periodEnd: string
}): Promise<boolean> {
  const supabase = createAdminClient()

  // Check of er al een subscription bestaat voor deze org
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', data.organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  if (existing) {
    // Update bestaande subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: data.planId,
        status: data.status,
        payment_provider_id: data.paymentProviderId ?? null,
        current_period_start: data.periodStart,
        current_period_end: data.periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('[upsertSubscription] Update error:', error.message)
      return false
    }
  } else {
    // Maak nieuwe subscription aan
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: data.organizationId,
        plan_id: data.planId,
        status: data.status,
        payment_provider_id: data.paymentProviderId ?? null,
        current_period_start: data.periodStart,
        current_period_end: data.periodEnd,
      })

    if (error) {
      console.error('[upsertSubscription] Insert error:', error.message)
      return false
    }
  }

  return true
}

/**
 * Update subscription status (voor cancel, past_due, etc.).
 * Gebruikt createAdminClient() (webhook context).
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  cancelledAt?: string
): Promise<boolean> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (cancelledAt) {
    updateData.cancelled_at = cancelledAt
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)

  if (error) {
    console.error('[updateSubscriptionStatus] Error:', error.message)
    return false
  }

  return true
}
