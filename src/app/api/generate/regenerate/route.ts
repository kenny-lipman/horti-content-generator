import { NextRequest } from "next/server"
import { z } from "zod"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { generateImage, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildPrompt, getPromptConfig, getSeed } from "@/lib/gemini/prompts"
import { uploadImage, generateStoragePath } from "@/lib/storage/images"
import { createGeneratedImage } from "@/lib/data/generation"
import type { ImageType } from "@/lib/types"

const regenerateSchema = z.object({
  productId: z.string().min(1),
  sourceImageUrl: z.string().url(),
  imageType: z.enum([
    "white-background",
    "measuring-tape",
    "detail",
    "composite",
    "tray",
    "lifestyle",
    "seasonal",
    "danish-cart",
  ]),
  aspectRatio: z.string().optional(),
  resolution: z.string().optional(),
})

export const maxDuration = 300

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  const parsed = regenerateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", code: "INVALID_INPUT", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { productId, sourceImageUrl, imageType, aspectRatio, resolution } = parsed.data

  // Look up product from Supabase
  const dbProduct = await getProductById(productId)
  if (!dbProduct) {
    return Response.json(
      { error: "Product niet gevonden", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
    )
  }

  const product = toLegacyProduct(dbProduct)
  const organizationId = dbProduct.organization_id

  try {
    const startTime = Date.now()

    // Fetch source image
    const { base64, mimeType: sourceMimeType } =
      await imageUrlToBase64(sourceImageUrl)

    // Build prompt and config
    const prompt = buildPrompt(imageType as ImageType, product)
    const promptConfig = getPromptConfig(imageType as ImageType)
    const seed = getSeed(productId, imageType as ImageType)

    // Generate image
    const result = await generateImage({
      prompt,
      sourceImageBase64: base64,
      sourceMimeType,
      aspectRatio,
      imageSize: resolution,
      temperature: promptConfig.temperature,
      seed,
    })

    const durationMs = Date.now() - startTime

    if (!result.success || !result.imageBase64 || !result.mimeType) {
      // Record failed generation
      await createGeneratedImage({
        organizationId,
        productId,
        imageType,
        imageUrl: '',
        status: 'failed',
        promptUsed: prompt,
        seed,
        temperature: promptConfig.temperature,
        generationDurationMs: durationMs,
        error: result.error || "Generatie mislukt",
      })

      return Response.json(
        { error: result.error || "Generatie mislukt", code: "GENERATION_FAILED" },
        { status: 500 }
      )
    }

    // Upload to Supabase Storage
    const ext = result.mimeType.includes("png") ? "png" : "webp"
    const storagePath = generateStoragePath(organizationId, productId, imageType, ext)
    const imageUrl = await uploadImage(result.imageBase64, result.mimeType, storagePath)

    // Record in database
    await createGeneratedImage({
      organizationId,
      productId,
      imageType,
      imageUrl,
      status: 'completed',
      promptUsed: prompt,
      seed,
      temperature: promptConfig.temperature,
      generationDurationMs: durationMs,
    })

    return Response.json({ imageUrl, imageType })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json(
      { error: message, code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
