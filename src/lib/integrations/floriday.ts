import { createAdminClient } from '@/lib/supabase/server'

// ============================================
// Floriday API Configuration
// ============================================

const FLORIDAY_API_URL = process.env.FLORIDAY_API_URL || 'https://idp.staging.floriday.io/oauth2/ausmw6b47z1BnlHkw0h7'
const FLORIDAY_AUTH_URL = process.env.FLORIDAY_AUTH_URL || 'https://idp.staging.floriday.io/oauth2/ausmw6b47z1BnlHkw0h7'
const FLORIDAY_TRADE_URL = process.env.FLORIDAY_TRADE_API_URL || 'https://api.staging.floriday.io/trade-items-api/v2'

// ============================================
// Types
// ============================================

interface FloridayCredentials {
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt?: number
}

export interface FloridayTradeItem {
  tradeItemId: string
  tradeItemName: string
  vbnProductCode: string
  packingConfigurations: Array<{
    piecesPerPackage: number
    packagesPerLayer: number
    layersPerLoadCarrier: number
  }>
  photos: Array<{
    id: string
    url: string
    type: string
  }>
}

// ============================================
// Floriday API Client
// ============================================

export class FloridayClient {
  private credentials: FloridayCredentials
  private baseUrl: string
  private authUrl: string
  private tradeUrl: string

  constructor(credentials: Record<string, unknown>) {
    this.credentials = {
      clientId: (credentials.client_id as string) || '',
      clientSecret: (credentials.client_secret as string) || '',
      accessToken: (credentials.access_token as string) || '',
      refreshToken: (credentials.refresh_token as string) || '',
      tokenExpiresAt: (credentials.token_expires_at as number) || 0,
    }
    this.baseUrl = FLORIDAY_API_URL
    this.authUrl = FLORIDAY_AUTH_URL
    this.tradeUrl = FLORIDAY_TRADE_URL
  }

  /**
   * Verkrijg een geldig access token. Vernieuwt automatisch als het verlopen is.
   */
  private async getAccessToken(): Promise<string> {
    // Check of het huidige token nog geldig is (5 minuten marge)
    const now = Date.now()
    if (this.credentials.accessToken && this.credentials.tokenExpiresAt && this.credentials.tokenExpiresAt > now + 300_000) {
      return this.credentials.accessToken
    }

    // Token vernieuwen via refresh token
    if (this.credentials.refreshToken) {
      try {
        const response = await fetch(`${this.authUrl}/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: this.credentials.clientId,
            client_secret: this.credentials.clientSecret,
            refresh_token: this.credentials.refreshToken,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Token refresh mislukt: ${response.status} ${errorText}`)
        }

        const tokenData = await response.json()
        this.credentials.accessToken = tokenData.access_token
        this.credentials.refreshToken = tokenData.refresh_token || this.credentials.refreshToken
        this.credentials.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000)

        return this.credentials.accessToken
      } catch (error) {
        console.error('[FloridayClient] Token refresh error:', error)
        throw new Error('Kan Floriday token niet vernieuwen. Verbind opnieuw.')
      }
    }

    // Client credentials flow als fallback
    try {
      const response = await fetch(`${this.authUrl}/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          scope: 'role:app',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Client credentials flow mislukt: ${response.status} ${errorText}`)
      }

      const tokenData = await response.json()
      this.credentials.accessToken = tokenData.access_token
      this.credentials.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000)

      return this.credentials.accessToken
    } catch (error) {
      console.error('[FloridayClient] Client credentials error:', error)
      throw new Error('Kan geen Floriday token verkrijgen.')
    }
  }

  /**
   * Haal de huidige credentials op (inclusief vernieuwde tokens).
   * Gebruik dit om tokens op te slaan na API calls.
   */
  getUpdatedCredentials(): Record<string, unknown> {
    return {
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      access_token: this.credentials.accessToken,
      refresh_token: this.credentials.refreshToken,
      token_expires_at: this.credentials.tokenExpiresAt,
    }
  }

  /**
   * Haal trade items (producten) op van Floriday.
   */
  async getTradeItems(): Promise<FloridayTradeItem[]> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.tradeUrl}/trade-items`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-Api-Key': this.credentials.clientId,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[FloridayClient] getTradeItems error:', response.status, errorText)
      throw new Error(`Kan trade items niet ophalen: ${response.status}`)
    }

    const data = await response.json()

    // Map Floriday response naar onze types
    return (data.results || data || []).map((item: Record<string, unknown>) => ({
      tradeItemId: item.tradeItemId || item.id,
      tradeItemName: item.tradeItemName || item.name || '',
      vbnProductCode: item.vbnProductCode || '',
      packingConfigurations: item.packingConfigurations || [],
      photos: (item.photos || []) as FloridayTradeItem['photos'],
    }))
  }

  /**
   * Haal fotos op voor een specifiek trade item.
   */
  async getTradeItemPhotos(tradeItemId: string): Promise<Array<{ id: string; url: string; type: string }>> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.tradeUrl}/trade-items/${tradeItemId}/photos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-Api-Key': this.credentials.clientId,
      },
    })

    if (!response.ok) {
      console.error(`[FloridayClient] getTradeItemPhotos error for ${tradeItemId}:`, response.status)
      return []
    }

    const data = await response.json()
    return data || []
  }

  /**
   * Upload een foto naar Floriday voor een trade item.
   */
  async uploadPhoto(tradeItemId: string, buffer: Buffer, mimeType: string): Promise<boolean> {
    const token = await this.getAccessToken()

    const formData = new FormData()
    const uint8 = new Uint8Array(buffer)
    const blob = new Blob([uint8], { type: mimeType })
    formData.append('file', blob, `photo.${mimeType.split('/')[1] || 'jpg'}`)

    const response = await fetch(`${this.tradeUrl}/trade-items/${tradeItemId}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Api-Key': this.credentials.clientId,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[FloridayClient] uploadPhoto error for ${tradeItemId}:`, response.status, errorText)
      return false
    }

    return true
  }
}

