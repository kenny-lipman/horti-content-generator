'use server'

import { revalidatePath } from 'next/cache'
import { createCombination } from '@/lib/data/combinations'
import { getOrganizationIdOrDev } from '@/lib/data/auth'

type ActionResult =
  | { success: true; combinationId: string }
  | { success: false; error: string }

/**
 * Maak een nieuwe product combinatie aan.
 */
export async function createCombinationAction(data: {
  productId: string
  accessoryId: string
  sceneTemplateId?: string
  notes?: string
}): Promise<ActionResult> {
  if (!data.productId) {
    return { success: false, error: 'Product ID is verplicht' }
  }

  if (!data.accessoryId) {
    return { success: false, error: 'Selecteer een accessoire' }
  }

  const organizationId = await getOrganizationIdOrDev()

  const combinationId = await createCombination({
    organizationId,
    productId: data.productId,
    accessoryId: data.accessoryId,
    sceneTemplateId: data.sceneTemplateId,
    notes: data.notes,
  })

  if (!combinationId) {
    return { success: false, error: 'Fout bij het aanmaken van de combinatie' }
  }

  revalidatePath(`/product/${data.productId}`)
  return { success: true, combinationId }
}
