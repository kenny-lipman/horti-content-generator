"use client"

import { useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Link2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import type { Integration } from "@/lib/supabase/types"

// ============================================
// Types
// ============================================

interface ChannelsTabProps {
  productId: string
  integrations: Integration[]
}

// ============================================
// Component
// ============================================

export function ChannelsTab({ productId, integrations }: ChannelsTabProps) {
  const [pushingPlatform, setPushingPlatform] = useState<string | null>(null)
  const [pushedPlatforms, setPushedPlatforms] = useState<Set<string>>(new Set())

  const connectedIntegrations = integrations.filter(
    (i) => i.status === "connected"
  )

  const handlePush = useCallback(
    async (integration: Integration, imageUrl?: string) => {
      if (!imageUrl) {
        toast.error("Geen goedgekeurde foto beschikbaar om te pushen")
        return
      }

      setPushingPlatform(integration.platform)
      try {
        const response = await fetch(
          `/api/integrations/${integration.platform}/push`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              imageUrl,
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Push mislukt")
        }

        toast.success(data.message || `Foto gepusht naar ${integration.platform}`)
        setPushedPlatforms((prev) => new Set(prev).add(integration.platform))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Push naar ${integration.platform} mislukt`
        )
      } finally {
        setPushingPlatform(null)
      }
    },
    [productId]
  )

  if (connectedIntegrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kanalen</CardTitle>
          <CardDescription>
            Publiceer goedgekeurde foto&apos;s naar externe platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
            <Link2 className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Geen integraties verbonden
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Ga naar{" "}
              <a
                href="/settings?tab=integrations"
                className="text-primary underline hover:no-underline"
              >
                Instellingen &rarr; Integraties
              </a>{" "}
              om een platform te verbinden.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kanalen</CardTitle>
        <CardDescription>
          Publiceer goedgekeurde foto&apos;s naar verbonden platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connectedIntegrations.map((integration) => {
            const isPushing = pushingPlatform === integration.platform
            const isPushed = pushedPlatforms.has(integration.platform)
            const platformName =
              integration.platform.charAt(0).toUpperCase() +
              integration.platform.slice(1)

            return (
              <div
                key={integration.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                    <Link2 className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{platformName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="default" className="bg-green-600 text-xs">
                        <CheckCircle2 className="mr-1 size-2.5" />
                        Verbonden
                      </Badge>
                      {integration.store_name && (
                        <span>{integration.store_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPushed ? (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="size-4" />
                      Gepusht
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePush(integration)}
                      disabled={isPushing}
                    >
                      {isPushing ? (
                        <>
                          <Loader2 className="mr-1.5 size-3 animate-spin" />
                          Pushen...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1.5 size-3" />
                          Push foto&apos;s
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Info text */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Keur eerst foto&apos;s goed in de Foto&apos;s tab. Goedgekeurde foto&apos;s
              worden automatisch naar de geselecteerde kanalen gestuurd.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
