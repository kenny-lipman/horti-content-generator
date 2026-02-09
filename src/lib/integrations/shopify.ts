import { createAdminClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

interface ShopifyProduct {
  id: string
  title: string
  handle: string
  variants: { edges: Array<{ node: { id: string; sku: string } }> }
  featuredImage: { url: string } | null
}

interface ShopifyProductsResponse {
  products: {
    edges: Array<{ node: ShopifyProduct; cursor: string }>
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

interface StagedUploadsCreateResponse {
  stagedUploadsCreate: {
    stagedTargets: Array<{
      url: string
      resourceUrl: string
      parameters: Array<{ name: string; value: string }>
    }>
    userErrors: Array<{ field: string[]; message: string }>
  }
}

interface ProductCreateMediaResponse {
  productCreateMedia: {
    media: Array<{ id: string; status: string }>
    mediaUserErrors: Array<{ field: string[]; message: string }>
  }
}

export interface ShopifyProductSimple {
  id: string
  title: string
  handle: string
  variants: Array<{ sku: string }>
  imageUrl: string | null
}

// ============================================
// Shopify GraphQL Client
// ============================================

export class ShopifyClient {
  private shopDomain: string
  private accessToken: string

  constructor(credentials: Record<string, unknown>) {
    this.shopDomain = credentials.shop_domain as string
    this.accessToken = credentials.access_token as string
  }

  /**
   * Voer een GraphQL query uit tegen de Shopify Admin API.
   */
  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `https://${this.shopDomain}/admin/api/2024-01/graphql.json`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API fout: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0]?.message ?? 'GraphQL fout')
    }

    return data.data
  }

  /**
   * Haal producten op met cursor-based paginatie.
   */
  async getProducts(cursor?: string): Promise<{
    products: ShopifyProductSimple[]
    hasNextPage: boolean
    endCursor?: string
  }> {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              variants(first: 10) {
                edges {
                  node {
                    id
                    sku
                  }
                }
              }
              featuredImage {
                url
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    const data = await this.graphql<ShopifyProductsResponse>(query, {
      first: 50,
      after: cursor ?? null,
    })

    const products: ShopifyProductSimple[] = data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      variants: node.variants.edges.map(({ node: v }) => ({ sku: v.sku })),
      imageUrl: node.featuredImage?.url ?? null,
    }))

    return {
      products,
      hasNextPage: data.products.pageInfo.hasNextPage,
      endCursor: data.products.pageInfo.endCursor ?? undefined,
    }
  }

  /**
   * Upload een afbeelding naar Shopify als product media.
   * 1. Maak een staged upload aan
   * 2. Upload het bestand naar de staged URL
   * 3. Koppel de media aan het product
   */
  async uploadProductImage(productId: string, imageBuffer: Buffer, altText: string): Promise<boolean> {
    // Stap 1: Staged upload aanmaken
    const stagedUploadQuery = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const stagedData = await this.graphql<StagedUploadsCreateResponse>(stagedUploadQuery, {
      input: [
        {
          resource: 'IMAGE',
          filename: 'product-image.jpg',
          mimeType: 'image/jpeg',
          httpMethod: 'POST',
        },
      ],
    })

    if (stagedData.stagedUploadsCreate.userErrors.length > 0) {
      const errorMsg = stagedData.stagedUploadsCreate.userErrors[0].message
      console.error('[ShopifyClient] Staged upload fout:', errorMsg)
      return false
    }

    const target = stagedData.stagedUploadsCreate.stagedTargets[0]
    if (!target) {
      console.error('[ShopifyClient] Geen staged target ontvangen')
      return false
    }

    // Stap 2: Upload naar staged URL
    const formData = new FormData()
    for (const param of target.parameters) {
      formData.append(param.name, param.value)
    }
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'product-image.jpg')

    const uploadResponse = await fetch(target.url, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      console.error('[ShopifyClient] Bestand upload mislukt:', uploadResponse.status)
      return false
    }

    // Stap 3: Koppel media aan product
    const createMediaQuery = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            id
            status
          }
          mediaUserErrors {
            field
            message
          }
        }
      }
    `

    const mediaData = await this.graphql<ProductCreateMediaResponse>(createMediaQuery, {
      productId,
      media: [
        {
          alt: altText,
          mediaContentType: 'IMAGE',
          originalSource: target.resourceUrl,
        },
      ],
    })

    if (mediaData.productCreateMedia.mediaUserErrors.length > 0) {
      const errorMsg = mediaData.productCreateMedia.mediaUserErrors[0].message
      console.error('[ShopifyClient] Media aanmaken mislukt:', errorMsg)
      return false
    }

    return true
  }

  /**
   * Test de verbinding met Shopify.
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = `{ shop { name } }`
      await this.graphql(query)
      return true
    } catch {
      return false
    }
  }

  /**
   * Haal de shop naam op.
   */
  async getShopName(): Promise<string | null> {
    try {
      const query = `{ shop { name } }`
      const data = await this.graphql<{ shop: { name: string } }>(query)
      return data.shop.name
    } catch {
      return null
    }
  }
}

// ============================================
// High-level integration functions
// ============================================

/**
 * Importeer producten van Shopify naar de lokale database.
 * Maakt product records + mappings aan.
 */
export async function importShopifyProducts(
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

  const client = new ShopifyClient(integration.credentials as Record<string, unknown>)

  // Haal alle producten op met paginatie
  const allProducts: ShopifyProductSimple[] = []
  let cursor: string | undefined
  let hasNextPage = true

  while (hasNextPage) {
    try {
      const page = await client.getProducts(cursor)
      allProducts.push(...page.products)
      hasNextPage = page.hasNextPage
      cursor = page.endCursor
    } catch (error) {
      console.error('[importShopifyProducts] Fout bij ophalen producten:', error)
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
        .eq('external_product_id', item.id)
        .limit(1)
        .single()

      if (existingMapping) {
        // Product bestaat al, skip
        continue
      }

      // Bepaal SKU vanuit eerste variant
      const sku = item.variants[0]?.sku || null

      // Maak product aan
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          organization_id: orgId,
          name: item.title,
          sku,
          product_type: 'plant',
          is_active: true,
          catalog_image_url: item.imageUrl,
        })
        .select('id')
        .single()

      if (productError || !product) {
        console.error(`[importShopifyProducts] Fout bij aanmaken product ${item.title}:`, productError?.message)
        failed++
        continue
      }

      // Maak mapping aan
      const { error: mappingError } = await supabase
        .from('integration_product_mappings')
        .insert({
          integration_id: integrationId,
          product_id: product.id,
          external_product_id: item.id,
          sync_status: 'synced',
        })

      if (mappingError) {
        console.error('[importShopifyProducts] Fout bij aanmaken mapping:', mappingError.message)
        failed++
        continue
      }

      imported++
    } catch (error) {
      console.error(`[importShopifyProducts] Fout bij importeren ${item.title}:`, error)
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
 * Push een goedgekeurde foto naar Shopify voor een specifiek product.
 */
export async function pushPhotoToShopify(
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
    console.error('[pushPhotoToShopify] Integratie niet gevonden:', intError?.message)
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
    console.error('[pushPhotoToShopify] Geen mapping gevonden voor product:', productId)
    return false
  }

  const client = new ShopifyClient(integration.credentials as Record<string, unknown>)

  try {
    // Download de afbeelding
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Kan afbeelding niet downloaden: ${imageResponse.status}`)
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer())

    // Upload naar Shopify
    const success = await client.uploadProductImage(
      mapping.external_product_id,
      buffer,
      'Productfoto'
    )

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
    console.error('[pushPhotoToShopify] Fout bij pushen foto:', error)
    return false
  }
}
