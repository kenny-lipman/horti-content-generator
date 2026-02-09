import createMollieClient, { SequenceType } from '@mollie/api-client'

// ============================================
// Mollie SDK Client (lazy initialization)
// ============================================

let _mollieClient: ReturnType<typeof createMollieClient> | null = null

function getMollieClient() {
  if (!_mollieClient) {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      throw new Error('MOLLIE_API_KEY is niet geconfigureerd')
    }
    _mollieClient = createMollieClient({ apiKey })
  }
  return _mollieClient
}

// ============================================
// Customers
// ============================================

/**
 * Maak een Mollie customer aan en retourneer het customer ID (cst_xxx).
 */
export async function createMollieCustomer(
  email: string,
  name: string,
  orgId: string
): Promise<string> {
  const customer = await getMollieClient().customers.create({
    name,
    email,
    metadata: { orgId },
  })

  return customer.id
}

// ============================================
// Subscriptions (via first payment)
// ============================================

/**
 * Maak een eerste betaling aan om een mandaat te verkrijgen.
 * Na succesvolle betaling wordt de subscription aangemaakt via de webhook.
 *
 * Mollie flow:
 * 1. First payment (sequenceType: 'first') -> klant betaalt + geeft mandaat
 * 2. Webhook ontvangt betaling -> subscription aanmaken
 *
 * We slaan plan info op in metadata zodat de webhook weet welk plan.
 */
export async function createFirstPayment(
  customerId: string,
  plan: { slug: string; price: number; description: string }
): Promise<{ paymentId: string; checkoutUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${baseUrl}/api/billing/webhook`

  const payment = await getMollieClient().customerPayments.create({
    customerId,
    amount: {
      currency: 'EUR',
      value: plan.price.toFixed(2),
    },
    description: `Horti ${plan.description} - Eerste betaling`,
    sequenceType: SequenceType.first,
    redirectUrl: `${baseUrl}/settings?tab=billing&payment=success`,
    cancelUrl: `${baseUrl}/settings?tab=billing&payment=cancelled`,
    webhookUrl,
    metadata: {
      planSlug: plan.slug,
      type: 'first_payment',
    },
  })

  const checkoutUrl = payment.getCheckoutUrl()
  if (!checkoutUrl) {
    throw new Error('Geen checkout URL ontvangen van Mollie')
  }

  return {
    paymentId: payment.id,
    checkoutUrl,
  }
}

/**
 * Maak een Mollie subscription aan (na succesvol mandaat).
 * Dit wordt aangeroepen vanuit de webhook nadat de eerste betaling is voltooid.
 */
export async function createMollieSubscription(
  customerId: string,
  plan: { slug: string; price: number; description: string }
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${baseUrl}/api/billing/webhook`

  const subscription = await getMollieClient().customerSubscriptions.create({
    customerId,
    amount: {
      currency: 'EUR',
      value: plan.price.toFixed(2),
    },
    interval: '1 month',
    description: `Horti ${plan.description}`,
    webhookUrl,
    metadata: {
      planSlug: plan.slug,
      type: 'subscription',
    },
  })

  return subscription.id
}

// ============================================
// Cancel
// ============================================

/**
 * Annuleer een Mollie subscription.
 */
export async function cancelSubscription(
  customerId: string,
  subscriptionId: string
): Promise<boolean> {
  try {
    await getMollieClient().customerSubscriptions.cancel(subscriptionId, {
      customerId,
    })
    return true
  } catch (error) {
    console.error('[cancelSubscription] Mollie error:', error)
    return false
  }
}

// ============================================
// Read
// ============================================

/**
 * Haal subscription details op van Mollie.
 */
export async function getMollieSubscription(
  customerId: string,
  subscriptionId: string
): Promise<unknown> {
  try {
    const subscription = await getMollieClient().customerSubscriptions.get(subscriptionId, {
      customerId,
    })
    return subscription
  } catch (error) {
    console.error('[getMollieSubscription] Mollie error:', error)
    return null
  }
}

/**
 * Haal betaalgeschiedenis op voor een klant.
 */
export async function getCustomerPayments(
  customerId: string,
  limit = 25
): Promise<Array<{
  id: string
  amount: string
  status: string
  createdAt: string
  description: string
}>> {
  try {
    const payments = await getMollieClient().customerPayments.page({
      customerId,
      limit,
    })

    return payments.map((p) => ({
      id: p.id,
      amount: `${p.amount.currency} ${p.amount.value}`,
      status: p.status,
      createdAt: p.createdAt,
      description: p.description,
    }))
  } catch (error) {
    console.error('[getCustomerPayments] Mollie error:', error)
    return []
  }
}

/**
 * Haal een betaling op bij Mollie (voor webhook verificatie).
 */
export async function getPayment(paymentId: string) {
  return getMollieClient().payments.get(paymentId)
}
