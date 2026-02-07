"use client"

import { useEffect, useRef } from "react"
import {
  Camera,
  Ruler,
  Search,
  Layers,
  Grid3x3,
  Home,
  Flower2,
  Truck,
  type LucideIcon,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, isImageTypeAvailable, getDisabledReason } from "@/lib/utils"
import { IMAGE_TYPES } from "@/lib/constants"
import type { Product, ImageType } from "@/lib/types"
import { Info, PackageCheck, Sparkles } from "lucide-react"

interface ImageTypeSelectorProps {
  product: Product
  selectedTypes: ImageType[]
  onTypesChange: (types: ImageType[]) => void
}

const TYPE_ICONS: Record<ImageType, LucideIcon> = {
  "white-background": Camera,
  "measuring-tape": Ruler,
  detail: Search,
  composite: Layers,
  tray: Grid3x3,
  lifestyle: Home,
  seasonal: Flower2,
  "danish-cart": Truck,
}

export function ImageTypeSelector({
  product,
  selectedTypes,
  onTypesChange,
}: ImageTypeSelectorProps) {
  const hasInitialized = useRef(false)

  // Initialisatie: enable alle types waar defaultEnabled=true EN isImageTypeAvailable=true
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initialTypes = IMAGE_TYPES.filter(
      (config) => config.defaultEnabled && isImageTypeAvailable(config.id, product)
    ).map((config) => config.id)

    onTypesChange(initialTypes)
  }, [product, onTypesChange])

  const handleToggle = (typeId: ImageType, checked: boolean) => {
    if (checked) {
      onTypesChange([...selectedTypes, typeId])
    } else {
      onTypesChange(selectedTypes.filter((t) => t !== typeId))
    }
  }

  const selectedCount = selectedTypes.length

  // Preset: Floriday Basis — witte achtergrond, meetlat, detail
  const PRESET_BASIS: ImageType[] = ["white-background", "measuring-tape", "detail"]

  // Preset: Volledig Pakket — alle beschikbare types
  const allAvailableTypes = IMAGE_TYPES.filter((config) =>
    isImageTypeAvailable(config.id, product)
  ).map((config) => config.id)

  const applyPreset = (preset: ImageType[]) => {
    // Only include types that are actually available for this product
    const filtered = preset.filter((t) =>
      isImageTypeAvailable(t, product)
    )
    onTypesChange(filtered)
  }

  const availableBasis = PRESET_BASIS.filter((t) => isImageTypeAvailable(t, product))
  const isBasisActive =
    availableBasis.length === selectedTypes.length &&
    availableBasis.every((t) => selectedTypes.includes(t))

  const isVolledigActive =
    allAvailableTypes.length === selectedTypes.length &&
    allAvailableTypes.every((t) => selectedTypes.includes(t))

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Preset knoppen */}
        <div className="flex items-center gap-2">
          <Button
            variant={isBasisActive ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(PRESET_BASIS)}
            className="gap-1.5"
          >
            <PackageCheck className="size-3.5" />
            Floriday Basis
          </Button>
          <Button
            variant={isVolledigActive ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(allAvailableTypes)}
            className="gap-1.5"
          >
            <Sparkles className="size-3.5" />
            Volledig Pakket
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            Snelle selectie
          </span>
        </div>

        {/* Grid van foto-type cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {IMAGE_TYPES.map((config) => {
            const Icon = TYPE_ICONS[config.id]
            const available = isImageTypeAvailable(config.id, product)
            const disabledReason = getDisabledReason(config.id, product)
            const isSelected = selectedTypes.includes(config.id)

            const card = (
              <div
                key={config.id}
                className={cn(
                  "relative flex flex-col gap-3 rounded-lg border p-3 transition-colors",
                  available && isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card",
                  !available && "opacity-50"
                )}
              >
                {/* Header: icon + switch */}
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md",
                      available && isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className={cn(!available && "pointer-events-none")}>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggle(config.id, checked)
                      }
                      disabled={!available}
                    />
                  </div>
                </div>

                {/* Naam + beschrijving */}
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {config.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {config.description}
                  </p>
                  {/* Dependency hint voor composite */}
                  {config.id === "composite" && isSelected && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Info className="size-3 shrink-0" />
                      Inclusief witte achtergrond en detailfoto
                    </p>
                  )}
                </div>
              </div>
            )

            // Wrap disabled cards in tooltip
            if (!available && disabledReason) {
              return (
                <Tooltip key={config.id}>
                  <TooltipTrigger asChild>{card}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    {disabledReason}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return card
          })}
        </div>

        {/* Teller */}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span>{" "}
          foto-type{selectedCount !== 1 ? "s" : ""} geselecteerd
        </p>
      </div>
    </TooltipProvider>
  )
}
