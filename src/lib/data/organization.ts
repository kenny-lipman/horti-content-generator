import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type {
  Organization,
  OrganizationMember,
  OrganizationBusinessType,
  OrganizationModule,
  BusinessType,
  OrgRole,
  ModuleType,
} from '@/lib/supabase/types'

// ============================================
// Types
// ============================================

export interface OrganizationWithDetails extends Organization {
  business_types: BusinessType[]
  modules: ModuleType[]
}

export interface TeamMember {
  id: string
  user_id: string
  role: string
  invited_at: string | null
  accepted_at: string | null
  created_at: string | null
  email: string | null
}

// ============================================
// Organization
// ============================================

/**
 * Haal organisatie op met business types en modules.
 */
export async function getOrganization(orgId: string): Promise<OrganizationWithDetails | null> {
  const supabase = await createClient()

  const [orgResult, typesResult, modulesResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle(),
    supabase
      .from('organization_business_types')
      .select('business_type')
      .eq('organization_id', orgId),
    supabase
      .from('organization_modules')
      .select('module')
      .eq('organization_id', orgId),
  ])

  if (orgResult.error || !orgResult.data) {
    console.error('[getOrganization] Error:', orgResult.error?.message)
    return null
  }

  return {
    ...orgResult.data,
    business_types: (typesResult.data ?? []).map(t => t.business_type as BusinessType),
    modules: (modulesResult.data ?? []).map(m => m.module as ModuleType),
  }
}

/**
 * Update organisatie basisgegevens.
 */
export async function updateOrganization(
  orgId: string,
  data: {
    name?: string
    slug?: string
    billing_email?: string | null
    logo_url?: string | null
  }
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organizations')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    console.error('[updateOrganization] Error:', error.message)
    return false
  }

  return true
}

/**
 * Update business types voor organisatie (replace all).
 */
export async function updateBusinessTypes(
  orgId: string,
  types: BusinessType[]
): Promise<boolean> {
  const supabase = createAdminClient()

  // Delete existing
  const { error: deleteError } = await supabase
    .from('organization_business_types')
    .delete()
    .eq('organization_id', orgId)

  if (deleteError) {
    console.error('[updateBusinessTypes] Delete error:', deleteError.message)
    return false
  }

  // Insert new
  if (types.length > 0) {
    const { error: insertError } = await supabase
      .from('organization_business_types')
      .insert(types.map(t => ({ organization_id: orgId, business_type: t })))

    if (insertError) {
      console.error('[updateBusinessTypes] Insert error:', insertError.message)
      return false
    }
  }

  return true
}

// ============================================
// Organization Creation (for signup)
// ============================================

/**
 * Genereer een unieke slug voor een organisatie.
 */
async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  base: string
): Promise<string> {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48) || 'mijn-organisatie'

  // Check if slug exists
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return slug

  // Append number suffix until unique
  for (let i = 2; i <= 100; i++) {
    const candidate = `${slug}-${i}`
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) return candidate
  }

  // Fallback: append random suffix
  return `${slug}-${Date.now().toString(36)}`
}

/**
 * Maak een organisatie aan voor een nieuwe gebruiker (signup flow).
 * Maakt org + membership (admin) + subscription (free trial) aan.
 * Gebruikt admin client (geen INSERT RLS policies).
 */
