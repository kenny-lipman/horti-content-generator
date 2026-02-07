"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { IMAGE_TYPES } from "@/lib/constants"
import type { GeneratedImage } from "@/lib/types"

interface FloridaySyncProps {
  approvedImages: GeneratedImage[]
  onSyncComplete: () => void
}

export function FloridaySync({
  approvedImages,
  onSyncComplete,
}: FloridaySyncProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(approvedImages.map((img) => img.id))
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSynced, setIsSynced] = useState(false)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === approvedImages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(approvedImages.map((img) => img.id)))
    }
  }, [selectedIds.size, approvedImages])

  async function handleSync() {
    setIsSyncing(true)

    // Simulate sync (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    setIsSyncing(false)
    setIsSynced(true)
    toast.success(
      `${selectedIds.size} foto's succesvol gepubliceerd naar Floriday!`
    )
    onSyncComplete()
  }

  if (approvedImages.length === 0) {
    return null
  }

  const getTypeName = (img: GeneratedImage) =>
    IMAGE_TYPES.find((t) => t.id === img.imageType)?.name ?? img.imageType

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Publiceren naar Floriday</CardTitle>
        <CardDescription className="text-xs">
          Selecteer welke foto&apos;s je wilt publiceren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Select all toggle */}
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Checkbox
            checked={
              selectedIds.size === approvedImages.length && approvedImages.length > 0
            }
          />
          <span>
            {selectedIds.size === approvedImages.length
              ? "Alles deselecteren"
              : "Alles selecteren"}
          </span>
        </button>

        {/* Image list */}
        <div className="space-y-2">
          {approvedImages.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => toggleSelection(img.id)}
              className="flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors hover:bg-accent/50"
            >
              <Checkbox checked={selectedIds.has(img.id)} />
              <div className="size-10 shrink-0 overflow-hidden rounded border bg-muted">
                {img.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.imageUrl}
                    alt={getTypeName(img)}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted">
                    <Upload className="size-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium">{getTypeName(img)}</span>
              {isSynced && selectedIds.has(img.id) && (
                <CheckCircle2 className="ml-auto size-4 text-green-600" />
              )}
            </button>
          ))}
        </div>

        {/* Counter + Sync button */}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground">
            {selectedIds.size} foto&apos;s geselecteerd
          </p>

          {isSynced ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="size-5" />
              <span>
                {selectedIds.size} foto&apos;s gepubliceerd naar Floriday
              </span>
            </div>
          ) : (
            <Button
              onClick={handleSync}
              disabled={selectedIds.size === 0 || isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Synchroniseren...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Sync naar Floriday
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
