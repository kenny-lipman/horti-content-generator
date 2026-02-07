"use client"

import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GenerateButtonProps {
  selectedCount: number
  isGenerating: boolean
  disabled: boolean
  onGenerate: () => void
}

export function GenerateButton({
  selectedCount,
  isGenerating,
  disabled,
  onGenerate,
}: GenerateButtonProps) {
  return (
    <Button
      size="lg"
      className="w-full text-base"
      disabled={disabled || isGenerating}
      onClick={onGenerate}
    >
      {isGenerating ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          Bezig met genereren...
        </>
      ) : (
        <>
          <Sparkles className="size-5" />
          Genereer {selectedCount} foto{selectedCount !== 1 ? "'s" : ""}
        </>
      )}
    </Button>
  )
}
