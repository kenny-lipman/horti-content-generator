"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { updateOrganizationAction, updateBusinessTypesAction } from "@/app/actions/organization"
import { toast } from "sonner"
import type { OrganizationWithDetails } from "@/lib/data/organization"
import type { BusinessType } from "@/lib/supabase/types"

const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "grower", label: "Kweker" },
  { value: "wholesaler", label: "Groothandel" },
  { value: "retailer", label: "Retailer" },
]

interface OrganizationTabProps {
  organization: OrganizationWithDetails | null
}

export function OrganizationTab({ organization }: OrganizationTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(organization?.name ?? "")
  const [slug, setSlug] = useState(organization?.slug ?? "")
  const [billingEmail, setBillingEmail] = useState(organization?.billing_email ?? "")
  const [selectedTypes, setSelectedTypes] = useState<BusinessType[]>(
    organization?.business_types ?? []
  )

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">
            Organisatie niet gevonden
          </p>
        </CardContent>
      </Card>
    )
  }

  function handleToggleType(type: BusinessType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function handleSaveOrganization() {
    startTransition(async () => {
      const result = await updateOrganizationAction({
        name: name.trim(),
        slug: slug.trim(),
        billing_email: billingEmail.trim() || null,
      })

      if (result.success) {
        toast.success("Organisatie bijgewerkt")
        router.refresh()
      } else {
        toast.error(result.error ?? "Bijwerken mislukt")
      }
    })
  }

  function handleSaveBusinessTypes() {
    startTransition(async () => {
      const result = await updateBusinessTypesAction(selectedTypes)

      if (result.success) {
        toast.success("Bedrijfstype bijgewerkt")
        router.refresh()
      } else {
        toast.error(result.error ?? "Bijwerken mislukt")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Organisatie gegevens */}
      <Card>
        <CardHeader>
          <CardTitle>Organisatie gegevens</CardTitle>
          <CardDescription>
            Pas de basisgegevens van je organisatie aan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="org-name" className="text-sm font-medium">
              Naam
            </label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organisatienaam"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="org-slug" className="text-sm font-medium">
              Slug
            </label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="organisatie-slug"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="org-billing-email" className="text-sm font-medium">
              Billing e-mail
            </label>
            <Input
              id="org-billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="facturen@bedrijf.nl"
            />
          </div>

          <Button
            onClick={handleSaveOrganization}
            disabled={isPending || !name.trim() || !slug.trim()}
          >
            {isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </CardContent>
      </Card>

      {/* Bedrijfstype */}
      <Card>
        <CardHeader>
          <CardTitle>Bedrijfstype</CardTitle>
          <CardDescription>
            Selecteer het type bedrijf. Dit bepaalt welke functies beschikbaar zijn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedTypes.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleType(option.value)}
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {selectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTypes.map((type) => {
                const label = BUSINESS_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
                return (
                  <Badge key={type} variant="secondary">
                    {label}
                  </Badge>
                )
              })}
            </div>
          )}

          <Button
            onClick={handleSaveBusinessTypes}
            disabled={isPending}
          >
            {isPending ? "Opslaan..." : "Bedrijfstype opslaan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
