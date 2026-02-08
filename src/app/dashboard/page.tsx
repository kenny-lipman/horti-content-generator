export const dynamic = 'force-dynamic'

import { getOrganizationIdOrDev } from "@/lib/data/auth"
import { getDashboardStats, getRecentImages } from "@/lib/data/billing"
import { getNotifications } from "@/lib/data/notifications"
import { DashboardClient } from "./dashboard-client"

export const metadata = {
  title: "Dashboard - Floriday Content Generator",
}

export default async function DashboardPage() {
  const organizationId = await getOrganizationIdOrDev()

  const [stats, recentImages, notifications] = await Promise.all([
    getDashboardStats(organizationId),
    getRecentImages(organizationId, 8),
    getNotifications(organizationId, { limit: 5 }),
  ])

  return (
    <DashboardClient
      stats={stats}
      recentImages={recentImages}
      notifications={notifications}
    />
  )
}
