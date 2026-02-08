"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrganizationTab } from "./tabs/organization-tab"
import { TeamTab } from "./tabs/team-tab"
import { BillingTab } from "./tabs/billing-tab"
import { PreferencesTab } from "./tabs/preferences-tab"
import type { OrganizationWithDetails, TeamMember } from "@/lib/data/organization"
import type { UsageSummary } from "@/lib/data/billing"

interface SettingsClientProps {
  organization: OrganizationWithDetails | null
  teamMembers: TeamMember[]
  usageSummary: UsageSummary
}

export function SettingsClient({ organization, teamMembers, usageSummary }: SettingsClientProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Beheer je organisatie, team, abonnement en voorkeuren
      </p>

      <Tabs defaultValue="organization" className="mt-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization">Organisatie</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Abonnement</TabsTrigger>
          <TabsTrigger value="preferences">Voorkeuren</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <OrganizationTab organization={organization} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab members={teamMembers} />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingTab usageSummary={usageSummary} />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
