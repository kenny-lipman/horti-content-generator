"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface BulkDownloadButtonProps {
  selectedIds: string[]
}

const DOWNLOAD_OPTIONS = [
  { purpose: "original", label: "Origineel", description: "Volledige resolutie" },
  { purpose: "web", label: "Web (1024px)", description: "WebP, geoptimaliseerd" },
  { purpose: "print", label: "Print (4096px)", description: "PNG, hoge kwaliteit" },
  { purpose: "social_instagram_square", label: "Instagram Vierkant", description: "1080x1080 JPG" },
  { purpose: "social_facebook", label: "Facebook", description: "1200x630 JPG" },
  { purpose: "catalog", label: "Catalogus", description: "800px JPG" },
] as const

export function BulkDownloadButton({ selectedIds }: BulkDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload(purpose: string) {
    if (selectedIds.length === 0) return

    setIsDownloading(true)
    const toastId = toast.loading(
      `ZIP wordt samengesteld (${selectedIds.length} foto's)...`
    )

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: selectedIds, purpose }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Download mislukt" }))
        throw new Error(data.error)
      }

      // Trigger browser download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "horti-export.zip"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()

      toast.success(`${selectedIds.length} foto's gedownload`, { id: toastId })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Download mislukt",
        { id: toastId }
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={isDownloading || selectedIds.length === 0}>
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download ({selectedIds.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Formaat kiezen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DOWNLOAD_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.purpose}
            onClick={() => handleDownload(option.purpose)}
          >
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
