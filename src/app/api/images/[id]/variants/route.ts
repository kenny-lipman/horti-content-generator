import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/data/auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateVariant, VARIANT_SPECS, getFileExtension } from '@/lib/image/processor'
import { createImageVariant, getVariant } from '@/lib/data/variants'
import type { ImagePurpose, ImageFormat } from '@/lib/supabase/types'

export const maxDuration = 60 // max 60 seconden voor image processing

// ============================================
// POST — Genereer variant(en) voor een beeld
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  const { id: imageId } = await params

  // Parse request body
  let body: { purposes: string[] }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Ongeldige JSON body', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  if (!body.purposes || !Array.isArray(body.purposes) || body.purposes.length === 0) {
    return Response.json(
      { error: 'Geef minimaal 1 purpose op', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // Valideer dat alle purposes geldig zijn
  const invalidPurposes = body.purposes.filter((p) => !(p in VARIANT_SPECS))
  if (invalidPurposes.length > 0) {
    return Response.json(
      {
        error: `Ongeldige purpose(s): ${invalidPurposes.join(', ')}`,
        code: 'INVALID_INPUT',
        validPurposes: Object.keys(VARIANT_SPECS),
      },
      { status: 400 }
    )
  }

  // Haal het gegenereerde beeld op (via RLS voor ownership check)
  const supabase = await createClient()
  const { data: generatedImage, error: fetchError } = await supabase
    .from('generated_images')
    .select('id, image_url, organization_id, status')
    .eq('id', imageId)
    .single()

  if (fetchError || !generatedImage) {
    return Response.json(
      { error: 'Beeld niet gevonden', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  // Verifieer dat het beeld bij de organisatie van de gebruiker hoort
  if (generatedImage.organization_id !== auth.orgId) {
    return Response.json(
      { error: 'Geen toegang tot dit beeld', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  if (!generatedImage.image_url) {
    return Response.json(
      { error: 'Beeld heeft geen URL (nog niet gegenereerd?)', code: 'NO_IMAGE' },
      { status: 400 }
    )
  }

  // Download de bronafbeelding
  let sourceBuffer: Buffer
  try {
    const response = await fetch(generatedImage.image_url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    sourceBuffer = Buffer.from(arrayBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[variants/POST] Fout bij downloaden bronafbeelding:', message)
    return Response.json(
      { error: 'Kon bronafbeelding niet downloaden', code: 'DOWNLOAD_FAILED' },
      { status: 500 }
    )
  }

  // Genereer elke gevraagde variant
  const adminClient = createAdminClient()
  const results: Array<{
    purpose: string
    success: boolean
    variant?: {
      id: string
      purpose: string
      format: string
      width: number
      height: number
      file_size: number | null
      image_url: string
    }
    error?: string
  }> = []

  for (const purpose of body.purposes) {
    const spec = VARIANT_SPECS[purpose]
    if (!spec) continue

    try {
      // Check of variant al bestaat
      const existing = await getVariant(imageId, purpose as ImagePurpose)
      if (existing) {
        results.push({
          purpose,
          success: true,
          variant: existing,
        })
        continue
      }

      // Genereer de variant met sharp
      const result = await generateVariant(sourceBuffer, spec)

      // Upload naar Supabase Storage
      const extension = getFileExtension(spec.format)
      const storagePath = `${auth.orgId}/${imageId}/${purpose}.${extension}`

      const { error: uploadError } = await adminClient.storage
        .from('image-variants')
        .upload(storagePath, result.buffer, {
          contentType: result.mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error(`[variants/POST] Upload fout voor ${purpose}:`, uploadError.message)
        results.push({
          purpose,
          success: false,
          error: `Upload mislukt: ${uploadError.message}`,
        })
        continue
      }

      // Haal de publieke URL op
      const { data: urlData } = adminClient.storage
        .from('image-variants')
        .getPublicUrl(storagePath)

      const imageUrl = urlData.publicUrl

      // Sla het variant record op in de database
      const variant = await createImageVariant({
        generated_image_id: imageId,
        purpose: purpose as ImagePurpose,
        format: spec.format as ImageFormat,
        width: result.width,
        height: result.height,
        file_size: result.fileSize,
        image_url: imageUrl,
      })

      if (!variant) {
        results.push({
          purpose,
          success: false,
          error: 'Database record aanmaken mislukt',
        })
        continue
      }

      results.push({
        purpose,
        success: true,
        variant,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      console.error(`[variants/POST] Fout bij verwerken ${purpose}:`, message)
      results.push({
        purpose,
        success: false,
        error: message,
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length

  return Response.json({
    message: `${successCount} variant(s) aangemaakt, ${failedCount} mislukt`,
    data: results,
    timestamp: new Date().toISOString(),
  })
}

// ============================================
// GET — Haal bestaande variant op voor een purpose
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  try {
    await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: 'Authenticatie mislukt', code: 'AUTH_ERROR' },
      { status: 401 }
    )
  }

  const { id: imageId } = await params
  const purpose = request.nextUrl.searchParams.get('purpose')

  if (!purpose) {
    return Response.json(
      { error: 'Query parameter "purpose" is verplicht', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const variant = await getVariant(imageId, purpose as ImagePurpose)

  if (!variant) {
    return Response.json(
      { error: `Geen variant gevonden voor purpose "${purpose}"`, code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  return Response.json({
    message: 'Variant gevonden',
    data: variant,
    timestamp: new Date().toISOString(),
  })
}
