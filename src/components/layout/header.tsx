"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Leaf, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Catalogus" },
  { href: "/settings", label: "Instellingen", icon: Settings },
]

export function Header() {
  const pathname = usePathname()

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
      </div>
    </header>
  )
}
