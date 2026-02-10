import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { getIntegrationByPlatform, createSyncLog, updateSyncLog } from '@/lib/data/integrations'
import { pushPhotoToFloriday } from '@/lib/integrations/floriday'
import { pushPhotoToShopify } from '@/lib/integrations/shopify'
import { pushPhotoToWooCommerce } from '@/lib/integrations/woocommerce'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
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

  const { platform } = await params

  // Valideer platform
  const supportedPlatforms = ['floriday', 'shopify', 'woocommerce']
  if (!supportedPlatforms.includes(platform)) {
    return Response.json(
      { error: `Platform '${platform}' wordt niet ondersteund`, code: 'UNSUPPORTED_PLATFORM' },
      { status: 400 }
    )
  }

  // Parse request body
  let body: { productId: string; imageUrl: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Ongeldige JSON body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const { productId, imageUrl } = body

  if (!productId || !imageUrl) {
    return Response.json(
      { error: 'productId en imageUrl zijn verplicht', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // Haal integratie op
  const integration = await getIntegrationByPlatform(platform, auth.orgId)

  if (!integration || integration.status !== 'connected') {
    return Response.json(
      { error: `${platform} is niet verbonden`, code: 'NOT_CONNECTED' },
      { status: 400 }
    )
  }

  // Maak sync log aan
  const logId = await createSyncLog({
    integrationId: integration.id,
    syncType: 'photo_push',
    status: 'processing',
    direction: 'outbound',
  })

  try {
    let success = false

    // Dispatch naar platform-specifieke push functie
    switch (platform) {
      case 'floriday':
        success = await pushPhotoToFloriday(integration.id, productId, imageUrl)
        break

      case 'shopify':
        success = await pushPhotoToShopify(integration.id, productId, imageUrl)
        break

      case 'woocommerce':
        success = await pushPhotoToWooCommerce(integration.id, productId, imageUrl)
        break

      default:
        return Response.json(
          { error: `Platform '${platform}' wordt niet ondersteund`, code: 'UNSUPPORTED_PLATFORM' },
          { status: 400 }
        )
    }

    // Update sync log
    if (logId) {
      await updateSyncLog(logId, {
        status: success ? 'completed' : 'failed',
        itemsProcessed: success ? 1 : 0,
        itemsFailed: success ? 0 : 1,
      })
    }

    if (success) {
      return Response.json({
        message: `Foto succesvol gepusht naar ${platform}`,
        data: { productId, platform },
        timestamp: new Date().toISOString(),
      })
    } else {
      return Response.json(
        {
          error: `Foto pushen naar ${platform} mislukt`,
          code: 'PUSH_FAILED',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'

    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        itemsProcessed: 0,
        itemsFailed: 1,
        errorDetails: { message: errorMessage },
      })
    }

    console.error(`[${platform} Push] Fout:`, errorMessage)

    return Response.json(
      {
        error: 'Push mislukt',
        details: errorMessage,
        code: 'PUSH_FAILED',
      },
      { status: 500 }
    )
  }
}
