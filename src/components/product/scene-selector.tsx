"use client"

import { Home, TreePine, Camera, ShoppingBag, Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SceneTemplate } from "@/lib/supabase/types"

interface SceneSelectorSingleProps {
  scenes: SceneTemplate[]
  selectedId: string | null
  onSelect: (sceneId: string | null) => void
  multiSelect?: false
}

interface SceneSelectorMultiProps {
  scenes: SceneTemplate[]
  multiSelect: true
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

type SceneSelectorProps = SceneSelectorSingleProps | SceneSelectorMultiProps

const SCENE_ICONS: Record<string, typeof Home> = {
  interior: Home,
  exterior: TreePine,
  studio: Camera,
  commercial: ShoppingBag,
  seasonal: Sparkles,
  custom: Sparkles,
}

export function SceneSelector(props: SceneSelectorProps) {
  const { scenes } = props

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6">
        <Sparkles className="mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Geen scenes beschikbaar</p>
      </div>
    )
  }

  function isSelected(sceneId: string): boolean {
    if (props.multiSelect) {
      return props.selectedIds.includes(sceneId)
    }
    return props.selectedId === sceneId
  }

  function handleClick(sceneId: string) {
    if (props.multiSelect) {
      const current = props.selectedIds
      const next = current.includes(sceneId)
        ? current.filter((id) => id !== sceneId)
        : [...current, sceneId]
      props.onSelectionChange(next)
    } else {
      props.onSelect(props.selectedId === sceneId ? null : sceneId)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {scenes.map((scene) => {
        const selected = isSelected(scene.id)
        const Icon = SCENE_ICONS[scene.scene_type] ?? Sparkles

        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => handleClick(scene.id)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            {props.multiSelect && selected && (
              <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md",
              selected ? "bg-primary/10" : "bg-muted"
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
                  selected ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
            <span className={cn(
              "text-[11px] font-medium leading-tight",
              selected ? "text-primary" : "text-muted-foreground"
            )}>
              {scene.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
