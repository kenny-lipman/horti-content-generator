'use server'

import { getOrganizationIdOrDev } from '@/lib/data/auth'
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
  const orgId = await getOrganizationIdOrDev()
  const success = await updateOrganization(orgId, data)
  return { success, error: success ? undefined : 'Bijwerken mislukt' }
}

export async function updateBusinessTypesAction(
  types: BusinessType[]
): Promise<{ success: boolean; error?: string }> {
  const orgId = await getOrganizationIdOrDev()
  const success = await updateBusinessTypes(orgId, types)
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
  const orgId = await getOrganizationIdOrDev()
  return inviteTeamMember(orgId, email, role)
}

export async function updateMemberRoleAction(
  memberId: string,
  role: OrgRole
): Promise<{ success: boolean; error?: string }> {
  const success = await updateMemberRole(memberId, role)
  return { success, error: success ? undefined : 'Rol bijwerken mislukt' }
}

export async function removeMemberAction(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
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
