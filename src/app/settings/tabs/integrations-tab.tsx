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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Link2,
  Unlink,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import type { Integration, IntegrationSyncLog } from "@/lib/supabase/types"

// ============================================
// Types
// ============================================

interface IntegrationsTabProps {
  integrations: Integration[]
  syncLogs: IntegrationSyncLog[]
}

interface PlatformConfig {
  id: string
  name: string
  description: string
  logo: string
  available: boolean
  connectUrl?: string
  connectType: "oauth" | "shopify_oauth" | "api_key"
}

// ============================================
// Constants
// ============================================

const PLATFORMS: PlatformConfig[] = [
  {
    id: "floriday",
    name: "Floriday",
    description: "Synchroniseer producten en foto's met je Floriday account",
    logo: "/images/floriday-logo.svg",
    available: true,
    connectUrl: "/api/integrations/floriday/connect",
    connectType: "oauth",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Publiceer productfoto's rechtstreeks naar je Shopify webshop",
    logo: "/images/shopify-logo.svg",
    available: true,
    connectUrl: "/api/integrations/shopify/connect",
    connectType: "shopify_oauth",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Synchroniseer foto's met je WooCommerce webshop",
    logo: "/images/woocommerce-logo.svg",
    available: true,
    connectUrl: "/api/integrations/woocommerce/connect",
    connectType: "api_key",
  },
]

// ============================================
// Helpers
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="mr-1 size-3" />
          Verbonden
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="secondary">
          <Unlink className="mr-1 size-3" />
          Ontkoppeld
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 size-3" />
          Fout
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getSyncStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          Voltooid
        </Badge>
      )
    case "completed_with_errors":
      return (
        <Badge variant="default" className="bg-yellow-600 text-xs">
          Deels voltooid
        </Badge>
      )
    case "processing":
      return (
        <Badge variant="default" className="bg-blue-600 text-xs">
          <Loader2 className="mr-1 size-3 animate-spin" />
          Bezig
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          Mislukt
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      )
  }
}

function getSyncTypeLabel(syncType: string): string {
  switch (syncType) {
    case "products":
      return "Producten import"
    case "photo_push":
      return "Foto push"
    case "full_sync":
      return "Volledige sync"
    default:
      return syncType
  }
}

// ============================================
// Component
// ============================================

