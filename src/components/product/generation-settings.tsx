"use client"

import { AlertTriangle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASPECT_RATIOS, IMAGE_SIZES } from "@/lib/constants"
import type { AspectRatio, ImageSize } from "@/lib/types"

interface GenerationSettingsProps {
  aspectRatio: AspectRatio
  resolution: ImageSize
  onAspectRatioChange: (v: AspectRatio) => void
  onResolutionChange: (v: ImageSize) => void
}

export function GenerationSettings({
  aspectRatio,
  resolution,
  onAspectRatioChange,
  onResolutionChange,
}: GenerationSettingsProps) {
  const selectedSize = IMAGE_SIZES.find((s) => s.value === resolution)
  const showWarning = selectedSize?.warning

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* Beeldverhouding */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Beeldverhouding</label>
          <Select
            value={aspectRatio}
            onValueChange={(v) => onAspectRatioChange(v as AspectRatio)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kies verhouding" />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resolutie */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Resolutie</label>
          <Select
            value={resolution}
            onValueChange={(v) => onResolutionChange(v as ImageSize)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kies resolutie" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4K warning */}
      {showWarning && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700">{showWarning}</p>
        </div>
      )}
    </div>
  )
}
