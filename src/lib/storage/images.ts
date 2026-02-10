import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

// Supabase Storage URL pattern whitelist
const SUPABASE_PROJECT_ID = 'jezipswnfifwxqsmpzwr'
const ALLOWED_HOSTS = [
  `${SUPABASE_PROJECT_ID}.supabase.co`,
  `${SUPABASE_PROJECT_ID}.supabase.in`,
]

/**
 * Valideer dat een image URL van onze eigen Supabase Storage komt.
 * Voorkomt SSRF aanvallen via sourceImageUrl.
 */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must be HTTPS
    if (parsed.protocol !== 'https:') return false
    // Must be from our Supabase project
    return ALLOWED_HOSTS.some((host) => parsed.hostname === host)
  } catch {
    return false
  }
}

/**
 * Upload a base64 image to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadImage(
  base64Data: string,
  mimeType: string,
  filename: string,
  bucket: string = 'generated-images'
): Promise<string> {
  const supabase = createAdminClient()
  const buffer = Buffer.from(base64Data, 'base64')

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error || !data) {
    throw new Error(`Storage upload failed: ${error?.message ?? 'Unknown error'}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Delete an image from Supabase Storage.
 */
export async function deleteImage(
  path: string,
  bucket: string = 'generated-images'
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error(`[deleteImage] Failed to delete ${path}:`, error.message)
  }
}

/**
 * Generate a unique storage path for a generated image.
 * Format: {orgId}/{productId}/{imageType}-{timestamp}.{ext}
 */
export function generateStoragePath(
  organizationId: string,
  productId: string,
  imageType: string,
  extension: string = 'png'
): string {
  const timestamp = Date.now()
  return `${organizationId}/${productId}/${imageType}-${timestamp}.${extension}`
}