export async function createOrganizationForNewUser(params: {
  userId: string
  email: string
  orgName?: string
}): Promise<{ organizationId: string } | { error: string }> {
  const supabase = createAdminClient()

  const name = params.orgName?.trim() || params.email.split('@')[0] || 'Mijn Organisatie'
  const slug = await generateUniqueSlug(supabase, name)

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      billing_email: params.email,
    })
    .select('id')
    .single()

  if (orgError || !org) {
    console.error('[createOrganizationForNewUser] Org insert error:', orgError?.message)
    return { error: 'Kon organisatie niet aanmaken' }
  }

  // 2. Add user as admin member
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: params.userId,
      role: 'admin',
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    })

  if (memberError) {
    console.error('[createOrganizationForNewUser] Member insert error:', memberError.message)
    // Rollback: delete org
    await supabase.from('organizations').delete().eq('id', org.id)
    return { error: 'Kon lidmaatschap niet aanmaken' }
  }

  // 3. Assign free trial subscription
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'free-trial')
    .eq('is_active', true)
    .maybeSingle()

  if (plan) {
    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 30)

    await supabase
      .from('subscriptions')
      .insert({
        organization_id: org.id,
        plan_id: plan.id,
        status: 'trialing',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: trialEnd.toISOString().split('T')[0],
      })
  }

  return { organizationId: org.id }
}

// ============================================
// Team Members
// ============================================

/**
 * Haal teamleden op met email (via auth.users lookup).
 * Gebruikt Promise.all om N+1 queries te voorkomen.
 */
export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = createAdminClient()

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('id, user_id, role, invited_at, accepted_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error || !members) {
    console.error('[getTeamMembers] Error:', error?.message)
    return []
  }

  // Parallel lookup van alle user emails
  const emailResults = await Promise.all(
    members.map(m => supabase.auth.admin.getUserById(m.user_id))
  )

  const emailMap = new Map<string, string>()
  for (let i = 0; i < members.length; i++) {
    const user = emailResults[i].data?.user
    if (user?.email) {
      emailMap.set(members[i].user_id, user.email)
    }
  }

  return members.map(m => ({
    ...m,
    email: emailMap.get(m.user_id) ?? null,
  }))
}

/**
 * Nodig een teamlid uit via email.
 * Als de gebruiker al bestaat in auth, koppel direct.
 * Anders maak een invite record aan.
 */
export async function inviteTeamMember(
  orgId: string,
  email: string,
  role: OrgRole = 'member'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Zoek gebruiker op email via SQL (vermijdt listUsers() die alle users ophaalt)
  const { data: authUser } = await supabase.rpc('get_user_by_email' as never, { p_email: email } as never) as { data: { id: string } | null }

  // Fallback: gebruik admin API als RPC niet bestaat
  let existingUser: { id: string; email?: string } | null = authUser ? { id: authUser.id, email } : null
  if (!existingUser) {
    // Directe lookup via admin getUserById is niet mogelijk zonder ID,
    // dus gebruiken we listUsers met een klein window
    const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 })
    existingUser = users.find(u => u.email === email) ?? null
  }

  if (existingUser) {
    // Check of al lid
    const { data: existing } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', existingUser.id)
      .single()

    if (existing) {
      return { success: false, error: 'Deze gebruiker is al lid van de organisatie' }
    }

    // Voeg direct toe als lid
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: existingUser.id,
        role,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[inviteTeamMember] Error:', error.message)
      return { success: false, error: 'Uitnodiging mislukt' }
    }

    return { success: true }
  }

  // Gebruiker bestaat niet — maak invite-only auth user aan
  const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
  })

  if (signUpError || !newUser.user) {
    console.error('[inviteTeamMember] Signup error:', signUpError?.message)
    return { success: false, error: 'Kon geen uitnodiging versturen' }
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: newUser.user.id,
      role,
      invited_at: new Date().toISOString(),
    })

  if (memberError) {
    console.error('[inviteTeamMember] Member error:', memberError.message)
    return { success: false, error: 'Uitnodiging mislukt' }
  }

  return { success: true }
}

/**
 * Wijzig de rol van een teamlid.
 */
export async function updateMemberRole(
  memberId: string,
  role: OrgRole
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)

  if (error) {
    console.error('[updateMemberRole] Error:', error.message)
    return false
  }

  return true
}

/**
 * Verwijder een teamlid.
 */
export async function removeMember(memberId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    console.error('[removeMember] Error:', error.message)
    return false
  }

  return true
}
