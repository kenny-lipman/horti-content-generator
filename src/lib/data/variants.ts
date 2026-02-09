import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ImageVariant, ImageFormat, ImagePurpose } from '@/lib/supabase/types'

// ============================================
// Types
// ============================================

export interface CreateImageVariantData {
  generated_image_id: string
  purpose: ImagePurpose
  format: ImageFormat
  width: number
  height: number
  file_size: number | null
  image_url: string
}

// ============================================
// Create
// ============================================

/**
 * Maak een image variant record aan.
 * Gebruikt createAdminClient() omdat dit een systeem-operatie is na generatie.
 */
export async function createImageVariant(
  data: CreateImageVariantData
): Promise<ImageVariant | null> {
  const supabase = createAdminClient()

  const { data: variant, error } = await supabase
    .from('image_variants')
    .insert({
      generated_image_id: data.generated_image_id,
      purpose: data.purpose,
      format: data.format,
      width: data.width,
      height: data.height,
      file_size: data.file_size,
      image_url: data.image_url,
    })
    .select()
    .single()

  if (error) {
    console.error('[createImageVariant] Fout bij aanmaken variant:', error.message)
    return null
  }

  return variant
}

// ============================================
// Read
// ============================================

/**
 * Haal alle variants op voor een gegenereerd beeld.
 * Gebruikt createClient() (RLS-protected).
 */
export async function getVariantsForImage(
  generatedImageId: string
): Promise<ImageVariant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('image_variants')
    .select('*')
    .eq('generated_image_id', generatedImageId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getVariantsForImage] Fout bij ophalen variants:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Haal een specifieke variant op voor een gegenereerd beeld en purpose.
 * Gebruikt createClient() (RLS-protected).
 */
export async function getVariant(
  generatedImageId: string,
  purpose: ImagePurpose
): Promise<ImageVariant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('image_variants')
    .select('*')
    .eq('generated_image_id', generatedImageId)
    .eq('purpose', purpose)
    .maybeSingle()

  if (error) {
    console.error('[getVariant] Fout bij ophalen variant:', error.message)
    return null
  }

  return data
}
