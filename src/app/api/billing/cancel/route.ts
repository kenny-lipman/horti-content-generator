import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getActiveSubscription, updateSubscriptionStatus } from '@/lib/data/subscriptions'
import { cancelSubscription } from '@/lib/billing/mollie'
import { createNotification } from '@/lib/data/notifications'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
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

  try {
    // 2. Haal actieve subscription op
    const subscription = await getActiveSubscription(auth.orgId)

    if (!subscription) {
      return NextResponse.json(
        { error: 'Geen actief abonnement gevonden', code: 'NO_SUBSCRIPTION' },
        { status: 404 }
      )
    }

    // 3. Annuleer bij Mollie (als er een payment_provider_id is en Mollie geconfigureerd is)
    if (subscription.payment_provider_id && process.env.MOLLIE_API_KEY) {
      // Haal Mollie customer ID op
      const supabase = createAdminClient()
      const { data: org } = await supabase
        .from('organizations')
        .select('mollie_customer_id')
        .eq('id', auth.orgId)
        .single()

      if (org?.mollie_customer_id) {
        const cancelled = await cancelSubscription(
          org.mollie_customer_id,
          subscription.payment_provider_id
        )

        if (!cancelled) {
          console.error('[billing/cancel] Mollie cancel mislukt, maar we gaan lokaal door')
        }
      }
    }

    // 4. Update lokale subscription status
    const success = await updateSubscriptionStatus(
      subscription.id,
      'cancelled',
      new Date().toISOString()
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Kon abonnement niet annuleren', code: 'CANCEL_ERROR' },
        { status: 500 }
      )
    }

    // 5. Notificatie
    await createNotification({
      organizationId: auth.orgId,
      type: 'system',
      title: 'Abonnement geannuleerd',
      message: `Je ${subscription.plan.name} abonnement is geannuleerd. Je hebt nog toegang tot het einde van de huidige periode.`,
    })

    return NextResponse.json({
      message: 'Abonnement succesvol geannuleerd',
      periodEnd: subscription.current_period_end,
    })
  } catch (error) {
    console.error('[billing/cancel] Error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het annuleren', code: 'CANCEL_ERROR' },
      { status: 500 }
    )
  }
}
