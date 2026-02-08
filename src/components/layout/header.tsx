"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Leaf, Settings, Plus, LogOut, Images, Palette, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Notification } from "@/lib/supabase/types"
import {
  getNotificationsAction,
  getUnreadCountAction,
  markAsReadAction,
  markAllAsReadAction,
} from "@/app/actions/notifications"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Catalogus" },
  { href: "/content", label: "Content", icon: Images },
  { href: "/scenes", label: "Scenes", icon: Palette },
  { href: "/settings", label: "Instellingen", icon: Settings },
]

const NOTIFICATION_EMOJI: Record<string, string> = {
  generation_complete: "\u2705",
  generation_failed: "\u274C",
  usage_warning: "\u26A0\uFE0F",
  usage_limit_reached: "\uD83D\uDEAB",
  sync_complete: "\uD83D\uDD17",
  sync_failed: "\uD83D\uDD17",
  import_complete: "\uD83D\uDCE5",
  import_failed: "\uD83D\uDCE5",
  system: "\u2139\uFE0F",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const [items, count] = await Promise.all([
      getNotificationsAction({ limit: 10 }),
      getUnreadCountAction(),
    ])
    setNotifications(items)
    setUnreadCount(count)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh notifications when popover opens
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, fetchData])

  async function handleMarkAsRead(id: string) {
    const { success } = await markAsReadAction(id)
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  async function handleMarkAllAsRead() {
    const { success } = await markAllAsReadAction()
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" title="Meldingen">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Meldingen</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Alles gelezen
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Geen meldingen
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id)
                      }
                    }}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      !notification.read && "bg-accent/30"
                    )}
                  >
                    <span className="mt-0.5 text-base leading-none shrink-0">
                      {NOTIFICATION_EMOJI[notification.type] ?? "\u2139\uFE0F"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            !notification.read ? "font-semibold" : "font-medium"
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {notification.created_at
                          ? timeAgo(notification.created_at)
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isLoginPage = pathname === "/login"

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight tracking-tight">
              Floriday
            </span>
            <span className="text-xs leading-tight text-muted-foreground">
              Content Generator
            </span>
          </div>
        </Link>

        {!isLoginPage && (
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <NotificationBell />

            <Button asChild size="sm">
              <Link href="/product/new">
                <Plus className="mr-1 h-4 w-4" />
                Nieuw product
              </Link>
            </Button>

            {user && (
              <div className="ml-2 flex items-center gap-2 border-l pl-4">
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  title="Uitloggen"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
