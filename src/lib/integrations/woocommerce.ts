import { createAdminClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface WooCommerceProduct {
  id: number
  name: string
  slug: string
  sku: string
  images: Array<{ id: number; src: string; alt: string }>
  status: string
}

// ============================================
// WooCommerce REST Client
// ============================================

export class WooCommerceClient {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string

  constructor(credentials: Record<string, unknown>) {
    this.baseUrl = (credentials.store_url as string).replace(/\/+$/, '')
    this.consumerKey = credentials.consumer_key as string
    this.consumerSecret = credentials.consumer_secret as string
  }

  /**
   * Voer een request uit tegen de WooCommerce REST API.
   * Authenticatie via query parameters (consumer key/secret).
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = new URL(`/wp-json/wc/v3${endpoint}`, this.baseUrl)
    url.searchParams.set('consumer_key', this.consumerKey)
    url.searchParams.set('consumer_secret', this.consumerSecret)

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`WooCommerce API fout: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  /**
   * Haal producten op met page-based paginatie.
   */
  async getProducts(page?: number): Promise<WooCommerceProduct[]> {
    return this.request<WooCommerceProduct[]>(`/products?page=${page ?? 1}&per_page=100`)
  }

  /**
   * Haal het totale aantal producten op via de response headers.
   */
  async getProductCount(): Promise<number> {
    const url = new URL('/wp-json/wc/v3/products', this.baseUrl)
    url.searchParams.set('consumer_key', this.consumerKey)
    url.searchParams.set('consumer_secret', this.consumerSecret)
    url.searchParams.set('per_page', '1')

    const response = await fetch(url.toString())
    if (!response.ok) return 0

    const total = response.headers.get('X-WP-Total')
    return total ? parseInt(total, 10) : 0
  }

  /**
   * Upload een afbeelding naar een WooCommerce product.
   * WooCommerce accepteert een externe URL als afbeeldingsbron.
   */
  async uploadProductImage(productId: number, imageUrl: string, altText?: string): Promise<boolean> {
    await this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({
        images: [{ src: imageUrl, alt: altText ?? 'Productfoto' }],
      }),
    })

    return true
  }

  /**
   * Test de verbinding met WooCommerce.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/system_status')
      return true
    } catch {
      return false
    }
  }

  /**
   * Haal de store naam op.
   */
  async getStoreName(): Promise<string | null> {
    try {
      const data = await this.request<{ settings?: { store_name?: string }; environment?: { site_url?: string } }>('/system_status')
      return data.settings?.store_name ?? data.environment?.site_url ?? null
    } catch {
      return null
    }
  }
}

// ============================================
// High-level integration functions
// ============================================

/**
 * Importeer producten van WooCommerce naar de lokale database.
 * Maakt product records + mappings aan.
 */
export async function importWooCommerceProducts(
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

  const client = new WooCommerceClient(integration.credentials as Record<string, unknown>)

  // Haal alle producten op met paginatie
  const allProducts: WooCommerceProduct[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const products = await client.getProducts(page)
      allProducts.push(...products)

      // Als we minder dan 100 producten krijgen, zijn er geen meer
      if (products.length < 100) {
        hasMore = false
      } else {
        page++
      }
    } catch (error) {
      console.error('[importWooCommerceProducts] Fout bij ophalen producten:', error)
      throw error
    }
  }

  let imported = 0
  let failed = 0

  for (const item of allProducts) {
    try {
      // Check of er al een mapping bestaat
      const { data: existingMapping } = await supabase
        .from('integration_product_mappings')
        .select('id')
        .eq('integration_id', integrationId)
        .eq('external_product_id', String(item.id))
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
          name: item.name,
          sku: item.sku || null,
          product_type: 'plant',
          is_active: item.status === 'publish',
          catalog_image_url: item.images?.[0]?.src ?? null,
        })
        .select('id')
        .single()

      if (productError || !product) {
        console.error(`[importWooCommerceProducts] Fout bij aanmaken product ${item.name}:`, productError?.message)
        failed++
        continue
      }

      // Maak mapping aan
      const { error: mappingError } = await supabase
        .from('integration_product_mappings')
        .insert({
          integration_id: integrationId,
          product_id: product.id,
          external_product_id: String(item.id),
          sync_status: 'synced',
        })

      if (mappingError) {
        console.error('[importWooCommerceProducts] Fout bij aanmaken mapping:', mappingError.message)
        failed++
        continue
      }

      imported++
    } catch (error) {
      console.error(`[importWooCommerceProducts] Fout bij importeren ${item.name}:`, error)
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
 * Push een goedgekeurde foto naar WooCommerce voor een specifiek product.
 */
export async function pushPhotoToWooCommerce(
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
    console.error('[pushPhotoToWooCommerce] Integratie niet gevonden:', intError?.message)
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
    console.error('[pushPhotoToWooCommerce] Geen mapping gevonden voor product:', productId)
    return false
  }

  const client = new WooCommerceClient(integration.credentials as Record<string, unknown>)

  try {
    // WooCommerce accepteert een externe URL — geen download nodig
    const externalProductId = parseInt(mapping.external_product_id, 10)

    if (isNaN(externalProductId)) {
      console.error('[pushPhotoToWooCommerce] Ongeldig extern product ID:', mapping.external_product_id)
      return false
    }

    const success = await client.uploadProductImage(externalProductId, imageUrl, 'Productfoto')

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
    console.error('[pushPhotoToWooCommerce] Fout bij pushen foto:', error)
    return false
  }
}
