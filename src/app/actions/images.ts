'use server'

import { revalidatePath } from 'next/cache'
import { updateReviewStatus } from '@/lib/data/generation'
import { getCurrentUser, getOrganizationIdOrDev } from '@/lib/data/auth'
import { createAdminClient } from '@/lib/supabase/server'

type ReviewResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Update de review status van een gegenereerde afbeelding.
 * Verifieer dat de afbeelding bij de organisatie van de gebruiker hoort.
 */
export async function reviewImageAction(
  imageId: string,
  reviewStatus: 'approved' | 'rejected' | 'pending'
): Promise<ReviewResult> {
  if (!imageId) {
    return { success: false, error: 'Image ID is verplicht' }
  }

  const user = await getCurrentUser()
  const orgId = await getOrganizationIdOrDev()

  // Verify image belongs to user's organization
  const supabase = createAdminClient()
  const { data: image } = await supabase
    .from('generated_images')
    .select('id')
    .eq('id', imageId)
    .eq('organization_id', orgId)
    .single()

  if (!image) {
    return { success: false, error: 'Afbeelding niet gevonden' }
  }

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

  if (imageIds.length > 100) {
    return { success: false, error: 'Maximaal 100 afbeeldingen tegelijk' }
  }

  const user = await getCurrentUser()
  const orgId = await getOrganizationIdOrDev()

  // Verify all images belong to user's organization
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('generated_images')
    .select('id', { count: 'exact', head: true })
    .in('id', imageIds)
    .eq('organization_id', orgId)

  if (count !== imageIds.length) {
    return { success: false, error: 'Niet alle afbeeldingen behoren tot je organisatie' }
  }

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
