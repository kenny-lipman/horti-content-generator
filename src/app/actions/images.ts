'use server'

import { revalidatePath } from 'next/cache'
import { updateReviewStatus } from '@/lib/data/generation'
import { getCurrentUser } from '@/lib/data/auth'

type ReviewResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Update de review status van een gegenereerde afbeelding.
 */
export async function reviewImageAction(
  imageId: string,
  reviewStatus: 'approved' | 'rejected' | 'pending'
): Promise<ReviewResult> {
  if (!imageId) {
    return { success: false, error: 'Image ID is verplicht' }
  }

  const user = await getCurrentUser()
  const success = await updateReviewStatus(imageId, reviewStatus, user?.id)

  if (!success) {
    return { success: false, error: 'Fout bij het bijwerken van de review status' }
  }

  revalidatePath('/content')
  return { success: true }
}

/**
 * Batch review: keur meerdere afbeeldingen tegelijk goed of af.
 */
export async function batchReviewAction(
  imageIds: string[],
  reviewStatus: 'approved' | 'rejected'
): Promise<ReviewResult> {
  if (!imageIds.length) {
    return { success: false, error: 'Geen afbeeldingen geselecteerd' }
  }

  const user = await getCurrentUser()
  let failed = 0

  for (const id of imageIds) {
    const success = await updateReviewStatus(id, reviewStatus, user?.id)
    if (!success) failed++
  }

  if (failed > 0) {
    return { success: false, error: `${failed} van ${imageIds.length} afbeeldingen konden niet bijgewerkt worden` }
  }

  revalidatePath('/content')
  return { success: true }
}
