"use client"

import { useState, useCallback } from "react"
import type { ReviewStatus, GeneratedImage } from "@/lib/types"

export function useImageReview(images: GeneratedImage[]) {
  const [reviews, setReviews] = useState<Map<string, ReviewStatus>>(new Map())

  const setReviewStatus = useCallback((imageId: string, status: ReviewStatus) => {
    setReviews((prev) => {
      const next = new Map(prev)
      next.set(imageId, status)
      return next
    })
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
  }
}
