"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  "Foto kiezen",
  "Types selecteren",
  "Genereren",
  "Goedkeuren",
  "Publiceren",
] as const

interface StepIndicatorProps {
  currentStep: number
  completedSteps: number[]
}

export function StepIndicator({
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Voortgang" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = completedSteps.includes(stepNumber)
          const isFuture = !isActive && !isCompleted

          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted &&
                      "bg-primary/15 text-primary border border-primary/30",
                    isFuture &&
                      "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium md:block",
                    isActive && "text-foreground",
                    isCompleted && "text-primary",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>

              {stepNumber < STEPS.length && (
                <div
                  className={cn(
                    "hidden h-px flex-1 md:block",
                    isCompleted ? "bg-primary/30" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