// ============================================
// High-level integration functions
// ============================================

/**
 * Importeer trade items van Floriday als producten in de lokale database.
 * Maakt product records + mappings aan.
 */
export async function importFloridayProducts(
  integrationId: string,
  orgId: string
): Promise<{ imported: number; failed: number }> {
  const supabase = createAdminClient()

  // Haal integratie op
  const { data: integration, error: intError } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single()

  if (intError || !integration) {
    throw new Error('Integratie niet gevonden')
  }

  const client = new FloridayClient(integration.credentials as Record<string, unknown>)

  // Haal trade items op
  let tradeItems: FloridayTradeItem[]
  try {
    tradeItems = await client.getTradeItems()
  } catch (error) {
    console.error('[importFloridayProducts] Fout bij ophalen trade items:', error)
    throw error
  }

  // Sla vernieuwde tokens op
  await supabase
    .from('integrations')
    .update({
      credentials: client.getUpdatedCredentials() as unknown as import('@/lib/supabase/types').Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId)

  let imported = 0
  let failed = 0

  for (const item of tradeItems) {
    try {
      // Check of er al een mapping bestaat
      const { data: existingMapping } = await supabase
        .from('integration_product_mappings')
        .select('id')
        .eq('integration_id', integrationId)
        .eq('external_product_id', item.tradeItemId)
        .limit(1)
        .single()

      if (existingMapping) {
        // Product bestaat al, skip
        continue
      }

      // Maak product aan
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          organization_id: orgId,
          name: item.tradeItemName,
          sku: item.vbnProductCode || null,
          product_type: 'plant',
          is_active: true,
          catalog_image_url: item.photos?.[0]?.url || null,
        })
        .select('id')
        .single()

      if (productError || !product) {
        console.error(`[importFloridayProducts] Fout bij aanmaken product ${item.tradeItemName}:`, productError?.message)
        failed++
        continue
      }

      // Maak mapping aan
      const { error: mappingError } = await supabase
        .from('integration_product_mappings')
        .insert({
          integration_id: integrationId,
          product_id: product.id,
          external_product_id: item.tradeItemId,
          sync_status: 'synced',
        })

      if (mappingError) {
        console.error(`[importFloridayProducts] Fout bij aanmaken mapping:`, mappingError.message)
        failed++
        continue
      }

      imported++
    } catch (error) {
      console.error(`[importFloridayProducts] Fout bij importeren ${item.tradeItemName}:`, error)
      failed++
    }
  }

  // Update last_sync_at
  await supabase
    .from('integrations')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId)

  return { imported, failed }
}

/**
 * Push een goedgekeurde foto naar Floriday voor een specifiek product.
 */
export async function pushPhotoToFloriday(
  integrationId: string,
  productId: string,
  imageUrl: string
): Promise<boolean> {
  const supabase = createAdminClient()

  // Haal integratie op
  const { data: integration, error: intError } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single()

  if (intError || !integration) {
    console.error('[pushPhotoToFloriday] Integratie niet gevonden:', intError?.message)
    return false
  }

  // Haal product mapping op
  const { data: mapping, error: mapError } = await supabase
    .from('integration_product_mappings')
    .select('*')
    .eq('integration_id', integrationId)
    .eq('product_id', productId)
    .limit(1)
    .single()

  if (mapError || !mapping) {
    console.error('[pushPhotoToFloriday] Geen mapping gevonden voor product:', productId)
    return false
  }

  const client = new FloridayClient(integration.credentials as Record<string, unknown>)

  try {
    // Download de afbeelding
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Kan afbeelding niet downloaden: ${imageResponse.status}`)
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer())
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Upload naar Floriday
    const success = await client.uploadPhoto(mapping.external_product_id, buffer, mimeType)

    // Sla vernieuwde tokens op
    await supabase
      .from('integrations')
      .update({
        credentials: client.getUpdatedCredentials() as unknown as import('@/lib/supabase/types').Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)

    if (success) {
      // Update mapping last_synced_at
      await supabase
        .from('integration_product_mappings')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        })
        .eq('id', mapping.id)
    }

    return success
  } catch (error) {
    console.error('[pushPhotoToFloriday] Fout bij pushen foto:', error)
    return false
  }
}

// ============================================
// OAuth helpers
// ============================================

/**
 * Genereer de Floriday OAuth redirect URL.
 */
export function getFloridayOAuthUrl(state: string): string {
  const clientId = process.env.FLORIDAY_CLIENT_ID || ''
  const callbackUrl = process.env.FLORIDAY_CALLBACK_URL || ''

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'openid role:app',
    state,
  })

  return `${FLORIDAY_AUTH_URL}/v1/authorize?${params.toString()}`
}

/**
 * Wissel een authorization code om voor tokens.
 */
export async function exchangeFloridayCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  const clientId = process.env.FLORIDAY_CLIENT_ID || ''
  const clientSecret = process.env.FLORIDAY_CLIENT_SECRET || ''
  const callbackUrl = process.env.FLORIDAY_CALLBACK_URL || ''

  try {
    const response = await fetch(`${FLORIDAY_AUTH_URL}/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        code,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[exchangeFloridayCode] Token exchange mislukt:', response.status, errorText)
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error('[exchangeFloridayCode] Fout bij token exchange:', error)
    return null
  }
}
