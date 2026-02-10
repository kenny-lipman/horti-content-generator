"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Sparkles,
  Package,
  Loader2,
  Check,
  X,
  Heart,
  RotateCcw,
  Layers,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { SceneSelector } from "./scene-selector"
import { createCombinationAction, toggleFavoriteCombinationAction } from "@/app/actions/combinations"
import { reviewImageAction } from "@/app/actions/images"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"
import type { SceneTemplate, CombinationWithDetails } from "@/lib/supabase/types"

interface AccessoryOption {
  id: string
  name: string
  sku: string | null
  catalog_image_url: string | null
}

interface CombinationTabProps {
  product: Product
  accessories: AccessoryOption[]
  scenes: SceneTemplate[]
  combinations: CombinationWithDetails[]
}

interface BatchResult {
  accessoryId: string
  sceneId: string
  imageUrl?: string
  error?: string
}

const REVIEW_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

const REVIEW_LABELS: Record<string, string> = {
  pending: "In afwachting",
  approved: "Goedgekeurd",
  rejected: "Afgekeurd",
}

export function CombinationTab({
  product,
  accessories,
  scenes,
  combinations,
}: CombinationTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Single generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null)
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>("")
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [useCustom, setUseCustom] = useState(false)

  // Batch state
  const [batchMode, setBatchMode] = useState(false)
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([])
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([])
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])

  const selectedScene = scenes.find((s) => s.id === selectedSceneId)

  const canGenerate = selectedAccessoryId && (selectedSceneId || (useCustom && customPrompt.trim()))
  const batchCount = selectedAccessoryIds.length * selectedSceneIds.length
  const canBatchGenerate = batchCount > 0 && batchCount <= 12

  // Split combinations into favorites and rest
  const favoriteCombinations = combinations.filter((c) => c.is_favorite)
  const otherCombinations = combinations.filter((c) => !c.is_favorite)

  // ---- Single generation ----

  function handleGenerateCombination() {
    if (!canGenerate) return

    startTransition(async () => {
      const result = await createCombinationAction({
        productId: product.id,
        accessoryId: selectedAccessoryId,
        sceneTemplateId: selectedSceneId ?? undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      const scenePrompt = useCustom
        ? customPrompt.trim()
        : selectedScene?.prompt_template ?? ""

      setIsGenerating(true)
      setGeneratedImageUrl(null)
      setGeneratedImageId(null)

      try {
        const response = await fetch("/api/generate/combination", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            accessoryId: selectedAccessoryId,
            scenePrompt,
            combinationId: result.combinationId,
            aspectRatio: "1:1",
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          toast.error(data.error ?? "Generatie mislukt")
          return
        }

        setGeneratedImageUrl(data.imageUrl)
        setGeneratedImageId(data.imageId)
        toast.success(`Combinatiefoto gegenereerd (${Math.round(data.durationMs / 1000)}s)`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Onbekende fout")
      } finally {
        setIsGenerating(false)
      }
    })
  }

  // ---- Review ----

  function handleReview(imageId: string, status: "approved" | "rejected") {
    startTransition(async () => {
      await reviewImageAction(imageId, status)
      setGeneratedImageId(null)
      toast.success(status === "approved" ? "Goedgekeurd" : "Afgekeurd")
      router.refresh()
    })
  }

  // ---- Favorites ----

  function handleToggleFavorite(combinationId: string, currentFav: boolean) {
    startTransition(async () => {
      const result = await toggleFavoriteCombinationAction(combinationId, !currentFav)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(!currentFav ? "Toegevoegd aan favorieten" : "Verwijderd uit favorieten")
      router.refresh()
    })
  }

  // ---- Re-generate from favorite ----

  function handleRegenerate(combo: CombinationWithDetails) {
    setBatchMode(false)
    setSelectedAccessoryId(combo.accessory_id)
    setSelectedSceneId(combo.scene_template_id)
    setUseCustom(false)
    setGeneratedImageUrl(null)
    setGeneratedImageId(null)
    // Scroll to top of configuratie
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ---- Batch generation ----

  function toggleBatchAccessory(id: string) {
    setSelectedAccessoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleBatchGenerate() {
    if (!canBatchGenerate) return

    const pairs: Array<{ accessoryId: string; sceneId: string }> = []
    for (const accId of selectedAccessoryIds) {
      for (const scnId of selectedSceneIds) {
        pairs.push({ accessoryId: accId, sceneId: scnId })
      }
    }

    setIsBatchGenerating(true)
    setBatchProgress({ current: 0, total: pairs.length })
    setBatchResults([])

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]
      const scene = scenes.find((s) => s.id === pair.sceneId)

      setBatchProgress({ current: i + 1, total: pairs.length })

      // 1. Create combination record
      const comboResult = await createCombinationAction({
        productId: product.id,
        accessoryId: pair.accessoryId,
        sceneTemplateId: pair.sceneId,
      })

      if (!comboResult.success) {
        setBatchResults((prev) => [
          ...prev,
          { accessoryId: pair.accessoryId, sceneId: pair.sceneId, error: comboResult.error },
        ])
        continue
      }

      // 2. Generate image
      try {
        const response = await fetch("/api/generate/combination", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            accessoryId: pair.accessoryId,
            scenePrompt: scene?.prompt_template ?? "",
            combinationId: comboResult.combinationId,
            aspectRatio: "1:1",
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          setBatchResults((prev) => [
            ...prev,
            { accessoryId: pair.accessoryId, sceneId: pair.sceneId, error: data.error ?? "Mislukt" },
          ])
        } else {
          setBatchResults((prev) => [
            ...prev,
            { accessoryId: pair.accessoryId, sceneId: pair.sceneId, imageUrl: data.imageUrl },
          ])
        }
      } catch (err) {
        setBatchResults((prev) => [
          ...prev,
          {
            accessoryId: pair.accessoryId,
            sceneId: pair.sceneId,
            error: err instanceof Error ? err.message : "Fout",
          },
        ])
      }
    }

    setIsBatchGenerating(false)
    toast.success(`Batch voltooid: ${pairs.length} combinatie(s)`)
    router.refresh()
  }

  // ---- Combination card renderer ----

  function renderCombinationCard(combo: CombinationWithDetails) {
    const genImage = combo.generated_images?.[0]
    const reviewStatus = genImage?.review_status ?? "pending"
    const reviewColor = REVIEW_COLORS[reviewStatus] ?? REVIEW_COLORS.pending
    const reviewLabel = REVIEW_LABELS[reviewStatus] ?? "In afwachting"

    return (
      <div
        key={combo.id}
        className="group relative overflow-hidden rounded-lg border"
      >
        {/* Thumbnail */}
        <div className="relative aspect-square bg-muted">
          {genImage?.image_url ? (
            <Image
              src={genImage.image_url}
              alt={`${combo.products?.name ?? "Plant"} + ${combo.accessory_product?.name ?? "Accessoire"}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => handleToggleFavorite(combo.id, combo.is_favorite)}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 transition-colors hover:bg-black/50"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                combo.is_favorite
                  ? "fill-red-500 text-red-500"
                  : "text-white"
              )}
            />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-1.5 p-2">
          <p className="truncate text-xs font-medium">
            {combo.products?.name ?? "Plant"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            + {combo.accessory_product?.name ?? "Accessoire"}
          </p>
          <div className="flex items-center gap-1">
            {combo.scene_templates && (
              <Badge variant="secondary" className="text-[10px]">
                {combo.scene_templates.name}
              </Badge>
            )}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", reviewColor)}>
              {reviewLabel}
            </span>
          </div>

          {/* Re-generate button for favorites */}
          {combo.is_favorite && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-full text-[10px]"
              onClick={() => handleRegenerate(combo)}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Opnieuw maken
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuratie */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Combineer met accessoire</CardTitle>
              <CardDescription>
                Combineer {product.name} met een pot, vaas of ander accessoire in een sfeerbeeld
              </CardDescription>
            </div>
            <Button
              variant={batchMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBatchMode(!batchMode)
                setBatchResults([])
              }}
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {batchMode ? "Batch aan" : "Batch"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ===== SINGLE MODE ===== */}
          {!batchMode && (
            <>
              {/* Plant + Accessoire */}
              <div className="grid grid-cols-2 gap-4">
                {/* Plant (vast) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plant</label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                      {product.catalogImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.catalogImage}
                          alt={product.name}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.potDiameter}cm pot, {product.plantHeight}cm hoog
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accessoire dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accessoire</label>
                  {accessories.length > 0 ? (
                    <Select value={selectedAccessoryId} onValueChange={setSelectedAccessoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een accessoire..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accessories.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                            {acc.sku && ` (${acc.sku})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-md border border-dashed p-2.5 text-center text-xs text-muted-foreground">
                      Geen accessoires beschikbaar.
                      <br />
                      Voeg eerst een accessoire-product toe.
                    </div>
                  )}
                </div>
              </div>

              {/* Scene selectie */}
              {selectedAccessoryId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">In welke sfeer?</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setUseCustom(!useCustom)
                        if (!useCustom) setSelectedSceneId(null)
                        else setCustomPrompt("")
                      }}
                    >
                      {useCustom ? "Kies een scene" : "Beschrijf eigen sfeer"}
                    </Button>
                  </div>

                  {useCustom ? (
                    <div className="space-y-2">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Beschrijf de sfeer in het Engels, bijv: Place the plant in a bright conservatory with terracotta tiles and lush green surroundings..."
                      />
                      <p className="text-xs text-muted-foreground">
                        De AI gebruikt dit als instructie voor het sfeerbeeld
                      </p>
                    </div>
                  ) : (
                    <SceneSelector
                      scenes={scenes}
                      selectedId={selectedSceneId}
                      onSelect={setSelectedSceneId}
                    />
                  )}
                </div>
              )}

              {/* Generate button */}
              <Button
                className="w-full"
                disabled={!canGenerate || isPending || isGenerating}
                onClick={handleGenerateCombination}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sfeerbeeld genereren...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isPending ? "Bezig..." : "Sfeerbeeld maken"}
                  </>
                )}
              </Button>

              {/* Generation loading */}
              {isGenerating && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    AI genereert je combinatiefoto... Dit kan tot 2 minuten duren.
                  </p>
                </div>
              )}

              {/* Generation result with review buttons */}
              {generatedImageUrl && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Resultaat</p>
                  <div className="relative aspect-square overflow-hidden rounded-lg border">
                    <Image
                      src={generatedImageUrl}
                      alt={`${product.name} combinatie`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {generatedImageId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleReview(generatedImageId, "approved")}
                        disabled={isPending}
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Goedkeuren
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReview(generatedImageId, "rejected")}
                        disabled={isPending}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Afkeuren
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== BATCH MODE ===== */}
          {batchMode && (
            <>
              {/* Plant info (compact) */}
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  {product.catalogImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.catalogImage}
                      alt={product.name}
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="truncate text-sm font-medium">{product.name}</p>
              </div>

              {/* Accessoire checkbox grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Accessoires ({selectedAccessoryIds.length} geselecteerd)
                </label>
                {accessories.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {accessories.map((acc) => {
                      const checked = selectedAccessoryIds.includes(acc.id)
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => toggleBatchAccessory(acc.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                            checked
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Checkbox checked={checked} className="pointer-events-none" />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                            {acc.catalog_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={acc.catalog_image_url}
                                alt={acc.name}
                                className="h-full w-full rounded object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="truncate text-xs font-medium">{acc.name}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-2.5 text-center text-xs text-muted-foreground">
                    Geen accessoires beschikbaar.
                  </div>
                )}
              </div>

              {/* Scene multi-select */}
              {selectedAccessoryIds.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Scenes ({selectedSceneIds.length} geselecteerd)
                  </label>
                  <SceneSelector
                    scenes={scenes}
                    multiSelect
                    selectedIds={selectedSceneIds}
                    onSelectionChange={setSelectedSceneIds}
                  />
                </div>
              )}

              {/* Batch counter + generate button */}
              {batchCount > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {batchCount} combinatie{batchCount !== 1 ? "s" : ""} geselecteerd
                    {batchCount > 12 && (
                      <span className="ml-1 text-destructive">(max 12)</span>
                    )}
                  </p>
                  <Button
                    className="w-full"
                    disabled={!canBatchGenerate || isBatchGenerating || isPending}
                    onClick={handleBatchGenerate}
                  >
                    {isBatchGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {batchProgress.current}/{batchProgress.total} bezig...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {batchCount} sfeerbeeld{batchCount !== 1 ? "en" : ""} maken
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Batch progress + results */}
              {(isBatchGenerating || batchResults.length > 0) && (
                <div className="space-y-3">
                  {isBatchGenerating && (
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        Genereren: {batchProgress.current} van {batchProgress.total}
                      </p>
                    </div>
                  )}

                  {batchResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {batchResults.map((result, i) => {
                        const acc = accessories.find((a) => a.id === result.accessoryId)
                        const scn = scenes.find((s) => s.id === result.sceneId)
                        return (
                          <div
                            key={i}
                            className={cn(
                              "overflow-hidden rounded-lg border",
                              result.error && "border-destructive/50"
                            )}
                          >
                            <div className="relative aspect-square bg-muted">
                              {result.imageUrl ? (
                                <Image
                                  src={result.imageUrl}
                                  alt={`${acc?.name ?? "Accessoire"} + ${scn?.name ?? "Scene"}`}
                                  fill
                                  sizes="25vw"
                                  className="object-cover"
                                />
                              ) : result.error ? (
                                <div className="flex h-full w-full items-center justify-center">
                                  <X className="h-6 w-6 text-destructive" />
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="truncate p-1 text-[10px] text-muted-foreground">
                              {acc?.name ?? "?"} &middot; {scn?.name ?? "?"}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Favoriete combinaties */}
      {favoriteCombinations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              Favorieten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favoriteCombinations.map(renderCombinationCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eerdere combinaties */}
      {otherCombinations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {favoriteCombinations.length > 0 ? "Alle combinaties" : "Eerdere combinaties"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {otherCombinations.map(renderCombinationCard)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
