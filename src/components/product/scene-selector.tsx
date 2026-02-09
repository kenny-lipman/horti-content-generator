"use client"

import { Home, TreePine, Camera, ShoppingBag, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SceneTemplate } from "@/lib/supabase/types"

interface SceneSelectorProps {
  scenes: SceneTemplate[]
  selectedId: string | null
  onSelect: (sceneId: string | null) => void
}

const SCENE_ICONS: Record<string, typeof Home> = {
  interior: Home,
  exterior: TreePine,
  studio: Camera,
  commercial: ShoppingBag,
  seasonal: Sparkles,
  custom: Sparkles,
}

export function SceneSelector({ scenes, selectedId, onSelect }: SceneSelectorProps) {
  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6">
        <Sparkles className="mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Geen scenes beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {scenes.map((scene) => {
        const isSelected = selectedId === scene.id
        const Icon = SCENE_ICONS[scene.scene_type] ?? Sparkles

        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : scene.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md",
              isSelected ? "bg-primary/10" : "bg-muted"
            )}>
              {scene.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.thumbnail_url}
                  alt={scene.name}
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                <Icon className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
            <span className={cn(
              "text-[11px] font-medium leading-tight",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {scene.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
