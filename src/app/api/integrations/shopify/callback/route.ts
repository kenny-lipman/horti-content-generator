import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createIntegration, updateIntegration, getIntegrationByPlatform } from '@/lib/data/integrations'
import { ShopifyClient } from '@/lib/integrations/shopify'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')
  const hmac = searchParams.get('hmac')

  // Redirect base URL
  const settingsUrl = new URL('/settings', request.url)
  settingsUrl.searchParams.set('tab', 'integrations')

  // Valideer verplichte parameters
  if (!code || !state || !shop) {
    settingsUrl.searchParams.set('integration_error', 'Ongeldige callback parameters')
    return NextResponse.redirect(settingsUrl)
  }

  // Valideer state token tegen CSRF
  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('shopify_oauth_state')

  if (!stateCookie?.value) {
    settingsUrl.searchParams.set('integration_error', 'Sessie verlopen. Probeer opnieuw.')
    return NextResponse.redirect(settingsUrl)
  }

  let oauthState: { state: string; orgId: string; userId: string; shopDomain: string }
  try {
    oauthState = JSON.parse(stateCookie.value)
  } catch {
    settingsUrl.searchParams.set('integration_error', 'Ongeldige sessie data')
    return NextResponse.redirect(settingsUrl)
  }

  if (oauthState.state !== state) {
    settingsUrl.searchParams.set('integration_error', 'CSRF validatie mislukt')
    return NextResponse.redirect(settingsUrl)
  }

  // Verwijder state cookie
  cookieStore.delete('shopify_oauth_state')

  // Environment variables
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set('integration_error', 'Shopify is niet geconfigureerd')
    return NextResponse.redirect(settingsUrl)
  }

  // Wissel code om voor permanent access token
  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Shopify Callback] Token exchange mislukt:', tokenResponse.status, errorText)
      settingsUrl.searchParams.set('integration_error', 'Kan access token niet ophalen van Shopify')
      return NextResponse.redirect(settingsUrl)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      settingsUrl.searchParams.set('integration_error', 'Geen access token ontvangen van Shopify')
      return NextResponse.redirect(settingsUrl)
    }

    // Credentials opslaan
    const credentials: Record<string, unknown> = {
      shop_domain: shop,
      access_token: accessToken,
      scope: tokenData.scope,
    }

    // Haal shop naam op
    const client = new ShopifyClient(credentials)
    const shopName = await client.getShopName()

    // Check of er al een integratie bestaat (mogelijk disconnected)
    const existingIntegration = await getIntegrationByPlatform('shopify')

    if (existingIntegration) {
      // Update bestaande integratie
      const success = await updateIntegration(existingIntegration.id, {
        status: 'connected',
        credentials,
        storeUrl: `https://${shop}`,
        storeName: shopName ?? shop,
      })

      if (!success) {
        settingsUrl.searchParams.set('integration_error', 'Kan integratie niet bijwerken')
        return NextResponse.redirect(settingsUrl)
      }
    } else {
      // Maak nieuwe integratie aan
      const integrationId = await createIntegration({
        organizationId: oauthState.orgId,
        platform: 'shopify',
        credentials,
        storeUrl: `https://${shop}`,
        storeName: shopName ?? shop,
      })

      if (!integrationId) {
        settingsUrl.searchParams.set('integration_error', 'Kan integratie niet aanmaken')
        return NextResponse.redirect(settingsUrl)
      }
    }

    // Redirect naar settings met success
    settingsUrl.searchParams.set('integration_success', 'Shopify succesvol verbonden')
    return NextResponse.redirect(settingsUrl)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('[Shopify Callback] Fout:', errorMessage)
    settingsUrl.searchParams.set('integration_error', 'Verbinding met Shopify mislukt')
    return NextResponse.redirect(settingsUrl)
  }
}
