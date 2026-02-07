"use client"

import { useGrowerSettings } from "@/lib/hooks/use-grower-settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Trash2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useRef } from "react"
import type { LogoPosition, AspectRatio, ImageSize } from "@/lib/types"

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: "top-left", label: "Linksboven" },
  { value: "top-right", label: "Rechtsboven" },
  { value: "bottom-left", label: "Linksonder" },
  { value: "bottom-right", label: "Rechtsonder" },
]

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 (Vierkant)" },
  { value: "4:3", label: "4:3 (Liggend)" },
  { value: "3:4", label: "3:4 (Staand)" },
  { value: "16:9", label: "16:9 (Breedbeeld)" },
  { value: "9:16", label: "9:16 (Portret)" },
]

const RESOLUTIONS: { value: ImageSize; label: string }[] = [
  { value: "1024", label: "1K (1024px)" },
  { value: "2048", label: "2K (2048px)" },
  { value: "4096", label: "4K (4096px)" },
]

export default function SettingsPage() {
  const {
    settings,
    isLoaded,
    setLogo,
    setLogoPosition,
    setDefaultAspectRatio,
    setDefaultResolution,
    resetSettings,
  } = useGrowerSettings()

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen zijn toegestaan")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo mag maximaal 2MB zijn")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setLogo(reader.result as string)
      toast.success("Logo geüpload")
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveLogo() {
    setLogo(null)
    toast.success("Logo verwijderd")
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Beheer je bedrijfslogo en standaard voorkeuren
      </p>

      <div className="mt-8 space-y-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Bedrijfslogo</CardTitle>
            <CardDescription>
              Upload je logo om op gegenereerde foto&apos;s te plaatsen. PNG of SVG
              met transparante achtergrond aanbevolen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.logoUrl ? (
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted/50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logoUrl}
                    alt="Bedrijfslogo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Verwijderen
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Klik om logo te uploaden
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PNG, SVG — max 2MB
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Logo positie</label>
              <Select
                value={settings.logoPosition}
                onValueChange={(v) => setLogoPosition(v as LogoPosition)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGO_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Standaard instellingen</CardTitle>
            <CardDescription>
              Deze instellingen worden automatisch toegepast bij het genereren van
              nieuwe foto&apos;s.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Beeldverhouding</label>
              <Select
                value={settings.defaultAspectRatio}
                onValueChange={(v) =>
                  setDefaultAspectRatio(v as AspectRatio)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ar) => (
                    <SelectItem key={ar.value} value={ar.value}>
                      {ar.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resolutie</label>
              <Select
                value={settings.defaultResolution}
                onValueChange={(v) =>
                  setDefaultResolution(v as ImageSize)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reset */}
        <Button variant="outline" onClick={resetSettings}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Instellingen herstellen
        </Button>
      </div>
    </div>
  )
}
