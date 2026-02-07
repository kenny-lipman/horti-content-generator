import { put, del } from "@vercel/blob"

/**
 * Upload a base64 image to Vercel Blob storage
 */
export async function uploadImage(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64")
  const blob = new Blob([buffer], { type: mimeType })

  const { url } = await put(filename, blob, {
    access: "public",
    contentType: mimeType,
  })

  return url
}

/**
 * Delete an image from Vercel Blob storage
 */
export async function deleteImage(url: string): Promise<void> {
  await del(url)
}

/**
 * Generate a unique filename for a generated image
 */
export function generateFilename(
  productId: string,
  imageType: string,
  extension: string = "png"
): string {
  const timestamp = Date.now()
  return `generated/${productId}/${imageType}-${timestamp}.${extension}`
}
