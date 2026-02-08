"use client"

import { useState, useCallback, useTransition } from "react"
import type { ReviewStatus, GeneratedImage } from "@/lib/types"
import { reviewImageAction } from "@/app/actions/images"

export function useImageReview(images: GeneratedImage[]) {
  const [reviews, setReviews] = useState<Map<string, ReviewStatus>>(new Map())
  const [isPending, startTransition] = useTransition()

  const setReviewStatus = useCallback((imageId: string, status: ReviewStatus) => {
    // Optimistic update
    setReviews((prev) => {
      const next = new Map(prev)
      next.set(imageId, status)
      return next
    })

    // Persist to database if the image has a database-generated ID (UUID format)
    const isDbId = imageId.length === 36 || !imageId.startsWith('job-')
    if (isDbId) {
      startTransition(async () => {
        const result = await reviewImageAction(imageId, status)
        if (!result.success) {
          // Rollback on failure
          setReviews((prev) => {
            const next = new Map(prev)
            next.delete(imageId)
            return next
          })
        }
      })
    }
  }, [])

  const approve = useCallback(
    (imageId: string) => setReviewStatus(imageId, "approved"),
    [setReviewStatus]
  )

  const reject = useCallback(
    (imageId: string) => setReviewStatus(imageId, "rejected"),
    [setReviewStatus]
  )

  const resetReview = useCallback(
    (imageId: string) => setReviewStatus(imageId, "pending"),
    [setReviewStatus]
  )

  const getStatus = useCallback(
    (imageId: string): ReviewStatus => reviews.get(imageId) || "pending",
    [reviews]
  )

  const approvedCount = images.filter(
    (img) => reviews.get(img.id) === "approved"
  ).length

  const rejectedCount = images.filter(
    (img) => reviews.get(img.id) === "rejected"
  ).length

  const approvedImages = images.filter(
    (img) => reviews.get(img.id) === "approved"
  )

  return {
    reviews,
    approve,
    reject,
    resetReview,
    getStatus,
    approvedCount,
    rejectedCount,
    approvedImages,
    isPending,
  }
}
