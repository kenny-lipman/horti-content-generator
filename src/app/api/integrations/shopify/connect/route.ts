import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/data/auth'
import { getIntegrationByPlatform } from '@/lib/data/integrations'

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
  let body: { shopDomain?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Ongeldige JSON body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const { shopDomain } = body

  if (!shopDomain) {
    return Response.json(
      { error: 'shopDomain is verplicht', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // Normaliseer shop domain
  const normalizedDomain = shopDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

  // Check of er al een Shopify integratie bestaat
  const existingIntegration = await getIntegrationByPlatform('shopify')
  if (existingIntegration && existingIntegration.status === 'connected') {
    return Response.json(
      { error: 'Shopify is al verbonden', code: 'ALREADY_CONNECTED' },
      { status: 409 }
    )
  }

  // Environment variables
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products'
  const callbackUrl = process.env.SHOPIFY_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    console.error('[Shopify Connect] Ontbrekende environment variables: SHOPIFY_CLIENT_ID of SHOPIFY_CALLBACK_URL')
    return Response.json(
      { error: 'Shopify integratie is niet geconfigureerd', code: 'CONFIG_ERROR' },
      { status: 500 }
    )
  }

  // Genereer state token voor CSRF bescherming
  const state = crypto.randomUUID()

  // Sla state + context op in een httpOnly cookie (geldig 10 minuten)
  const cookieStore = await cookies()
  cookieStore.set('shopify_oauth_state', JSON.stringify({
    state,
    orgId: auth.orgId,
    userId: auth.userId,
    shopDomain: normalizedDomain,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minuten
    path: '/',
  })

  // Bouw Shopify OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: callbackUrl,
    state,
  })

  const redirectUrl = `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`

  return Response.json({
    message: 'Redirect naar Shopify OAuth',
    redirectUrl,
    timestamp: new Date().toISOString(),
  })
}
