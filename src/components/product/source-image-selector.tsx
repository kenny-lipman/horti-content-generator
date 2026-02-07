"use client"

import { useState, useCallback, useRef } from "react"
import { Leaf, Upload, CheckCircle2, Loader2, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

type Tab = "catalog" | "upload"

interface SourceImageSelectorProps {
  product: Product
  onImageSelected: (url: string | null) => void
  selectedImageUrl: string | null
}

const ACCEPTED_FORMATS = ".jpg,.jpeg,.png,.webp"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function SourceImageSelector({
  product,
  onImageSelected,
  selectedImageUrl,
}: SourceImageSelectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("catalog")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCatalogSelected = activeTab === "catalog" && selectedImageUrl === product.catalogImage
  const isUploadSelected = activeTab === "upload" && uploadedPreviewUrl && selectedImageUrl === uploadedPreviewUrl

  const handleSelectCatalog = useCallback(() => {
    setActiveTab("catalog")
    onImageSelected(product.catalogImage)
  }, [product.catalogImage, onImageSelected])

  const handleTabUpload = useCallback(() => {
    setActiveTab("upload")
    if (uploadedPreviewUrl) {
      onImageSelected(uploadedPreviewUrl)
    } else {
      onImageSelected(null)
    }
  }, [uploadedPreviewUrl, onImageSelected])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "Bestand is te groot. Maximaal 10MB toegestaan."
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return "Ongeldig bestandstype. Gebruik JPG, PNG of WebP."
    }
    return null
  }

  const uploadFile = useCallback(
    async (file: File) => {
      const error = validateFile(file)
      if (error) {
        setUploadError(error)
        return
      }

      setIsUploading(true)
      setUploadError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload mislukt. Probeer het opnieuw.")
        }

        const data = await response.json()
        const url = data.url as string
        setUploadedPreviewUrl(url)
        onImageSelected(url)
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload mislukt. Probeer het opnieuw."
        )
      } finally {
        setIsUploading(false)
      }
    },
    [onImageSelected]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleRemoveUpload = useCallback(() => {
    setUploadedPreviewUrl(null)
    setUploadError(null)
    onImageSelected(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [onImageSelected])

  return (
    <div className="space-y-4">
      {/* Tab-achtige toggles */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectCatalog}
          className={cn(
            "flex-1",
            activeTab === "catalog" &&
              "border-primary bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          <ImageIcon className="size-4" />
          Catalogusfoto
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTabUpload}
          className={cn(
            "flex-1",
            activeTab === "upload" &&
              "border-primary bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          <Upload className="size-4" />
          Upload nieuw
        </Button>
      </div>

      {/* Catalogusfoto tab */}
      {activeTab === "catalog" && (
        <div
          className={cn(
            "relative flex items-center gap-4 rounded-lg border p-4 transition-colors",
            isCatalogSelected
              ? "border-emerald-300 bg-emerald-50"
              : "border-border bg-muted/30"
          )}
        >
          {/* Placeholder image (zelfde als product-card) */}
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <Leaf className="size-8 text-emerald-300" strokeWidth={1.5} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Catalogusfoto geselecteerd</p>
            <p className="text-xs text-muted-foreground">
              Originele productfoto van {product.name}
            </p>
          </div>

          {isCatalogSelected && (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          )}
        </div>
      )}

      {/* Upload tab */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          {/* Upload preview */}
          {uploadedPreviewUrl ? (
            <div
              className={cn(
                "relative flex items-center gap-4 rounded-lg border p-4 transition-colors",
                isUploadSelected
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-border bg-muted/30"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedPreviewUrl}
                alt="Geupload beeld"
                className="size-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Eigen foto geupload</p>
                <p className="text-xs text-muted-foreground">
                  Klik op &quot;Verwijder&quot; om een andere foto te kiezen
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isUploadSelected && (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleRemoveUpload}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Drag & drop zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
                isUploading && "pointer-events-none opacity-60"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Bezig met uploaden...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Sleep een afbeelding hierheen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of klik om te bladeren
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG of WebP (max 10MB)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
