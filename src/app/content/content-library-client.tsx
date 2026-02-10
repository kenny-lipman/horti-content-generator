"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback, useTransition } from "react"
import { Check, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { reviewImageAction } from "@/app/actions/images"
import { toLegacyImageType } from "@/lib/data/generation-utils"
import { IMAGE_TYPES } from "@/lib/constants"
import { BulkDownloadButton } from "@/components/content/bulk-download-button"
import type { ContentLibraryImage } from "@/lib/data/generation"

interface ContentLibraryClientProps {
  initialImages: ContentLibraryImage[]
  total: number
  currentPage: number
  activeFilters: {
    reviewStatus?: string
    imageType?: string
    productId?: string
  }
}

const REVIEW_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "In afwachting", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Goedgekeurd", color: "bg-green-100 text-green-800" },
  rejected: { label: "Afgekeurd", color: "bg-red-100 text-red-800" },
}

function getImageTypeName(dbType: string): string {
  const legacyType = toLegacyImageType(dbType)
  return IMAGE_TYPES.find((t) => t.id === legacyType)?.name ?? dbType
}

export function ContentLibraryClient({
  initialImages,
  total,
  currentPage,
  activeFilters,
}: ContentLibraryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(initialImages.map((img) => img.id)))
  }, [initialImages])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page") // reset pagination on filter change
    router.push(`/content?${params.toString()}`)
  }

  function handleReview(imageId: string, status: 'approved' | 'rejected') {
    startTransition(async () => {
      await reviewImageAction(imageId, status)
      router.refresh()
    })
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={activeFilters.reviewStatus ?? "all"}
          onValueChange={(v) => updateFilter("review", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Review status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="pending">In afwachting</SelectItem>
            <SelectItem value="approved">Goedgekeurd</SelectItem>
            <SelectItem value="rejected">Afgekeurd</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilters.imageType ?? "all"}
          onValueChange={(v) => updateFilter("type", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Afbeeldingstype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            <SelectItem value="white_background">Witte achtergrond</SelectItem>
            <SelectItem value="measuring_tape">Meetlatfoto</SelectItem>
            <SelectItem value="detail">Detailfoto</SelectItem>
            <SelectItem value="composite">Samengesteld</SelectItem>
            <SelectItem value="tray">Trayfoto</SelectItem>
            <SelectItem value="lifestyle">Lifestylefoto</SelectItem>
            <SelectItem value="seasonal">Seizoensfoto</SelectItem>
            <SelectItem value="danish_cart">Deense kar</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          {initialImages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={selectedIds.size === initialImages.length ? deselectAll : selectAll}
            >
              {selectedIds.size === initialImages.length ? "Deselecteer alles" : "Selecteer alles"}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {total} afbeelding{total !== 1 ? "en" : ""}
          </span>
        </div>
      </div>

      {/* Image grid */}
      {initialImages.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">Geen afbeeldingen gevonden</p>
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "Er zijn nog geen afbeeldingen gegenereerd"
              : "Pas de filters aan om meer resultaten te zien"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {initialImages.map((image) => {
            const reviewInfo = REVIEW_LABELS[image.review_status] ?? REVIEW_LABELS.pending

            return (
              <div
                key={image.id}
                className={cn(
                  "group overflow-hidden rounded-lg border transition-colors",
                  image.review_status === "approved" && "border-green-400",
                  image.review_status === "rejected" && "border-red-400",
                  selectedIds.has(image.id) && "ring-2 ring-primary"
                )}
              >
                {/* Image */}
                <div className="relative aspect-square bg-muted">
                  {/* Selection checkbox */}
                  <div className="absolute left-2 top-2 z-10">
                    <Checkbox
                      checked={selectedIds.has(image.id)}
                      onCheckedChange={() => toggleSelect(image.id)}
                      className="h-5 w-5 border-2 border-white bg-black/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                  {image.image_url ? (
                    <Image
                      src={image.image_url}
                      alt={getImageTypeName(image.image_type)}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Hover overlay with review buttons */}
                  <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant={image.review_status === "approved" ? "default" : "secondary"}
                      className="h-7 text-xs"
                      onClick={() => handleReview(image.id, "approved")}
                      disabled={isPending}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Goed
                    </Button>
                    <Button
                      size="sm"
                      variant={image.review_status === "rejected" ? "destructive" : "secondary"}
                      className="h-7 text-xs"
                      onClick={() => handleReview(image.id, "rejected")}
                      disabled={isPending}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Afkeur
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1 p-2">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {getImageTypeName(image.image_type)}
                    </Badge>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", reviewInfo.color)}>
                      {reviewInfo.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground" title={image.product_name}>
                    {image.product_name}
                    {image.product_sku && ` (${image.product_sku})`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-4 rounded-lg border bg-card px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} geselecteerd
          </span>
          <BulkDownloadButton selectedIds={Array.from(selectedIds)} />
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Deselecteer
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("page", String(currentPage - 1))
              router.push(`/content?${params.toString()}`)
            }}
          >
            Vorige
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage} van {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("page", String(currentPage + 1))
              router.push(`/content?${params.toString()}`)
            }}
          >
            Volgende
          </Button>
        </div>
      )}
    </div>
  )
}
