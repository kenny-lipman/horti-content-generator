import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  SceneTemplate,
  SceneTemplateInsert,
  SceneType,
} from '@/lib/supabase/types'

// ============================================
// Scene Templates
// ============================================

/**
 * Haal alle scene templates op: systeem + org-specifiek.
 */
export async function getSceneTemplates(): Promise<SceneTemplate[]> {
  const supabase = await createClient()

  // RLS filtert automatisch: systeem templates (is_system=true) + eigen org templates
  const { data, error } = await supabase
    .from('scene_templates')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getSceneTemplates] Error:', error.message)
    return []
  }

  return (data ?? []) as SceneTemplate[]
}

/**
 * Haal een enkele scene template op.
 */
export async function getSceneTemplateById(
  id: string
): Promise<SceneTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scene_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getSceneTemplateById] Error:', error.message)
    return null
  }

  return data as SceneTemplate
}

/**
 * Maak een custom scene template aan voor een organisatie.
 */
export async function createSceneTemplate(data: {
  organizationId: string
  name: string
  description?: string
  sceneType: SceneType
  promptTemplate: string
}): Promise<SceneTemplate | null> {
  const supabase = await createClient()

  const insert: SceneTemplateInsert = {
    organization_id: data.organizationId,
    name: data.name,
    description: data.description ?? null,
    scene_type: data.sceneType,
    prompt_template: data.promptTemplate,
    is_system: false,
  }

  const { data: scene, error } = await supabase
    .from('scene_templates')
    .insert(insert)
    .select()
    .single()

  if (error || !scene) {
    console.error('[createSceneTemplate] Error:', error?.message)
    return null
  }

  return scene as SceneTemplate
}

/**
 * Verwijder een custom scene template (alleen eigen org).
 */
export async function deleteSceneTemplate(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('scene_templates')
    .delete()
    .eq('id', id)
    .eq('is_system', false) // Voorkom verwijderen van systeem templates

  if (error) {
    console.error('[deleteSceneTemplate] Error:', error.message)
    return false
  }

  return true
}
