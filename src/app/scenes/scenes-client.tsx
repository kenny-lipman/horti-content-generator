"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Home, TreePine, Camera, ShoppingBag, Sparkles } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createSceneAction, deleteSceneAction } from "@/app/actions/scenes"
import { toast } from "sonner"
import type { SceneTemplate } from "@/lib/supabase/types"

interface ScenesClientProps {
  systemScenes: SceneTemplate[]
  customScenes: SceneTemplate[]
}

const SCENE_TYPE_LABELS: Record<string, { label: string; icon: typeof Home }> = {
  interior: { label: "Interieur", icon: Home },
  exterior: { label: "Exterieur", icon: TreePine },
  studio: { label: "Studio", icon: Camera },
  commercial: { label: "Commercieel", icon: ShoppingBag },
  seasonal: { label: "Seizoen", icon: Sparkles },
  custom: { label: "Custom", icon: Sparkles },
}

function SceneCard({
  scene,
  onDeleteRequest,
  confirmDeleteId,
  onDeleteConfirm,
  onCancelDelete,
  isPending,
}: {
  scene: SceneTemplate
  onDeleteRequest?: (id: string) => void
  confirmDeleteId?: string | null
  onDeleteConfirm?: (id: string) => void
  onCancelDelete?: () => void
  isPending?: boolean
}) {
  const typeInfo = SCENE_TYPE_LABELS[scene.scene_type] ?? SCENE_TYPE_LABELS.custom
  const Icon = typeInfo.icon
  const isConfirming = confirmDeleteId === scene.id

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/50">
      {/* Thumbnail placeholder */}
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/50">
        {scene.thumbnail_url ? (
          <Image
            src={scene.thumbnail_url}
            alt={scene.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
        ) : (
          <Icon className="h-10 w-10 text-muted-foreground/30" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium leading-tight">{scene.name}</h3>
          {onDeleteRequest && !isConfirming && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => onDeleteRequest(scene.id)}
              title="Verwijderen"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
        {isConfirming && onDeleteConfirm && onCancelDelete && (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={isPending}
              onClick={() => onDeleteConfirm(scene.id)}
            >
              Verwijder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={onCancelDelete}
            >
              Annuleer
            </Button>
          </div>
        )}
        <Badge variant="secondary" className="text-[10px]">
          {typeInfo.label}
        </Badge>
        {scene.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {scene.description}
          </p>
        )}
      </div>
    </div>
  )
}

export function ScenesClient({ systemScenes, customScenes }: ScenesClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createSceneAction(formData)
      if (result.success) {
        toast.success("Scene aangemaakt")
        setDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDeleteRequest(sceneId: string) {
    setConfirmDeleteId(sceneId)
  }

  function handleDeleteConfirm(sceneId: string) {
    startTransition(async () => {
      const result = await deleteSceneAction(sceneId)
      if (result.success) {
        toast.success("Scene verwijderd")
        setConfirmDeleteId(null)
        router.refresh()
      } else {
        toast.error(result.error ?? "Verwijderen mislukt")
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Standaard scenes */}
      <section>
        <h2 className="mb-4 text-lg font-medium">Standaard scenes</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {systemScenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      </section>

      {/* Custom scenes */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Jouw scenes</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Nieuwe scene
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe scene aanmaken</DialogTitle>
                <DialogDescription>
                  Beschrijf de sfeer die je wilt gebruiken voor je productfoto&apos;s
                </DialogDescription>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Naam
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Bijv. Eigen showroom"
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="scene_type" className="text-sm font-medium">
                    Type
                  </label>
                  <Select name="scene_type" defaultValue="custom">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interior">Interieur</SelectItem>
                      <SelectItem value="exterior">Exterieur</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="commercial">Commercieel</SelectItem>
                      <SelectItem value="seasonal">Seizoen</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Beschrijving (optioneel)
                  </label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Korte beschrijving van de sfeer"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="prompt_template" className="text-sm font-medium">
                    Sfeer beschrijving (voor AI)
                  </label>
                  <textarea
                    id="prompt_template"
                    name="prompt_template"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Beschrijf de sfeer in het Engels, bijv: Place the plant in a bright modern showroom with white shelves and natural light..."
                    required
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Beschrijf in het Engels hoe de foto eruit moet zien. De AI gebruikt dit als instructie.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isPending}
                  >
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Aanmaken..." : "Scene aanmaken"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {customScenes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {customScenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onDeleteRequest={handleDeleteRequest}
                confirmDeleteId={confirmDeleteId}
                onDeleteConfirm={handleDeleteConfirm}
                onCancelDelete={() => setConfirmDeleteId(null)}
                isPending={isPending}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-[150px] flex-col items-center justify-center text-center">
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">Nog geen eigen scenes</p>
              <p className="text-xs text-muted-foreground">
                Maak een eigen sfeer aan voor je productfoto&apos;s
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
