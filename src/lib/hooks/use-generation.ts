"use client"

import { useState, useCallback, useRef } from "react"
import type { ImageType, GeneratedImage } from "@/lib/types"

interface GenerationState {
  isGenerating: boolean
  totalJobs: number
  completedJobs: number
  failedJobs: number
  currentJobs: Set<string>
  results: GeneratedImage[]
}

interface UseGenerationOptions {
  onComplete?: (results: GeneratedImage[]) => void
}

export function useGeneration(options?: UseGenerationOptions) {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    currentJobs: new Set(),
    results: [],
  })

  const abortRef = useRef<AbortController | null>(null)

  const startGeneration = useCallback(
    async (params: {
      productId: string
      sourceImageUrl: string
      imageTypes: ImageType[]
      aspectRatio: string
      resolution: string
    }) => {
      // Reset state
      setState({
        isGenerating: true,
        totalJobs: params.imageTypes.length,
        completedJobs: 0,
        failedJobs: 0,
        currentJobs: new Set(),
        results: [],
      })

      abortRef.current = new AbortController()

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: params.productId,
            sourceImageUrl: params.sourceImageUrl,
            imageTypes: params.imageTypes,
            settings: {
              aspectRatio: params.aspectRatio,
              resolution: params.resolution,
            },
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(error.error || `HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          let eventType = ""
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6))
              handleEvent(eventType, data)
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled
          return
        }
        setState((prev) => ({
          ...prev,
          isGenerating: false,
        }))
      }

      function handleEvent(eventType: string, data: Record<string, unknown>) {
        switch (eventType) {
          case "batch-start":
            setState((prev) => ({
              ...prev,
              totalJobs: data.totalJobs as number,
            }))
            break

          case "job-start":
            setState((prev) => {
              const currentJobs = new Set(prev.currentJobs)
              currentJobs.add(data.imageType as string)
              return { ...prev, currentJobs }
            })
            break

          case "job-complete": {
            const image: GeneratedImage = {
              id: data.jobId as string,
              productId: "",
              imageType: data.imageType as ImageType,
              imageUrl: data.imageUrl as string,
              status: "completed",
              reviewStatus: "pending",
              promptUsed: "",
            }
            setState((prev) => {
              const currentJobs = new Set(prev.currentJobs)
              currentJobs.delete(data.imageType as string)
              const results = [...prev.results, image]
              return {
                ...prev,
                currentJobs,
                completedJobs: prev.completedJobs + 1,
                results,
              }
            })
            break
          }

          case "job-error": {
            const failedImage: GeneratedImage = {
              id: data.jobId as string,
              productId: "",
              imageType: data.imageType as ImageType,
              imageUrl: "",
              status: "failed",
              reviewStatus: "pending",
              promptUsed: "",
              error: data.error as string,
            }
            setState((prev) => {
              const currentJobs = new Set(prev.currentJobs)
              currentJobs.delete(data.imageType as string)
              return {
                ...prev,
                currentJobs,
                failedJobs: prev.failedJobs + 1,
                results: [...prev.results, failedImage],
              }
            })
            break
          }

          case "batch-complete":
            setState((prev) => {
              const finalState = {
                ...prev,
                isGenerating: false,
              }
              options?.onComplete?.(finalState.results)
              return finalState
            })
            break
        }
      }
    },
    [options]
  )

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort()
    setState((prev) => ({ ...prev, isGenerating: false }))
  }, [])

  const updateResult = useCallback((imageId: string, newImageUrl: string) => {
    setState((prev) => ({
      ...prev,
      results: prev.results.map((r) =>
        r.id === imageId
          ? { ...r, imageUrl: newImageUrl, status: "completed" as const, error: undefined }
          : r
      ),
    }))
  }, [])

  const progress =
    state.totalJobs > 0
      ? Math.round(
          ((state.completedJobs + state.failedJobs) / state.totalJobs) * 100
        )
      : 0

  return {
    ...state,
    progress,
    startGeneration,
    cancelGeneration,
    updateResult,
  }
}