export function IntegrationsTab({ integrations, syncLogs }: IntegrationsTabProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  // Shopify connect dialog state
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false)
  const [shopifyDomain, setShopifyDomain] = useState("")

  // WooCommerce connect dialog state
  const [wooDialogOpen, setWooDialogOpen] = useState(false)
  const [wooStoreUrl, setWooStoreUrl] = useState("")
  const [wooConsumerKey, setWooConsumerKey] = useState("")
  const [wooConsumerSecret, setWooConsumerSecret] = useState("")

  // Zoek integratie voor een platform
  const getIntegration = useCallback(
    (platformId: string) => integrations.find((i) => i.platform === platformId),
    [integrations]
  )

  // Verbinden met platform (Floriday / directe OAuth)
  const handleConnect = useCallback(async (platform: PlatformConfig) => {
    if (platform.connectType === "shopify_oauth") {
      setShopifyDomain("")
      setShopifyDialogOpen(true)
      return
    }

    if (platform.connectType === "api_key") {
      setWooStoreUrl("")
      setWooConsumerKey("")
      setWooConsumerSecret("")
      setWooDialogOpen(true)
      return
    }

    if (!platform.connectUrl) return

    setConnectingPlatform(platform.id)
    try {
      const response = await fetch(platform.connectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verbinding mislukt")
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kan niet verbinden met " + platform.name
      )
      setConnectingPlatform(null)
    }
  }, [])

  // Shopify OAuth initieren
  const handleShopifyConnect = useCallback(async () => {
    if (!shopifyDomain.trim()) {
      toast.error("Vul je Shopify domeinnaam in")
      return
    }

    setConnectingPlatform("shopify")
    setShopifyDialogOpen(false)

    try {
      const response = await fetch("/api/integrations/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: shopifyDomain.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verbinding mislukt")
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kan niet verbinden met Shopify"
      )
      setConnectingPlatform(null)
    }
  }, [shopifyDomain])

  // WooCommerce API key validatie en verbinding
  const handleWooCommerceConnect = useCallback(async () => {
    if (!wooStoreUrl.trim() || !wooConsumerKey.trim() || !wooConsumerSecret.trim()) {
      toast.error("Vul alle velden in")
      return
    }

    setConnectingPlatform("woocommerce")
    setWooDialogOpen(false)

    try {
      const response = await fetch("/api/integrations/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeUrl: wooStoreUrl.trim(),
          consumerKey: wooConsumerKey.trim(),
          consumerSecret: wooConsumerSecret.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verbinding mislukt")
      }

      toast.success(data.message || "WooCommerce succesvol verbonden")
      window.location.reload()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kan niet verbinden met WooCommerce"
      )
      setConnectingPlatform(null)
    }
  }, [wooStoreUrl, wooConsumerKey, wooConsumerSecret])

  // Ontkoppelen
  const handleDisconnect = useCallback(async (integrationId: string, platformName: string) => {
    setDisconnectingId(integrationId)
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Ontkoppelen mislukt")
      }

      toast.success(`${platformName} ontkoppeld`)
      window.location.reload()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ontkoppelen mislukt"
      )
    } finally {
      setDisconnectingId(null)
    }
  }, [])

  // Producten importeren (platform-aware)
  const handleImport = useCallback(async (platformId: string, integrationId: string) => {
    setImportingId(integrationId)
    try {
      const response = await fetch(`/api/integrations/${platformId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Import mislukt")
      }

      toast.success(data.message || "Import voltooid")
      window.location.reload()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Import mislukt"
      )
    } finally {
      setImportingId(null)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Shopify connect dialog */}
      <Dialog open={shopifyDialogOpen} onOpenChange={setShopifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verbinden met Shopify</DialogTitle>
            <DialogDescription>
              Voer je Shopify domeinnaam in om de verbinding te starten. Je wordt
              doorgestuurd naar Shopify om toegang te verlenen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="shopify-domain" className="text-sm font-medium">
              Shopify domein
            </label>
            <Input
              id="shopify-domain"
              placeholder="jouw-winkel.myshopify.com"
              value={shopifyDomain}
              onChange={(e) => setShopifyDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShopifyConnect()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Bijv. jouw-winkel.myshopify.com
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopifyDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleShopifyConnect} disabled={!shopifyDomain.trim()}>
              <ExternalLink className="mr-2 size-4" />
              Verbinden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WooCommerce connect dialog */}
      <Dialog open={wooDialogOpen} onOpenChange={setWooDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verbinden met WooCommerce</DialogTitle>
            <DialogDescription>
              Voer je WooCommerce store URL en API-sleutels in. Je kunt API-sleutels
              aanmaken via WooCommerce &gt; Instellingen &gt; Geavanceerd &gt; REST API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="woo-store-url" className="text-sm font-medium">
                Store URL
              </label>
              <Input
                id="woo-store-url"
                placeholder="https://jouw-winkel.nl"
                value={wooStoreUrl}
                onChange={(e) => setWooStoreUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="woo-consumer-key" className="text-sm font-medium">
                Consumer Key
              </label>
              <Input
                id="woo-consumer-key"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={wooConsumerKey}
                onChange={(e) => setWooConsumerKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="woo-consumer-secret" className="text-sm font-medium">
                Consumer Secret
              </label>
              <Input
                id="woo-consumer-secret"
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={wooConsumerSecret}
                onChange={(e) => setWooConsumerSecret(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleWooCommerceConnect()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWooDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleWooCommerceConnect}
              disabled={!wooStoreUrl.trim() || !wooConsumerKey.trim() || !wooConsumerSecret.trim()}
            >
              <Link2 className="mr-2 size-4" />
              Verbinden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Platform overzicht */}
      <Card>
        <CardHeader>
          <CardTitle>Integraties</CardTitle>
          <CardDescription>
            Verbind externe platforms om producten en foto&apos;s te synchroniseren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORMS.map((platform) => {
              const integration = getIntegration(platform.id)
              const isConnected = integration?.status === "connected"
              const isConnecting = connectingPlatform === platform.id
              const isDisconnecting = disconnectingId === integration?.id
              const isImporting = importingId === integration?.id

              return (
                <Card key={platform.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                          <Link2 className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {platform.name}
                          </CardTitle>
                        </div>
                      </div>
                      {integration && getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {platform.description}
                    </p>

                    {/* Connected state: extra info + acties */}
                    {isConnected && integration && (
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        {integration.store_name && (
                          <div className="text-xs font-medium">
                            {integration.store_name}
                          </div>
                        )}

                        {integration.last_sync_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            Laatste sync: {formatDate(integration.last_sync_at)}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImport(platform.id, integration.id)}
                            disabled={isImporting}
                            className="flex-1"
                          >
                            {isImporting ? (
                              <>
                                <Loader2 className="mr-1.5 size-3 animate-spin" />
                                Importeren...
                              </>
                            ) : (
                              <>
                                <Download className="mr-1.5 size-3" />
                                Importeer
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDisconnect(integration.id, platform.name)
                            }
                            disabled={isDisconnecting}
                            className="text-destructive hover:text-destructive"
                          >
                            {isDisconnecting ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Unlink className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Not connected: connect button */}
                    {!isConnected && platform.available && (
                      <Button
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Verbinden...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 size-4" />
                            Verbinden
                          </>
                        )}
                      </Button>
                    )}

                    {/* Not available: coming soon */}
                    {!isConnected && !platform.available && (
                      <Button variant="outline" disabled className="w-full">
                        Binnenkort beschikbaar
                      </Button>
                    )}

                    {/* Error state: reconnect button */}
                    {integration?.status === "error" && platform.available && (
                      <Button
                        variant="outline"
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Opnieuw verbinden...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 size-4" />
                            Opnieuw verbinden
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sync geschiedenis */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync geschiedenis</CardTitle>
            <CardDescription>
              Overzicht van recente synchronisatie-activiteiten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Richting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDate(log.started_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getSyncTypeLabel(log.sync_type)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.direction === "inbound" ? (
                        <span className="flex items-center gap-1">
                          <Download className="size-3" /> Inkomend
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="size-3" /> Uitgaand
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getSyncStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {log.items_processed ?? 0}
                      {(log.items_failed ?? 0) > 0 && (
                        <span className="ml-1 text-destructive">
                          ({log.items_failed} mislukt)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
