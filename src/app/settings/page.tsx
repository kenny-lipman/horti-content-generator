export const dynamic = 'force-dynamic'

import { getOrganizationIdOrDev } from "@/lib/data/auth"
import { getOrganization, getTeamMembers } from "@/lib/data/organization"
import { getUsageSummary } from "@/lib/data/billing"
import { getIntegrations, getAllSyncLogs } from "@/lib/data/integrations"
import { SettingsClient } from "./settings-client"

export const metadata = {
  title: "Instellingen - Floriday Content Generator",
}

export default async function SettingsPage() {
  const orgId = await getOrganizationIdOrDev()

  const [organization, teamMembers, usageSummary, integrations, syncLogs] = await Promise.all([
    getOrganization(orgId),
    getTeamMembers(orgId),
    getUsageSummary(orgId),
    getIntegrations(),
    getAllSyncLogs(),
  ])

  return (
    <SettingsClient
      organization={organization}
      teamMembers={teamMembers}
      usageSummary={usageSummary}
      integrations={integrations}
      syncLogs={syncLogs}
    />
  )
}
