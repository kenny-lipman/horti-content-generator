"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlignStartVertical,
  AlignEndVertical,
  ArrowDownLeft,
  ArrowDownRight,
  Minus,
  Plus,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LogoPosition } from "@/lib/types"

interface LogoEditorProps {
  imageUrl: string
  logoUrl: string
  defaultPosition: LogoPosition
  onApply: (resultDataUrl: string) => void
  onCancel: () => void
}

const POSITIONS: { value: LogoPosition; label: string; icon: typeof AlignStartVertical }[] = [
  { value: "top-left", label: "Linksboven", icon: AlignStartVertical },
  { value: "top-right", label: "Rechtsboven", icon: AlignEndVertical },
  { value: "bottom-left", label: "Linksonder", icon: ArrowDownLeft },
  { value: "bottom-right", label: "Rechtsonder", icon: ArrowDownRight },
]

export function LogoEditor({
  imageUrl,
  logoUrl,
  defaultPosition,
  onApply,
  onCancel,
}: LogoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [position, setPosition] = useState<LogoPosition>(defaultPosition)
  const [scale, setScale] = useState(100) // percentage
  const [isReady, setIsReady] = useState(false)

  const drawPreview = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    try {
      const [baseImg, logoImg] = await Promise.all([
        loadImg(imageUrl),
        loadImg(logoUrl),
      ])

      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(baseImg, 0, 0, w, h)

      // Logo sizing
      const maxLogoWidth = w * 0.15 * (scale / 100)
      const maxLogoHeight = h * 0.08 * (scale / 100)
      const logoScale = Math.min(
        maxLogoWidth / logoImg.width,
        maxLogoHeight / logoImg.height,
        1
      )
      const logoW = Math.round(logoImg.width * logoScale)
      const logoH = Math.round(logoImg.height * logoScale)
      const margin = Math.round(w * 0.03)

      let x: number
      let y: number

      switch (position) {
        case "top-left":
          x = margin; y = margin; break
        case "top-right":
          x = w - logoW - margin; y = margin; break
        case "bottom-left":
          x = margin; y = h - logoH - margin; break
        case "bottom-right":
          x = w - logoW - margin; y = h - logoH - margin; break
      }

      ctx.drawImage(logoImg, x, y, logoW, logoH)
      setIsReady(true)
    } catch {
      console.warn("Failed to render preview")
    }
  }, [imageUrl, logoUrl, position, scale])

  useEffect(() => {
    drawPreview()
  }, [drawPreview])

  function handleApply() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    onApply(dataUrl)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo plaatsen</CardTitle>
        <CardDescription>
          Pas de positie en grootte van je logo aan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview canvas */}
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="w-full"
          />
        </div>

        {/* Position buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Positie</label>
          <div className="grid grid-cols-4 gap-2">
            {POSITIONS.map((pos) => {
              const Icon = pos.icon
              return (
                <Button
                  key={pos.value}
                  variant={position === pos.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosition(pos.value)}
                  className="flex-col gap-1 h-auto py-2"
                >
                  <Icon className="size-4" />
                  <span className="text-xs">{pos.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Scale slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Grootte: {scale}%
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setScale((s) => Math.max(50, s - 10))}
            >
              <Minus className="size-3" />
            </Button>
            <input
              type="range"
              min="50"
              max="200"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setScale((s) => Math.min(200, s + 10))}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            disabled={!isReady}
            className={cn("flex-1")}
          >
            <Check className="mr-2 size-4" />
            Toepassen
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
