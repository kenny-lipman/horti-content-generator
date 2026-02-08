export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { getSceneTemplates } from "@/lib/data/scenes"
import { getOrganizationIdOrDev } from "@/lib/data/auth"
import { ScenesClient } from "./scenes-client"

export const metadata: Metadata = {
  title: "Scenes - Floriday Content Generator",
}

export default async function ScenesPage() {
  const organizationId = await getOrganizationIdOrDev()
  const scenes = await getSceneTemplates(organizationId)

  const systemScenes = scenes.filter((s) => s.is_system)
  const customScenes = scenes.filter((s) => !s.is_system)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Scenes</h1>
        <p className="text-sm text-muted-foreground">
          Kies een sfeer voor je productfoto&apos;s of maak een eigen scene
        </p>
      </div>

      <ScenesClient
        systemScenes={systemScenes}
        customScenes={customScenes}
      />
    </div>
  )
}
