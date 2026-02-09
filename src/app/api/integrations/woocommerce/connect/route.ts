import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getIntegrationByPlatform, createIntegration, updateIntegration } from '@/lib/data/integrations'
import { WooCommerceClient } from '@/lib/integrations/woocommerce'

export async function POST(request: NextRequest) {
  // Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  // Parse request body
  let body: { storeUrl?: string; consumerKey?: string; consumerSecret?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Ongeldige JSON body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const { storeUrl, consumerKey, consumerSecret } = body

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return Response.json(
      { error: 'storeUrl, consumerKey en consumerSecret zijn verplicht', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // Normaliseer store URL
  const normalizedUrl = storeUrl.replace(/\/+$/, '')

  // Check of er al een WooCommerce integratie bestaat
  const existingIntegration = await getIntegrationByPlatform('woocommerce')
  if (existingIntegration && existingIntegration.status === 'connected') {
    return Response.json(
      { error: 'WooCommerce is al verbonden', code: 'ALREADY_CONNECTED' },
      { status: 409 }
    )
  }

  // Credentials
  const credentials: Record<string, unknown> = {
    store_url: normalizedUrl,
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
  }

  // Test verbinding
  const client = new WooCommerceClient(credentials)
  const isConnected = await client.testConnection()

  if (!isConnected) {
    return Response.json(
      { error: 'Kan geen verbinding maken met WooCommerce. Controleer de URL en API-sleutels.', code: 'CONNECTION_FAILED' },
      { status: 400 }
    )
  }

  // Haal store naam op
  const storeName = await client.getStoreName()

  try {
    if (existingIntegration) {
      // Update bestaande integratie
      const success = await updateIntegration(existingIntegration.id, {
        status: 'connected',
        credentials,
        storeUrl: normalizedUrl,
        storeName: storeName ?? normalizedUrl,
      })

      if (!success) {
        return Response.json(
          { error: 'Kan integratie niet bijwerken', code: 'UPDATE_FAILED' },
          { status: 500 }
        )
      }
    } else {
      // Maak nieuwe integratie aan
      const integrationId = await createIntegration({
        organizationId: auth.orgId,
        platform: 'woocommerce',
        credentials,
        storeUrl: normalizedUrl,
        storeName: storeName ?? normalizedUrl,
      })

      if (!integrationId) {
        return Response.json(
          { error: 'Kan integratie niet aanmaken', code: 'CREATE_FAILED' },
          { status: 500 }
        )
      }
    }

    return Response.json({
      message: 'WooCommerce succesvol verbonden',
      data: {
        storeName: storeName ?? normalizedUrl,
        storeUrl: normalizedUrl,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('[WooCommerce Connect] Fout:', errorMessage)

    return Response.json(
      {
        error: 'Verbinding mislukt',
        details: errorMessage,
        code: 'CONNECTION_FAILED',
      },
      { status: 500 }
    )
  }
}
