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
 * In productie wordt een fout gegooid als er geen organisatie is.
 */
export async function getOrganizationIdOrDev(): Promise<string> {
  const orgId = await getUserOrganizationId()
  if (orgId) return orgId

  // Alleen in development: fallback naar dev org ID
  if (process.env.NODE_ENV !== 'production') {
    return '11111111-1111-1111-1111-111111111111'
  }

  throw new Error('Geen organisatie gevonden. Log opnieuw in.')
}

/**
 * Vereis authenticatie voor API routes.
 * Retourneert user en orgId, of gooit een Response als niet ingelogd.
 */
export async function requireAuth(): Promise<{
  userId: string
  orgId: string
}> {
  const user = await getCurrentUser()
  if (!user) {
    // In development: fallback zodat API routes werken zonder login
    if (process.env.NODE_ENV !== 'production') {
      return { userId: 'dev-user', orgId: '11111111-1111-1111-1111-111111111111' }
    }
    throw new Response(
      JSON.stringify({ error: 'Niet ingelogd', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const orgId = await getUserOrganizationId()
  if (!orgId) {
    // In development: fallback
    if (process.env.NODE_ENV !== 'production') {
      return { userId: user.id, orgId: '11111111-1111-1111-1111-111111111111' }
    }
    throw new Response(
      JSON.stringify({ error: 'Geen organisatie gevonden', code: 'NO_ORGANIZATION' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return { userId: user.id, orgId }
}

/**
 * Zorg dat een gebruiker een organisatie heeft (idempotent).
 * Als de user al een org heeft, retourneer die.
 * Anders, maak een nieuwe organisatie aan.
 */
export async function ensureUserHasOrganization(
  userId: string,
  email: string,
  orgName?: string
): Promise<string> {
  // Check of user al een org heeft (via admin client)
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (data) return data.organization_id

  // Maak nieuwe organisatie aan
  const { createOrganizationForNewUser } = await import('@/lib/data/organization')
  const result = await createOrganizationForNewUser({ userId, email, orgName })

  if ('error' in result) {
    throw new Error(result.error)
  }

  return result.organizationId
}
