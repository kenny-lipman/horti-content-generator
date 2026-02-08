"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProductHeader } from "@/components/product/product-header"
import { StepIndicator } from "@/components/product/step-indicator"
import { SourceImageSelector } from "@/components/product/source-image-selector"
import { ImageTypeSelector } from "@/components/product/image-type-selector"
import { GenerationSettings } from "@/components/product/generation-settings"
import { GenerateButton } from "@/components/product/generate-button"
import { GenerationProgress } from "@/components/product/generation-progress"
import { GeneratedImagesGrid } from "@/components/product/generated-images-grid"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { FloridayCurrent } from "@/components/product/floriday-current"
import { FloridaySync } from "@/components/product/floriday-sync"
import { useGeneration } from "@/lib/hooks/use-generation"
import { useImageReview } from "@/lib/hooks/use-image-review"
import { useGrowerSettings } from "@/lib/hooks/use-grower-settings"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CombinationTab } from "@/components/product/combination-tab"
import type { Product, ImageType, AspectRatio, ImageSize, GeneratedImage } from "@/lib/types"
import type { SceneTemplate, CombinationWithDetails } from "@/lib/supabase/types"

interface AccessoryOption {
  id: string
  name: string
  sku: string | null
  catalog_image_url: string | null
}

interface ProductDetailClientProps {
  product: Product
  scenes?: SceneTemplate[]
  accessories?: AccessoryOption[]
  combinations?: CombinationWithDetails[]
}

