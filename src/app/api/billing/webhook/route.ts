import { NextRequest, NextResponse } from 'next/server'
import { getPayment, createMollieSubscription } from '@/lib/billing/mollie'
import { upsertSubscription, getSubscriptionByPaymentId, updateSubscriptionStatus } from '@/lib/data/subscriptions'
import { createNotification } from '@/lib/data/notifications'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Mollie Webhook Handler
 *
 * Mollie stuurt een POST met `id` als form data (application/x-www-form-urlencoded).
 * GEEN auth check -- dit komt van Mollie's servers.
 *
 * Flow:
 * 1. Ontvang payment ID van Mollie
 * 2. Haal payment details op via Mollie API (verificatie)
 * 3. Bij succesvolle eerste betaling -> maak subscription aan
 * 4. Bij recurring betaling -> update subscription status
 * 5. Maak notificatie aan
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data (Mollie stuurt x-www-form-urlencoded)
    const formData = await request.formData()
    const paymentId = formData.get('id') as string

    if (!paymentId) {
      console.error('[webhook] Geen payment ID ontvangen')
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // 2. Haal payment details op van Mollie (verificatie!)
    const payment = await getPayment(paymentId)

    if (!payment) {
      console.error('[webhook] Payment niet gevonden:', paymentId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const metadata = payment.metadata as { planSlug?: string; type?: string } | null
    const customerId = payment.customerId ?? null
    const subscriptionId = payment.subscriptionId ?? null

    console.log(`[webhook] Payment ${paymentId}: status=${payment.status}, type=${metadata?.type}`)

    // 3. Verwerk op basis van payment status
    if (payment.status === 'paid') {
      await handlePaidPayment(
        { id: payment.id, subscriptionId, customerId, amount: payment.amount, description: payment.description },
        metadata,
        customerId
      )
    } else if (payment.status === 'failed' || payment.status === 'expired' || payment.status === 'canceled') {
      await handleFailedPayment(
        { id: payment.id, subscriptionId, customerId, status: payment.status },
        customerId
      )
    }

    // Mollie verwacht altijd een 200 OK
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Error:', error)
    // Retourneer altijd 200 om Mollie niet te laten retrien bij server errors
    return NextResponse.json({ received: true })
  }
}

// ============================================
// Internal types
// ============================================

interface PaidPaymentInfo {
  id: string
  subscriptionId: string | null
  customerId: string | null
  amount: { value: string; currency: string }
  description: string
}

interface FailedPaymentInfo {
  id: string
  subscriptionId: string | null
  customerId: string | null
  status: string
}

// ============================================
// Handlers
// ============================================

async function handlePaidPayment(
  payment: PaidPaymentInfo,
  metadata: { planSlug?: string; type?: string } | null,
  customerId: string | null
) {
  const supabase = createAdminClient()

  // Zoek de organisatie bij deze Mollie customer
  if (!customerId) {
    console.error('[webhook] Geen customerId op payment')
    return
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('mollie_customer_id', customerId)
    .single()

  if (!org) {
    console.error('[webhook] Geen organisatie gevonden voor customer:', customerId)
    return
  }

  // Check of dit een eerste betaling is (subscription aanmaken)
  if (metadata?.type === 'first_payment' && metadata?.planSlug) {
    await handleFirstPaymentSuccess(org.id, customerId, metadata.planSlug)
  }

  // Check of dit een recurring subscription betaling is
  if (payment.subscriptionId) {
    await handleRecurringPayment(org.id, payment.subscriptionId)
  }

  // Notificatie: betaling ontvangen
  await createNotification({
    organizationId: org.id,
    type: 'system',
    title: 'Betaling ontvangen',
    message: `Betaling van ${payment.amount.currency} ${payment.amount.value} is succesvol verwerkt.`,
    data: { paymentId: payment.id, amount: payment.amount.value },
  })
}

async function handleFirstPaymentSuccess(
  orgId: string,
  customerId: string,
  planSlug: string
) {
  // Haal plan op (admin context)
  const supabase = createAdminClient()
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .single()

  if (!plan) {
    console.error('[webhook] Plan niet gevonden:', planSlug)
    return
  }

  try {
    // Maak Mollie subscription aan (recurring)
    const mollieSubId = await createMollieSubscription(customerId, {
      slug: plan.slug,
      price: Number(plan.price_monthly),
      description: plan.name,
    })

    // Update lokale subscription
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    await upsertSubscription({
      organizationId: orgId,
      planId: plan.id,
      status: 'active',
      paymentProviderId: mollieSubId,
      periodStart: now.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    })

    console.log(`[webhook] Subscription aangemaakt voor org ${orgId}: ${mollieSubId}`)
  } catch (error) {
    console.error('[webhook] Fout bij aanmaken subscription:', error)

    // Activeer toch de subscription lokaal (betaling is gelukt)
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    await upsertSubscription({
      organizationId: orgId,
      planId: plan.id,
      status: 'active',
      periodStart: now.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    })
  }
}

async function handleRecurringPayment(orgId: string, subscriptionId: string) {
  const existing = await getSubscriptionByPaymentId(subscriptionId)

  if (existing) {
    // Verleng de periode
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    await upsertSubscription({
      organizationId: orgId,
      planId: existing.plan_id,
      status: 'active',
      paymentProviderId: subscriptionId,
      periodStart: now.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    })
  }
}

async function handleFailedPayment(
  payment: FailedPaymentInfo,
  customerId: string | null
) {
  if (!customerId) return

  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('mollie_customer_id', customerId)
    .single()

  if (!org) return

  // Bij mislukte recurring betaling: zet status naar past_due
  if (payment.subscriptionId) {
    const existing = await getSubscriptionByPaymentId(payment.subscriptionId)
    if (existing) {
      await updateSubscriptionStatus(existing.id, 'past_due')
    }
  }

  // Notificatie: betaling mislukt
  await createNotification({
    organizationId: org.id,
    type: 'system',
    title: 'Betaling mislukt',
    message: `Betaling kon niet worden verwerkt (status: ${payment.status}). Controleer je betaalmethode.`,
    data: { paymentId: payment.id, status: payment.status },
  })
}
