import { requireAuth } from '@/lib/data/auth'
import { getIntegrationByPlatform, createSyncLog, updateSyncLog } from '@/lib/data/integrations'
import { importWooCommerceProducts } from '@/lib/integrations/woocommerce'

export async function POST() {
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

  // Haal WooCommerce integratie op
  const integration = await getIntegrationByPlatform('woocommerce', auth.orgId)

  if (!integration || integration.status !== 'connected') {
    return Response.json(
      { error: 'WooCommerce is niet verbonden', code: 'NOT_CONNECTED' },
      { status: 400 }
    )
  }

  // Maak sync log aan
  const logId = await createSyncLog({
    integrationId: integration.id,
    syncType: 'products',
    status: 'processing',
    direction: 'inbound',
  })

  try {
    // Importeer producten
    const result = await importWooCommerceProducts(integration.id, auth.orgId)

    // Update sync log met resultaten
    if (logId) {
      await updateSyncLog(logId, {
        status: result.failed > 0 ? 'completed_with_errors' : 'completed',
        itemsProcessed: result.imported,
        itemsFailed: result.failed,
      })
    }

    return Response.json({
      message: `${result.imported} producten geïmporteerd van WooCommerce`,
      data: {
        imported: result.imported,
        failed: result.failed,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'

    // Update sync log met fout
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        itemsProcessed: 0,
        itemsFailed: 0,
        errorDetails: { message: errorMessage },
      })
    }

    console.error('[WooCommerce Import] Fout:', errorMessage)

    return Response.json(
      {
        error: 'Import mislukt',
        details: errorMessage,
        code: 'IMPORT_FAILED',
      },
      { status: 500 }
    )
  }
}