export function ProductDetailClient({
  product,
  scenes = [],
  accessories = [],
  combinations = [],
}: ProductDetailClientProps) {
  // --- State ---
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<ImageType[]>([])
  const { settings } = useGrowerSettings()
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(settings.defaultAspectRatio)
  const [resolution, setResolution] = useState<ImageSize>(settings.defaultResolution)
  const [isSynced, setIsSynced] = useState(false)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Generation hook
  const generation = useGeneration({
    onComplete: (results) => {
      const success = results.filter((r) => r.status === "completed").length
      const failed = results.filter((r) => r.status === "failed").length
      if (failed === 0) {
        toast.success(`${success} foto's succesvol gegenereerd`)
      } else {
        toast.warning(`${success} foto's gegenereerd, ${failed} mislukt`)
      }
    },
  })

  // Review hook
  const review = useImageReview(generation.results)

  // --- Step calculation ---
  const currentStep = useMemo(() => {
    if (isSynced) return 5
    if (generation.results.length > 0 && !generation.isGenerating) {
      if (review.approvedCount > 0) return 5
      return 4
    }
    if (generation.isGenerating) return 3
    if (sourceImageUrl && selectedTypes.length > 0) return 2
    return 1
  }, [
    sourceImageUrl,
    selectedTypes.length,
    generation.isGenerating,
    generation.results.length,
    review.approvedCount,
    isSynced,
  ])

  const completedSteps = useMemo(() => {
    const steps: number[] = []
    if (sourceImageUrl) steps.push(1)
    if (selectedTypes.length > 0 && sourceImageUrl) steps.push(2)
    if (generation.results.length > 0 && !generation.isGenerating) steps.push(3)
    if (review.approvedCount > 0) steps.push(4)
    if (isSynced) steps.push(5)
    return steps
  }, [
    sourceImageUrl,
    selectedTypes.length,
    generation.results.length,
    generation.isGenerating,
    review.approvedCount,
    isSynced,
  ])

  // --- Handlers ---
  const handleGenerate = useCallback(() => {
    if (!sourceImageUrl || selectedTypes.length === 0) return

    generation.startGeneration({
      productId: product.id,
      sourceImageUrl,
      imageTypes: selectedTypes,
      aspectRatio,
      resolution,
    })
  }, [sourceImageUrl, selectedTypes, product.id, aspectRatio, resolution, generation])

  const handleRegenerate = useCallback(
    async (imageId: string) => {
      const image = generation.results.find((r) => r.id === imageId)
      if (!image || !sourceImageUrl) return

      review.resetReview(imageId)
      toast.loading("Opnieuw genereren...", { id: `regen-${imageId}` })

      try {
        const response = await fetch("/api/generate/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            sourceImageUrl,
            imageType: image.imageType,
            aspectRatio,
            resolution,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Onbekende fout" }))
          throw new Error(data.error)
        }

        const data = await response.json()
        generation.updateResult(imageId, data.imageUrl)
        toast.success(
          `${image.imageType} opnieuw gegenereerd`,
          { id: `regen-${imageId}` }
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Opnieuw genereren mislukt",
          { id: `regen-${imageId}` }
        )
      }
    },
    [generation.results, sourceImageUrl, product.id, aspectRatio, resolution, review]
  )

  const handleImageClick = useCallback(
    (image: GeneratedImage) => {
      const idx = generation.results.findIndex((r) => r.id === image.id)
      if (idx >= 0) {
        setLightboxIndex(idx)
        setLightboxOpen(true)
      }
    },
    [generation.results]
  )

  const completedImages = generation.results.filter(
    (r) => r.status === "completed"
  )

  // --- Step content titles ---
  const stepTitles: Record<number, { title: string; description: string }> = {
    1: {
      title: "Foto kiezen",
      description: "Selecteer een bronafbeelding voor het genereren",
    },
    2: {
      title: "Types selecteren",
      description: "Kies welke foto-types je wilt genereren",
    },
    3: {
      title: "Genereren",
      description: "Foto's worden gegenereerd door AI",
    },
    4: {
      title: "Goedkeuren",
      description: "Beoordeel de gegenereerde foto's",
    },
    5: {
      title: "Publiceren",
      description: "Publiceer goedgekeurde foto's naar Floriday",
    },
  }

  const stepInfo = stepTitles[currentStep] || stepTitles[1]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <ProductHeader product={product} />

      <Tabs defaultValue="photos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="photos">Foto&apos;s</TabsTrigger>
          <TabsTrigger value="combinations">Combinaties</TabsTrigger>
        </TabsList>

        {/* === Tab: Foto's === */}
        <TabsContent value="photos" className="space-y-6">
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Configuratie panel - links */}
            <div className="space-y-6 lg:col-span-3">
              {/* Step 1: Source image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    ① {stepTitles[1].title}
                  </CardTitle>
                  <CardDescription>{stepTitles[1].description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SourceImageSelector
                    product={product}
                    selectedImageUrl={sourceImageUrl}
                    onImageSelected={setSourceImageUrl}
                  />
                </CardContent>
              </Card>

              {/* Step 2: Type selection + settings (visible when source image selected) */}
              {sourceImageUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      ② {stepTitles[2].title}
                    </CardTitle>
                    <CardDescription>{stepTitles[2].description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ImageTypeSelector
                      product={product}
                      selectedTypes={selectedTypes}
                      onTypesChange={setSelectedTypes}
                    />

                    <div className="border-t pt-4">
                      <h3 className="mb-3 text-sm font-medium">Instellingen</h3>
                      <GenerationSettings
                        aspectRatio={aspectRatio}
                        resolution={resolution}
                        onAspectRatioChange={setAspectRatio}
                        onResolutionChange={setResolution}
                      />
                    </div>

                    <GenerateButton
                      selectedCount={selectedTypes.length}
                      isGenerating={generation.isGenerating}
                      disabled={!sourceImageUrl || selectedTypes.length === 0}
                      onGenerate={handleGenerate}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Generation progress */}
              {generation.isGenerating && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      ③ {stepTitles[3].title}
                    </CardTitle>
                    <CardDescription>{stepTitles[3].description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GenerationProgress
                      totalJobs={generation.totalJobs}
                      completedJobs={generation.completedJobs}
                      failedJobs={generation.failedJobs}
                      currentJobs={generation.currentJobs}
                      progress={generation.progress}
                      results={generation.results}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Resultaten panel - rechts */}
            <div className="space-y-6 lg:col-span-2">
              {/* Current Floriday photos (mock) */}
              <FloridayCurrent product={product} />

              {/* Generated images with review */}
              {completedImages.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Gegenereerde foto&apos;s
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Klik op een foto om groot te bekijken
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GeneratedImagesGrid
                      images={generation.results}
                      onApprove={review.approve}
                      onReject={review.reject}
                      onRegenerate={handleRegenerate}
                      getReviewStatus={review.getStatus}
                      onImageClick={handleImageClick}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resultaten</CardTitle>
                    <CardDescription className="text-xs">
                      Gegenereerde foto&apos;s verschijnen hier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                      {generation.isGenerating
                        ? "Bezig met genereren..."
                        : "Selecteer foto-types en klik op Genereer"}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Floriday sync (when approved images exist) */}
              {review.approvedCount > 0 && (
                <FloridaySync
                  approvedImages={review.approvedImages}
                  onSyncComplete={() => setIsSynced(true)}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* === Tab: Combinaties === */}
        <TabsContent value="combinations">
          <CombinationTab
            product={product}
            accessories={accessories}
            scenes={scenes}
            combinations={combinations}
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      <ImageLightbox
        images={generation.results}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onApprove={review.approve}
        onReject={review.reject}
        getReviewStatus={review.getStatus}
      />
    </div>
  )
}
