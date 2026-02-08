"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Camera,
  CheckCircle,
  Clock,
  Plus,
  Upload,
  Images,
  Bell,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { DashboardStats } from "@/lib/data/billing"
import type { Notification } from "@/lib/supabase/types"

// ============================================
// Types
// ============================================

interface RecentImage {
  id: string
  image_url: string | null
  image_type: string
  review_status: string
  created_at: string | null
  product_name: string
}

interface DashboardClientProps {
  stats: DashboardStats
  recentImages: RecentImage[]
  notifications: Notification[]
}

// ============================================
// Helpers
// ============================================

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Zojuist"
  if (diffMin < 60) return `${diffMin}m geleden`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}u geleden`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d geleden`
}

const NOTIFICATION_ICONS: Record<string, string> = {
  generation_complete: "✅",
  generation_failed: "❌",
  usage_warning: "⚠️",
  usage_limit_reached: "🚫",
  sync_complete: "🔗",
  sync_failed: "🔗",
  import_complete: "📥",
  import_failed: "📥",
  system: "ℹ️",
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500",
  pending: "bg-yellow-500",
  rejected: "bg-red-500",
}

// ============================================
// Component
// ============================================

export function DashboardClient({
  stats,
  recentImages,
  notifications,
}: DashboardClientProps) {
  const usagePercentage =
    stats.photosLimit !== null
      ? Math.round((stats.photosUsed / stats.photosLimit) * 100)
      : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welkom terug
        </h1>
        <p className="text-sm text-muted-foreground">
          Hier is een overzicht van je content generatie
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Photos used */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Foto&apos;s deze maand
            </CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.photosUsed}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /{" "}
                {stats.photosLimit !== null
                  ? stats.photosLimit
                  : "onbeperkt"}
              </span>
            </div>
            {usagePercentage !== null ? (
              <div className="mt-3">
                <Progress value={usagePercentage} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {usagePercentage}% van je limiet gebruikt
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Onbeperkt plan ({stats.planName})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Approved */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Goedgekeurd</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedCount}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Goedgekeurde foto&apos;s
            </p>
          </CardContent>
        </Card>

        {/* Pending review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Te beoordelen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingReviewCount}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Foto&apos;s wachten op beoordeling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Recent photos + Sidebar */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Photos — 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recente foto&apos;s</CardTitle>
                <CardDescription>
                  Laatst gegenereerde afbeeldingen
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/content">Bekijk alles &rarr;</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recentImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {img.image_url ? (
                        <Image
                          src={img.image_url}
                          alt={img.product_name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {/* Status dot */}
                      <div
                        className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${
                          REVIEW_STATUS_COLORS[img.review_status] ??
                          "bg-gray-400"
                        }`}
                        title={img.review_status}
                      />
                      {/* Product name overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="truncate text-xs font-medium text-white">
                          {img.product_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <Camera className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Nog geen foto&apos;s gegenereerd
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/">Start met genereren</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Snelle acties</CardTitle>
              <CardDescription>
                Ga snel aan de slag met veelgebruikte functies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  asChild
                >
                  <Link href="/product/new">
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Nieuw product</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  asChild
                >
                  <Link href="/import">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Importeer Excel</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  asChild
                >
                  <Link href="/">
                    <Camera className="h-5 w-5" />
                    <span className="text-xs">Maak foto&apos;s</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  asChild
                >
                  <Link href="/content">
                    <Images className="h-5 w-5" />
                    <span className="text-xs">Content library</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications sidebar — 1/3 width */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Meldingen
                </CardTitle>
                <CardDescription>Recente activiteit</CardDescription>
              </div>
              {notifications.length > 0 && (
                <Badge variant="secondary">{notifications.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex gap-3 text-sm"
                    >
                      <span className="mt-0.5 shrink-0 text-base">
                        {NOTIFICATION_ICONS[notification.type] ?? "ℹ️"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-medium leading-tight ${
                            !notification.read
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.created_at && (
                          <p className="mt-1 text-xs text-muted-foreground/60">
                            {timeAgo(notification.created_at)}
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Geen meldingen
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
