import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Haal de huidige ingelogde gebruiker op.
 * Retourneert null als de gebruiker niet is ingelogd.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Haal de organisatie-ID op van de ingelogde gebruiker.
 * Kijkt in de organization_members tabel.
 * Retourneert null als er geen organisatie is gekoppeld.
 */
export async function getUserOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    console.error('[getUserOrganizationId] Geen organisatie gevonden:', error?.message)
    return null
  }

  return data.organization_id
}

/**
 * Haal de organisatie-ID op, met fallback voor development.
 * Gebruikt de echte auth als die beschikbaar is, anders de DEV_ORG_ID.
 */
export async function getOrganizationIdOrDev(): Promise<string> {
  const orgId = await getUserOrganizationId()
  if (orgId) return orgId

  // Fallback voor development — zolang er geen gebruikers aan orgs zijn gekoppeld
  return '11111111-1111-1111-1111-111111111111'
}
