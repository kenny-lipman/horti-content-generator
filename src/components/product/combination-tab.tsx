"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { SceneSelector } from "./scene-selector"
import { createCombinationAction } from "@/app/actions/combinations"
import { toast } from "sonner"
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
  onGenerateCombination?: (params: {
    accessoryName: string
    scenePrompt: string
    combinationId: string
  }) => void
}

export function CombinationTab({
  product,
  accessories,
  scenes,
  combinations,
  onGenerateCombination,
}: CombinationTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>("")
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [useCustom, setUseCustom] = useState(false)

  const selectedAccessory = accessories.find((a) => a.id === selectedAccessoryId)
  const selectedScene = scenes.find((s) => s.id === selectedSceneId)

  const canGenerate = selectedAccessoryId && (selectedSceneId || (useCustom && customPrompt.trim()))

  function handleGenerateCombination() {
    if (!canGenerate) return

    startTransition(async () => {
      // 1. Sla combinatie op
      const result = await createCombinationAction({
        productId: product.id,
        accessoryId: selectedAccessoryId,
        sceneTemplateId: selectedSceneId ?? undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      // 2. Start generatie
      const scenePrompt = useCustom
        ? customPrompt.trim()
        : selectedScene?.prompt_template ?? ''

      const accessoryName = selectedAccessory?.name ?? 'accessoire'

      if (onGenerateCombination) {
        onGenerateCombination({
          accessoryName,
          scenePrompt,
          combinationId: result.combinationId,
        })
        toast.success("Combinatie aangemaakt — sfeerbeeld genereren...")
      } else {
        toast.success("Combinatie opgeslagen. Generatie van combinatiefoto's is binnenkort beschikbaar.")
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Configuratie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combineer met accessoire</CardTitle>
          <CardDescription>
            Combineer {product.name} met een pot, vaas of ander accessoire in een sfeerbeeld
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
            disabled={!canGenerate || isPending}
            onClick={handleGenerateCombination}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isPending ? "Bezig..." : "Sfeerbeeld maken"}
          </Button>
        </CardContent>
      </Card>

      {/* Eerdere combinaties */}
      {combinations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Eerdere combinaties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {combinations.map((combo) => (
                <div
                  key={combo.id}
                  className="rounded-lg border p-2.5 text-xs"
                >
                  <p className="font-medium truncate">
                    {combo.products?.name ?? "Plant"}
                  </p>
                  <p className="text-muted-foreground truncate">
                    + {combo.accessory_product?.name ?? "Accessoire"}
                  </p>
                  {combo.scene_templates && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {combo.scene_templates.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
