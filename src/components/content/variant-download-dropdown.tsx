"use client"

import { useState, useCallback } from "react"
import { Download, Loader2, Check, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IMAGE_VARIANT_PURPOSES } from "@/lib/constants"

interface VariantDownloadDropdownProps {
  imageId: string
  imageUrl: string | null
}

type DownloadState = "idle" | "generating" | "downloading" | "done"

export function VariantDownloadDropdown({
  imageId,
  imageUrl,
}: VariantDownloadDropdownProps) {
  const [loadingPurpose, setLoadingPurpose] = useState<string | null>(null)
  const [downloadState, setDownloadState] = useState<DownloadState>("idle")

  const handleOriginalDownload = useCallback(() => {
    if (!imageUrl) return
    triggerDownload(imageUrl, `origineel-${imageId}`)
  }, [imageUrl, imageId])

  const handleVariantDownload = useCallback(
    async (purpose: string, label: string) => {
      if (!imageId) return

      setLoadingPurpose(purpose)
      setDownloadState("generating")

      try {
        // Probeer eerst een bestaande variant op te halen
        const checkResponse = await fetch(
          `/api/images/${imageId}/variants?purpose=${purpose}`
        )

        let variantUrl: string | null = null

        if (checkResponse.ok) {
          // Variant bestaat al
          const checkData = await checkResponse.json()
          variantUrl = checkData.data?.image_url
        } else if (checkResponse.status === 404) {
          // Variant bestaat niet, genereer hem
          const generateResponse = await fetch(
            `/api/images/${imageId}/variants`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ purposes: [purpose] }),
            }
          )

          if (!generateResponse.ok) {
            const errorData = await generateResponse.json()
            throw new Error(errorData.error || "Variant generatie mislukt")
          }

          const generateData = await generateResponse.json()
          const result = generateData.data?.[0]

          if (!result?.success) {
            throw new Error(result?.error || "Variant generatie mislukt")
          }

          variantUrl = result.variant?.image_url
        } else {
          throw new Error("Fout bij ophalen variant")
        }

        if (!variantUrl) {
          throw new Error("Geen URL ontvangen voor variant")
        }

        // Download het bestand
        setDownloadState("downloading")
        triggerDownload(variantUrl, `${purpose}-${imageId}`)

        setDownloadState("done")
        setTimeout(() => {
          setDownloadState("idle")
          setLoadingPurpose(null)
        }, 1500)
      } catch (err) {
        console.error(`Fout bij downloaden ${purpose} variant:`, err)
        setDownloadState("idle")
        setLoadingPurpose(null)
      }
    },
    [imageId]
  )

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getItemIcon = (purpose: string) => {
    if (loadingPurpose === purpose) {
      if (downloadState === "done") {
        return <Check className="size-4 text-green-600" />
      }
      return <Loader2 className="size-4 animate-spin" />
    }
    return <ImageIcon className="size-4" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-4" />
          Downloaden
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Origineel */}
        <DropdownMenuLabel>Origineel</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleOriginalDownload}
          disabled={!imageUrl}
        >
          <Download className="size-4" />
          <span>Origineel formaat</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Web & Thumbnail */}
        <DropdownMenuLabel>Web</DropdownMenuLabel>
        {IMAGE_VARIANT_PURPOSES.filter(
          (p) => p.value === "web" || p.value === "thumbnail"
        ).map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleVariantDownload(item.value, item.label)}
            disabled={loadingPurpose !== null && loadingPurpose !== item.value}
          >
            {getItemIcon(item.value)}
            <span className="flex-1">
              {item.label}
            </span>
            <span className="text-muted-foreground text-xs">{item.format}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Print */}
        <DropdownMenuLabel>Print</DropdownMenuLabel>
        {IMAGE_VARIANT_PURPOSES.filter(
          (p) => p.value === "print" || p.value === "catalog"
        ).map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleVariantDownload(item.value, item.label)}
            disabled={loadingPurpose !== null && loadingPurpose !== item.value}
          >
            {getItemIcon(item.value)}
            <span className="flex-1">
              {item.label}
            </span>
            <span className="text-muted-foreground text-xs">{item.format}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Social Media */}
        <DropdownMenuLabel>Social media</DropdownMenuLabel>
        {IMAGE_VARIANT_PURPOSES.filter((p) =>
          p.value.startsWith("social_")
        ).map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleVariantDownload(item.value, item.label)}
            disabled={loadingPurpose !== null && loadingPurpose !== item.value}
          >
            {getItemIcon(item.value)}
            <span className="flex-1">
              {item.label}
            </span>
            <span className="text-muted-foreground text-xs">{item.format}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
