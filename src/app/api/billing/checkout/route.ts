import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getSubscriptionPlanBySlug, upsertSubscription } from '@/lib/data/subscriptions'
import { createMollieCustomer, createFirstPayment } from '@/lib/billing/mollie'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json(
      { error: 'Niet ingelogd', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // 2. Parse request body
  let body: { planSlug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige request body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const { planSlug } = body
  if (!planSlug || typeof planSlug !== 'string') {
    return NextResponse.json(
      { error: 'planSlug is verplicht', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // Enterprise plan: geen checkout, contact opnemen
  if (planSlug === 'enterprise') {
    return NextResponse.json(
      { error: 'Neem contact op voor Enterprise', code: 'ENTERPRISE_PLAN' },
      { status: 400 }
    )
  }

  try {
    // 3. Haal plan op
    const plan = await getSubscriptionPlanBySlug(planSlug)
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan niet gevonden', code: 'PLAN_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!plan.price_monthly || Number(plan.price_monthly) <= 0) {
      return NextResponse.json(
        { error: 'Dit plan kan niet online worden aangeschaft', code: 'INVALID_PLAN' },
        { status: 400 }
      )
    }

    // 4. Haal organisatie op, check of er al een Mollie customer is
    const supabase = createAdminClient()
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, billing_email, mollie_customer_id')
      .eq('id', auth.orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisatie niet gevonden', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 5. Get or create Mollie customer
    let mollieCustomerId = org.mollie_customer_id

    if (!mollieCustomerId) {
      const email = org.billing_email || `billing@${org.name.toLowerCase().replace(/\s+/g, '-')}.nl`
      mollieCustomerId = await createMollieCustomer(email, org.name, org.id)

      // Sla Mollie customer ID op bij de organisatie
      await supabase
        .from('organizations')
        .update({ mollie_customer_id: mollieCustomerId })
        .eq('id', org.id)
    }

    // 6. Maak eerste betaling aan (met sequenceType: first)
    const { paymentId, checkoutUrl } = await createFirstPayment(mollieCustomerId, {
      slug: plan.slug,
      price: Number(plan.price_monthly),
      description: plan.name,
    })

    // 7. Sla subscription lokaal op (status: pending tot webhook bevestigt)
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    await upsertSubscription({
      organizationId: auth.orgId,
      planId: plan.id,
      status: 'trialing', // Wordt 'active' na succesvolle betaling via webhook
      paymentProviderId: paymentId,
      periodStart: now.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    })

    // 8. Retourneer checkout URL
    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('[billing/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het aanmaken van de betaling', code: 'CHECKOUT_ERROR' },
      { status: 500 }
    )
  }
}
