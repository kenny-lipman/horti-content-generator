"use client"

import { Check, X, RotateCcw, ImageOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { IMAGE_TYPES } from "@/lib/constants"
import type { GeneratedImage, ReviewStatus } from "@/lib/types"

interface GeneratedImagesGridProps {
  images: GeneratedImage[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRegenerate: (id: string) => void
  getReviewStatus: (id: string) => ReviewStatus
  onImageClick: (image: GeneratedImage) => void
}

export function GeneratedImagesGrid({
  images,
  onApprove,
  onReject,
  onRegenerate,
  getReviewStatus,
  onImageClick,
}: GeneratedImagesGridProps) {
  const approvedCount = images.filter(
    (img) => getReviewStatus(img.id) === "approved"
  ).length

  function getImageTypeName(imageType: string): string {
    return IMAGE_TYPES.find((t) => t.id === imageType)?.name ?? imageType
  }

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{approvedCount}</span>{" "}
          van {images.length} goedgekeurd
        </p>
      </div>

      {/* Grid */}
      <div className="space-y-3">
        {images.map((image) => {
          const reviewStatus = getReviewStatus(image.id)

          return (
            <div
              key={image.id}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors",
                reviewStatus === "approved" && "border-green-500 border-2",
                reviewStatus === "rejected" && "border-red-500 border-2"
              )}
            >
              {/* Image + info row */}
              <div className="flex gap-3 p-3">
                {/* Thumbnail - clickable */}
                <button
                  type="button"
                  className="relative shrink-0 cursor-pointer overflow-hidden rounded-md focus:outline-none"
                  onClick={() => onImageClick(image)}
                >
                  {image.status === "completed" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.imageUrl}
                      alt={getImageTypeName(image.imageType)}
                      className="size-20 object-cover"
                    />
                  ) : (
                    <div className="flex size-20 flex-col items-center justify-center gap-1 bg-muted/50 text-muted-foreground">
                      <ImageOff className="size-5" />
                    </div>
                  )}
                </button>

                {/* Info + actions */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <Badge variant="secondary" className="w-fit text-xs">
                    {getImageTypeName(image.imageType)}
                  </Badge>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={reviewStatus === "approved" ? "default" : "outline"}
                      className={cn(
                        "h-8 text-xs",
                        reviewStatus === "approved"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                      )}
                      onClick={() => onApprove(image.id)}
                    >
                      <Check className="size-3.5" />
                      Goed
                    </Button>
                    <Button
                      size="sm"
                      variant={reviewStatus === "rejected" ? "default" : "outline"}
                      className={cn(
                        "h-8 text-xs",
                        reviewStatus === "rejected"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                      )}
                      onClick={() => onReject(image.id)}
                    >
                      <X className="size-3.5" />
                      Afkeur
                    </Button>
                    {reviewStatus === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => onRegenerate(image.id)}
                      >
                        <RotateCcw className="size-3.5" />
                        Opnieuw
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
