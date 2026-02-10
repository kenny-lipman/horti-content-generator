import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/data/auth'
import { getIntegrationByPlatform } from '@/lib/data/integrations'
import { getFloridayOAuthUrl } from '@/lib/integrations/floriday'

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

  // Check of er al een Floriday integratie bestaat
  const existingIntegration = await getIntegrationByPlatform('floriday', auth.orgId)
  if (existingIntegration && existingIntegration.status === 'connected') {
    return Response.json(
      { error: 'Floriday is al verbonden', code: 'ALREADY_CONNECTED' },
      { status: 409 }
    )
  }

  // Genereer state token voor CSRF bescherming
  const state = crypto.randomUUID()

  // Sla state + orgId op in een httpOnly cookie (geldig 10 minuten)
  const cookieStore = await cookies()
  cookieStore.set('floriday_oauth_state', JSON.stringify({
    state,
    orgId: auth.orgId,
    userId: auth.userId,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minuten
    path: '/',
  })

  // Genereer OAuth redirect URL
  const redirectUrl = getFloridayOAuthUrl(state)

  return Response.json({
    message: 'Redirect naar Floriday OAuth',
    redirectUrl,
    timestamp: new Date().toISOString(),
  })
}
