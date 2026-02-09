'use server'

import { getOrganizationIdOrDev } from '@/lib/data/auth'
import { createAdminClient } from '@/lib/supabase/server'
import {
  getOrganization,
  updateOrganization,
  updateBusinessTypes,
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
} from '@/lib/data/organization'
import { getUsageSummary } from '@/lib/data/billing'
import { organizationUpdateSchema, businessTypesSchema, inviteMemberSchema } from '@/lib/schemas'
import type { BusinessType, OrgRole } from '@/lib/supabase/types'

// ============================================
// Organization
// ============================================

export async function getOrganizationAction() {
  const orgId = await getOrganizationIdOrDev()
  return getOrganization(orgId)
}

export async function updateOrganizationAction(data: {
  name?: string
  slug?: string
  billing_email?: string | null
  logo_url?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const parsed = organizationUpdateSchema.safeParse(data)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validatiefout' }
  }

  const orgId = await getOrganizationIdOrDev()
  const success = await updateOrganization(orgId, parsed.data)
  return { success, error: success ? undefined : 'Bijwerken mislukt' }
}

export async function updateBusinessTypesAction(
  types: BusinessType[]
): Promise<{ success: boolean; error?: string }> {
  const parsed = businessTypesSchema.safeParse(types)
  if (!parsed.success) {
    return { success: false, error: 'Ongeldig bedrijfstype' }
  }

  const orgId = await getOrganizationIdOrDev()
  const success = await updateBusinessTypes(orgId, parsed.data)
  return { success, error: success ? undefined : 'Bijwerken mislukt' }
}

// ============================================
// Team
// ============================================

export async function getTeamMembersAction() {
  const orgId = await getOrganizationIdOrDev()
  return getTeamMembers(orgId)
}

export async function inviteTeamMemberAction(
  email: string,
  role: OrgRole = 'member'
): Promise<{ success: boolean; error?: string }> {
  const parsed = inviteMemberSchema.safeParse({ email, role })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Validatiefout' }
  }

  const orgId = await getOrganizationIdOrDev()
  return inviteTeamMember(orgId, parsed.data.email, parsed.data.role as OrgRole)
}

export async function updateMemberRoleAction(
  memberId: string,
  role: OrgRole
): Promise<{ success: boolean; error?: string }> {
  // Verify member belongs to caller's organization
  const orgId = await getOrganizationIdOrDev()
  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single()

  if (!member) {
    return { success: false, error: 'Teamlid niet gevonden' }
  }

  const success = await updateMemberRole(memberId, role)
  return { success, error: success ? undefined : 'Rol bijwerken mislukt' }
}

export async function removeMemberAction(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify member belongs to caller's organization
  const orgId = await getOrganizationIdOrDev()
  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single()

  if (!member) {
    return { success: false, error: 'Teamlid niet gevonden' }
  }

  const success = await removeMember(memberId)
  return { success, error: success ? undefined : 'Verwijderen mislukt' }
}

// ============================================
// Billing
// ============================================

export async function getUsageSummaryAction() {
  const orgId = await getOrganizationIdOrDev()
  return getUsageSummary(orgId)
}
