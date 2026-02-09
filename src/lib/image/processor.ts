import sharp from 'sharp'

export interface VariantSpec {
  purpose: string
  width: number
  height: number | null  // null = auto (maintain aspect ratio)
  format: 'webp' | 'jpg' | 'png'
  quality: number
  fit: 'cover' | 'contain' | 'inside'  // sharp fit mode
  autoGenerate: boolean
}

export const VARIANT_SPECS: Record<string, VariantSpec> = {
  web: { purpose: 'web', width: 1024, height: null, format: 'webp', quality: 85, fit: 'inside', autoGenerate: true },
  thumbnail: { purpose: 'thumbnail', width: 256, height: null, format: 'webp', quality: 80, fit: 'inside', autoGenerate: true },
  print: { purpose: 'print', width: 4096, height: null, format: 'png', quality: 100, fit: 'inside', autoGenerate: false },
  social_instagram_square: { purpose: 'social_instagram_square', width: 1080, height: 1080, format: 'jpg', quality: 90, fit: 'cover', autoGenerate: false },
  social_instagram_portrait: { purpose: 'social_instagram_portrait', width: 1080, height: 1350, format: 'jpg', quality: 90, fit: 'cover', autoGenerate: false },
  social_facebook: { purpose: 'social_facebook', width: 1200, height: 630, format: 'jpg', quality: 90, fit: 'cover', autoGenerate: false },
  social_pinterest: { purpose: 'social_pinterest', width: 1000, height: 1500, format: 'jpg', quality: 90, fit: 'cover', autoGenerate: false },
  catalog: { purpose: 'catalog', width: 800, height: null, format: 'jpg', quality: 90, fit: 'inside', autoGenerate: false },
}

export interface VariantResult {
  buffer: Buffer
  mimeType: string
  fileSize: number
  width: number
  height: number
}

/**
 * Genereer een image variant op basis van een VariantSpec.
 * - Als height null is: behoud aspect ratio (resize op breedte)
 * - Als height gezet is met fit 'cover': crop naar exacte afmetingen
 */
export async function generateVariant(
  sourceImageBuffer: Buffer,
  spec: VariantSpec
): Promise<VariantResult> {
  let pipeline = sharp(sourceImageBuffer)

  // Resize met de juiste strategie
  if (spec.height === null) {
    // Behoud aspect ratio, resize op breedte
    pipeline = pipeline.resize({
      width: spec.width,
      fit: spec.fit,
      withoutEnlargement: true,
    })
  } else {
    // Exacte afmetingen (bijv. social media formats)
    pipeline = pipeline.resize({
      width: spec.width,
      height: spec.height,
      fit: spec.fit,
      position: 'centre',
      withoutEnlargement: false, // social formats moeten exact zijn
    })
  }

  // Converteer naar het juiste formaat
  switch (spec.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: spec.quality })
      break
    case 'jpg':
      pipeline = pipeline.jpeg({ quality: spec.quality, mozjpeg: true })
      break
    case 'png':
      pipeline = pipeline.png({
        quality: spec.quality,
        compressionLevel: spec.quality === 100 ? 6 : 9,
      })
      break
  }

  const outputBuffer = await pipeline.toBuffer()
  const metadata = await sharp(outputBuffer).metadata()

  return {
    buffer: outputBuffer,
    mimeType: getMimeType(spec.format),
    fileSize: outputBuffer.byteLength,
    width: metadata.width ?? spec.width,
    height: metadata.height ?? (spec.height ?? spec.width),
  }
}

/**
 * Helper om het MIME type te bepalen op basis van format
 */
function getMimeType(format: string): string {
  switch (format) {
    case 'webp':
      return 'image/webp'
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    default:
      return 'image/png'
  }
}

/**
 * Haal de file extensie op voor een format
 */
export function getFileExtension(format: string): string {
  switch (format) {
    case 'jpg':
      return 'jpg'
    case 'webp':
      return 'webp'
    case 'png':
      return 'png'
    default:
      return 'png'
  }
}

/**
 * Haal alle specs op die automatisch gegenereerd moeten worden
 */
export function getAutoGenerateSpecs(): VariantSpec[] {
  return Object.values(VARIANT_SPECS).filter((spec) => spec.autoGenerate)
}
