'use server'

import { revalidatePath } from 'next/cache'
import { createSceneTemplate, deleteSceneTemplate } from '@/lib/data/scenes'
import { getOrganizationIdOrDev } from '@/lib/data/auth'
import { createAdminClient } from '@/lib/supabase/server'
import type { SceneType } from '@/lib/supabase/types'

type ActionResult =
  | { success: true; sceneId: string }
  | { success: false; error: string }

const VALID_SCENE_TYPES: SceneType[] = ['interior', 'exterior', 'studio', 'commercial', 'seasonal', 'custom']

/**
 * Maak een custom scene template aan.
 */
export async function createSceneAction(formData: FormData): Promise<ActionResult> {
  try {
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

    if (!VALID_SCENE_TYPES.includes(sceneType as SceneType)) {
      return { success: false, error: 'Ongeldig scene type' }
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
  } catch (error) {
    console.error('Unexpected error in createSceneAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}

/**
 * Verwijder een custom scene template.
 * Verifieer dat de scene bij de organisatie van de gebruiker hoort.
 */
export async function deleteSceneAction(sceneId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!sceneId) {
      return { success: false, error: 'Scene ID is verplicht' }
    }

    const orgId = await getOrganizationIdOrDev()

    // Verify scene belongs to user's organization
    const supabase = createAdminClient()
    const { data: scene } = await supabase
      .from('scene_templates')
      .select('id')
      .eq('id', sceneId)
      .eq('organization_id', orgId)
      .single()

    if (!scene) {
      return { success: false, error: 'Scene niet gevonden' }
    }

    const success = await deleteSceneTemplate(sceneId)

    if (!success) {
      return { success: false, error: 'Fout bij het verwijderen van de scene' }
    }

    revalidatePath('/scenes')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteSceneAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}
