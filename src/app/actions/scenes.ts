'use server'

import { revalidatePath } from 'next/cache'
import { createSceneTemplate, deleteSceneTemplate } from '@/lib/data/scenes'
import { getOrganizationIdOrDev } from '@/lib/data/auth'
import type { SceneType } from '@/lib/supabase/types'

type ActionResult =
  | { success: true; sceneId: string }
  | { success: false; error: string }

/**
 * Maak een custom scene template aan.
 */
export async function createSceneAction(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || undefined
  const sceneType = (formData.get('scene_type') as string) || 'custom'
  const promptTemplate = (formData.get('prompt_template') as string)?.trim()

  if (!name) {
    return { success: false, error: 'Naam is verplicht' }
  }

  if (!promptTemplate) {
    return { success: false, error: 'Sfeer beschrijving is verplicht' }
  }

  const organizationId = await getOrganizationIdOrDev()

  const scene = await createSceneTemplate({
    organizationId,
    name,
    description,
    sceneType: sceneType as SceneType,
    promptTemplate,
  })

  if (!scene) {
    return { success: false, error: 'Fout bij het aanmaken van de scene' }
  }

  revalidatePath('/scenes')
  return { success: true, sceneId: scene.id }
}

/**
 * Verwijder een custom scene template.
 */
export async function deleteSceneAction(sceneId: string): Promise<{ success: boolean; error?: string }> {
  if (!sceneId) {
    return { success: false, error: 'Scene ID is verplicht' }
  }

  const success = await deleteSceneTemplate(sceneId)

  if (!success) {
    return { success: false, error: 'Fout bij het verwijderen van de scene' }
  }

  revalidatePath('/scenes')
  return { success: true }
}
