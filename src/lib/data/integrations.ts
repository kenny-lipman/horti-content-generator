import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Integration, IntegrationProductMapping, IntegrationSyncLog, Json } from '@/lib/supabase/types'

// ============================================
// Read functions (RLS-aware via createClient)
// ============================================

/**
 * Haal alle integraties op voor de huidige organisatie.
 * RLS filtert automatisch op organization_id.
 */
export async function getIntegrations(orgId?: string): Promise<Integration[]> {
  const supabase = await createClient()

  let query = supabase
    .from('integrations')
    .select('*')

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getIntegrations] Fout bij ophalen integraties:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Haal een specifieke integratie op basis van platform.
 * Retourneert null als er geen integratie is voor het platform.
 */
export async function getIntegrationByPlatform(platform: string, orgId?: string): Promise<Integration | null> {
  const supabase = await createClient()

  let query = supabase
    .from('integrations')
    .select('*')
    .eq('platform', platform)

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data, error } = await query
    .limit(1)
    .single()

  if (error) {
    // PGRST116 = no rows found — niet loggen als fout
    if (error.code !== 'PGRST116') {
      console.error(`[getIntegrationByPlatform] Fout voor platform ${platform}:`, error.message)
    }
    return null
  }

  return data
}

/**
 * Haal een integratie op basis van ID.
 */
export async function getIntegrationById(id: string, orgId?: string): Promise<Integration | null> {
  const supabase = await createClient()

  let query = supabase
    .from('integrations')
    .select('*')
    .eq('id', id)

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data, error } = await query
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`[getIntegrationById] Fout voor id ${id}:`, error.message)
    }
    return null
  }

  return data
}

// ============================================
// Write functions (Admin client voor system writes)
// ============================================

/**
 * Maak een nieuwe integratie aan.
 * Gebruikt admin client omdat dit vanuit OAuth callback of system context wordt aangeroepen.
 */
export async function createIntegration(data: {
  organizationId: string
  platform: string
  credentials: Record<string, unknown>
  storeUrl?: string
  storeName?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: integration, error } = await supabase
    .from('integrations')
    .insert({
      organization_id: data.organizationId,
      platform: data.platform,
      status: 'connected',
      credentials: data.credentials as unknown as Json,
      store_url: data.storeUrl ?? null,
      store_name: data.storeName ?? null,
      last_sync_at: null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createIntegration] Fout bij aanmaken integratie:', error.message)
    return null
  }

  return integration?.id ?? null
}

/**
 * Werk een bestaande integratie bij.
 */
export async function updateIntegration(
  id: string,
  data: {
    status?: string
    credentials?: Record<string, unknown>
    lastSyncAt?: string
    storeName?: string
    storeUrl?: string
    settings?: Record<string, unknown>
  }
): Promise<boolean> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.status !== undefined) updateData.status = data.status
  if (data.credentials !== undefined) updateData.credentials = data.credentials
  if (data.lastSyncAt !== undefined) updateData.last_sync_at = data.lastSyncAt
  if (data.storeName !== undefined) updateData.store_name = data.storeName
  if (data.storeUrl !== undefined) updateData.store_url = data.storeUrl
  if (data.settings !== undefined) updateData.settings = data.settings

  const { error } = await supabase
    .from('integrations')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error(`[updateIntegration] Fout bij updaten integratie ${id}:`, error.message)
    return false
  }

  return true
}

/**
 * Verwijder een integratie en bijbehorende mappings.
 */
export async function deleteIntegration(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`[deleteIntegration] Fout bij verwijderen integratie ${id}:`, error.message)
    return false
  }

  return true
}

// ============================================
// Product Mappings
// ============================================

/**
 * Maak een product mapping aan (koppeling tussen lokaal product en extern platform product).
 * Gebruikt admin client voor system-level sync operaties.
 */
export async function createProductMapping(data: {
  integrationId: string
  productId: string
  externalProductId: string
  externalVariantId?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: mapping, error } = await supabase
    .from('integration_product_mappings')
    .insert({
      integration_id: data.integrationId,
      product_id: data.productId,
      external_product_id: data.externalProductId,
      external_variant_id: data.externalVariantId ?? null,
      sync_status: 'synced',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createProductMapping] Fout bij aanmaken mapping:', error.message)
    return null
  }

  return mapping?.id ?? null
}

/**
 * Haal alle product mappings op voor een integratie.
 */
export async function getProductMappings(integrationId: string): Promise<IntegrationProductMapping[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integration_product_mappings')
    .select('*')
    .eq('integration_id', integrationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getProductMappings] Fout bij ophalen mappings:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Haal product mapping op basis van product ID en integratie ID.
 */
export async function getProductMappingByProductId(
  integrationId: string,
  productId: string
): Promise<IntegrationProductMapping | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integration_product_mappings')
    .select('*')
    .eq('integration_id', integrationId)
    .eq('product_id', productId)
    .limit(1)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[getProductMappingByProductId] Fout:', error.message)
    }
    return null
  }

  return data
}

// ============================================
// Sync Logs
// ============================================

/**
 * Maak een sync log entry aan.
 * Gebruikt admin client voor system-level operaties.
 */
export async function createSyncLog(data: {
  integrationId: string
  syncType: string
  status: string
  direction: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: log, error } = await supabase
    .from('integration_sync_logs')
    .insert({
      integration_id: data.integrationId,
      sync_type: data.syncType,
      status: data.status,
      direction: data.direction,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createSyncLog] Fout bij aanmaken sync log:', error.message)
    return null
  }

  return log?.id ?? null
}

/**
 * Werk een sync log bij met resultaten.
 */
export async function updateSyncLog(
  logId: string,
  data: {
    status?: string
    itemsProcessed?: number
    itemsFailed?: number
    errorDetails?: Record<string, unknown>
  }
): Promise<boolean> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {}

  if (data.status !== undefined) updateData.status = data.status
  if (data.itemsProcessed !== undefined) updateData.items_processed = data.itemsProcessed
  if (data.itemsFailed !== undefined) updateData.items_failed = data.itemsFailed
  if (data.errorDetails !== undefined) updateData.error_details = data.errorDetails

  // Als status completed of failed is, voeg completed_at toe
  if (data.status === 'completed' || data.status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('integration_sync_logs')
    .update(updateData)
    .eq('id', logId)

  if (error) {
    console.error(`[updateSyncLog] Fout bij updaten sync log ${logId}:`, error.message)
    return false
  }

  return true
}

/**
 * Haal sync logs op voor een integratie, gesorteerd op datum (nieuwste eerst).
 */
export async function getSyncLogs(integrationId: string, limit = 20): Promise<IntegrationSyncLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getSyncLogs] Fout bij ophalen sync logs:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Haal alle sync logs op voor alle integraties van de huidige org.
 */
export async function getAllSyncLogs(limit = 50): Promise<IntegrationSyncLog[]> {
  const supabase = await createClient()

  // Haal eerst alle integratie IDs op (RLS filtert op org)
  const { data: integrations, error: intError } = await supabase
    .from('integrations')
    .select('id')

  if (intError || !integrations?.length) {
    return []
  }

  const integrationIds = integrations.map((i) => i.id)

  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .in('integration_id', integrationIds)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAllSyncLogs] Fout bij ophalen sync logs:', error.message)
    return []
  }

  return data ?? []
}
