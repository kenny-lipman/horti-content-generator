"use client"

import { Camera, TrendingUp, Crown, Building2, Check } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { UsageSummary } from "@/lib/data/billing"
import type { LucideIcon } from "lucide-react"

// ============================================
// Types
// ============================================

interface BillingTabProps {
  usageSummary: UsageSummary
}

interface Plan {
  name: string
  slug: string
  price: number | null
  photos: number | null
  icon: LucideIcon
  features: string[]
}

// ============================================
// Constants
// ============================================

const PLANS: Plan[] = [
  {
    name: "Starter",
    slug: "starter",
    price: 150,
    photos: 50,
    icon: Camera,
    features: ["50 foto's per maand", "Alle foto-types", "1 gebruiker"],
  },
  {
    name: "Growth",
    slug: "growth",
    price: 400,
    photos: 150,
    icon: TrendingUp,
    features: [
      "150 foto's per maand",
      "Alle foto-types",
      "5 gebruikers",
      "Scene templates",
    ],
  },
  {
    name: "Professional",
    slug: "professional",
    price: 1000,
    photos: 500,
    icon: Crown,
    features: [
      "500 foto's per maand",
      "Alle foto-types",
      "Onbeperkt gebruikers",
      "Custom scenes",
      "API toegang",
    ],
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: null,
    photos: null,
    icon: Building2,
    features: [
      "Onbeperkt foto's",
      "Alle features",
      "Dedicated support",
      "Custom integraties",
      "SLA",
    ],
  },
]

const PLAN_ORDER = ["starter", "growth", "professional", "enterprise"]

// ============================================
// Helpers
// ============================================

function formatDutchDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

function getPlanTier(slug: string): number {
  const index = PLAN_ORDER.indexOf(slug)
  return index === -1 ? 0 : index
}

// ============================================
// Component
// ============================================

export function BillingTab({ usageSummary }: BillingTabProps) {
  const {
    used,
    limit,
    percentage,
    planName,
    planSlug,
    periodStart,
    periodEnd,
  } = usageSummary

  const currentTier = getPlanTier(planSlug)
  const isUnlimited = limit === null

  return (
    <div className="space-y-6">
      {/* Huidig abonnement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Huidig abonnement</CardTitle>
              <CardDescription>
                Je huidige plan en verbruik voor deze periode.
              </CardDescription>
            </div>
            <Badge variant="default">{planName}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Periode: {formatDutchDate(periodStart)} &mdash;{" "}
            {formatDutchDate(periodEnd)}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(percentage ?? 0, 100)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>
                {isUnlimited
                  ? `${used} foto's gebruikt (onbeperkt)`
                  : `${used} van ${limit} foto's gebruikt`}
              </span>
              {!isUnlimited && percentage !== null && (
                <span className="text-muted-foreground">{percentage}%</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beschikbare plannen */}
      <Card>
        <CardHeader>
          <CardTitle>Beschikbare plannen</CardTitle>
          <CardDescription>
            Kies het plan dat het beste bij je organisatie past.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.slug === planSlug
              const planTier = getPlanTier(plan.slug)
              const isUpgrade = planTier > currentTier
              const isEnterprise = plan.slug === "enterprise"
              const Icon = plan.icon

              return (
                <div
                  key={plan.slug}
                  className={`flex flex-col rounded-lg border p-4 ${
                    isCurrent
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="size-5 text-primary" />
                    <span className="font-semibold">{plan.name}</span>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto">
                        Huidig
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">
                          EUR {plan.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /maand
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold">Op maat</span>
                    )}
                  </div>

                  <ul className="mb-4 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Huidig plan
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" className="w-full">
                      Contact
                    </Button>
                  ) : isUpgrade ? (
                    <Button className="w-full">Upgrade</Button>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Downgrade
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
