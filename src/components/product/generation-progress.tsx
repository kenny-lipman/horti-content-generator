"use client"

import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { IMAGE_TYPES } from "@/lib/constants"
import type { GeneratedImage } from "@/lib/types"

interface GenerationProgressProps {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  currentJobs: Set<string>
  progress: number
  results: GeneratedImage[]
}

export function GenerationProgress({
  totalJobs,
  completedJobs,
  failedJobs,
  currentJobs,
  progress,
  results,
}: GenerationProgressProps) {
  // Build a list of all image types that are part of this batch
  // We derive them from results + currentJobs + remaining pending
  const allImageTypes = new Set<string>()
  for (const r of results) {
    allImageTypes.add(r.imageType)
  }
  for (const j of currentJobs) {
    allImageTypes.add(j)
  }

  // Determine status per image type
  function getJobStatus(imageType: string): "pending" | "generating" | "completed" | "failed" {
    const result = results.find((r) => r.imageType === imageType)
    if (result) {
      return result.status === "failed" ? "failed" : "completed"
    }
    if (currentJobs.has(imageType)) {
      return "generating"
    }
    return "pending"
  }

  function getStatusIcon(status: "pending" | "generating" | "completed" | "failed") {
    switch (status) {
      case "pending":
        return <Clock className="size-4 text-muted-foreground" />
      case "generating":
        return <Loader2 className="size-4 animate-spin text-primary" />
      case "completed":
        return <CheckCircle2 className="size-4 text-green-600" />
      case "failed":
        return <XCircle className="size-4 text-red-600" />
    }
  }

  function getImageTypeName(imageType: string): string {
    return IMAGE_TYPES.find((t) => t.id === imageType)?.name ?? imageType
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Voortgang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedJobs + failedJobs} van {totalJobs} voltooid
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Per image type status list */}
        <ul className="space-y-2">
          {Array.from(allImageTypes).map((imageType) => {
            const status = getJobStatus(imageType)
            return (
              <li
                key={imageType}
                className="flex items-center gap-2 text-sm"
              >
                {getStatusIcon(status)}
                <span>{getImageTypeName(imageType)}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
