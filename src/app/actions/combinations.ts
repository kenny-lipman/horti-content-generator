'use server'

import { revalidatePath } from 'next/cache'
import { createCombination } from '@/lib/data/combinations'
import { getOrganizationIdOrDev } from '@/lib/data/auth'
import { combinationCreateSchema } from '@/lib/schemas'

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
  try {
    const parsed = combinationCreateSchema.safeParse(data)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return { success: false, error: firstError?.message ?? 'Validatiefout' }
    }

    const organizationId = await getOrganizationIdOrDev()

    const combinationId = await createCombination({
      organizationId,
      productId: parsed.data.productId,
      accessoryId: parsed.data.accessoryId,
      sceneTemplateId: parsed.data.sceneTemplateId,
      notes: parsed.data.notes,
    })

    if (!combinationId) {
      return { success: false, error: 'Fout bij het aanmaken van de combinatie' }
    }

    revalidatePath(`/product/${parsed.data.productId}`)
    return { success: true, combinationId }
  } catch (error) {
    console.error('Unexpected error in createCombinationAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}
