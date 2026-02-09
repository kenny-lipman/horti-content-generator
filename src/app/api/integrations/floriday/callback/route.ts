import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createIntegration, updateIntegration, getIntegrationByPlatform } from '@/lib/data/integrations'
import { exchangeFloridayCode } from '@/lib/integrations/floriday'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Redirect base URL
  const settingsUrl = new URL('/settings', request.url)
  settingsUrl.searchParams.set('tab', 'integrations')

  // Error van Floriday OAuth
  if (error) {
    console.error('[Floriday Callback] OAuth error:', error, errorDescription)
    settingsUrl.searchParams.set('integration_error', errorDescription || 'Verbinding mislukt')
    return NextResponse.redirect(settingsUrl)
  }

  // Valideer verplichte parameters
  if (!code || !state) {
    settingsUrl.searchParams.set('integration_error', 'Ongeldige callback parameters')
    return NextResponse.redirect(settingsUrl)
  }

  // Valideer state token tegen CSRF
  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('floriday_oauth_state')

  if (!stateCookie?.value) {
    settingsUrl.searchParams.set('integration_error', 'Sessie verlopen. Probeer opnieuw.')
    return NextResponse.redirect(settingsUrl)
  }

  let oauthState: { state: string; orgId: string; userId: string }
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
  cookieStore.delete('floriday_oauth_state')

  // Wissel code om voor tokens
  const tokens = await exchangeFloridayCode(code)

  if (!tokens) {
    settingsUrl.searchParams.set('integration_error', 'Kan tokens niet ophalen van Floriday')
    return NextResponse.redirect(settingsUrl)
  }

  // Credentials opslaan
  const credentials = {
    client_id: process.env.FLORIDAY_CLIENT_ID || '',
    client_secret: process.env.FLORIDAY_CLIENT_SECRET || '',
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_expires_at: Date.now() + (tokens.expiresIn * 1000),
  }

  // Check of er al een integratie bestaat (mogelijk disconnected)
  const existingIntegration = await getIntegrationByPlatform('floriday')

  if (existingIntegration) {
    // Update bestaande integratie
    const success = await updateIntegration(existingIntegration.id, {
      status: 'connected',
      credentials,
    })

    if (!success) {
      settingsUrl.searchParams.set('integration_error', 'Kan integratie niet bijwerken')
      return NextResponse.redirect(settingsUrl)
    }
  } else {
    // Maak nieuwe integratie aan
    const integrationId = await createIntegration({
      organizationId: oauthState.orgId,
      platform: 'floriday',
      credentials,
      storeName: 'Floriday',
    })

    if (!integrationId) {
      settingsUrl.searchParams.set('integration_error', 'Kan integratie niet aanmaken')
      return NextResponse.redirect(settingsUrl)
    }
  }

  // Redirect naar settings met success
  settingsUrl.searchParams.set('integration_success', 'Floriday succesvol verbonden')
  return NextResponse.redirect(settingsUrl)
}
