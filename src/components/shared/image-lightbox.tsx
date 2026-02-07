"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Check, X, ImageOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IMAGE_TYPES } from "@/lib/constants"
import type { GeneratedImage, ReviewStatus } from "@/lib/types"

interface ImageLightboxProps {
  images: GeneratedImage[]
  currentIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  getReviewStatus: (id: string) => ReviewStatus
}

export function ImageLightbox({
  images,
  currentIndex: initialIndex,
  open,
  onOpenChange,
  onApprove,
  onReject,
  getReviewStatus,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  // Sync index when the dialog opens with a new image
  useEffect(() => {
    if (open) {
      setIndex(initialIndex)
    }
  }, [initialIndex, open])

  const currentImage = images[index]

  const goToPrevious = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const goToNext = useCallback(() => {
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, goToPrevious, goToNext])

  if (!currentImage) return null

  const reviewStatus = getReviewStatus(currentImage.id)

  function getImageTypeName(imageType: string): string {
    return IMAGE_TYPES.find((t) => t.id === imageType)?.name ?? imageType
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{getImageTypeName(currentImage.imageType)}</DialogTitle>
          <DialogDescription>
            Bekijk en beoordeel de gegenereerde foto
          </DialogDescription>
        </DialogHeader>

        {/* Image display with navigation */}
        <div className="relative flex items-center justify-center">
          {/* Previous button */}
          {images.length > 1 && (
            <Button
              size="icon"
              variant="outline"
              className="absolute left-2 z-10"
              onClick={goToPrevious}
            >
              <ChevronLeft className="size-5" />
              <span className="sr-only">Vorige</span>
            </Button>
          )}

          {/* Image */}
          {currentImage.status === "completed" ? (
            <img
              src={currentImage.imageUrl}
              alt={getImageTypeName(currentImage.imageType)}
              className="max-h-[60vh] w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted/50 text-muted-foreground">
              <ImageOff className="size-12" />
              {currentImage.error && (
                <p className="text-sm">{currentImage.error}</p>
              )}
            </div>
          )}

          {/* Next button */}
          {images.length > 1 && (
            <Button
              size="icon"
              variant="outline"
              className="absolute right-2 z-10"
              onClick={goToNext}
            >
              <ChevronRight className="size-5" />
              <span className="sr-only">Volgende</span>
            </Button>
          )}
        </div>

        {/* Counter */}
        <p className="text-center text-sm text-muted-foreground">
          {index + 1} van {images.length}
        </p>

        {/* Review actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            variant={reviewStatus === "approved" ? "default" : "outline"}
            className={cn(
              reviewStatus === "approved"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
            )}
            onClick={() => onApprove(currentImage.id)}
          >
            <Check className="size-5" />
            Goedkeuren
          </Button>
          <Button
            size="lg"
            variant={reviewStatus === "rejected" ? "default" : "outline"}
            className={cn(
              reviewStatus === "rejected"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            )}
            onClick={() => onReject(currentImage.id)}
          >
            <X className="size-5" />
            Afkeuren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
