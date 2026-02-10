import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { generateImage, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildPrompt, getPromptConfig, getSeed } from "@/lib/gemini/prompts"
import { uploadImage, generateStoragePath, isAllowedImageUrl } from "@/lib/storage/images"
import { createGeneratedImage } from "@/lib/data/generation"
import { reserveUsage, releaseUsage } from "@/lib/data/billing"
import { requireAuth } from "@/lib/data/auth"
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
  // Auth check
  let auth: { userId: string; orgId: string }
  try {
    auth = await requireAuth()
  } catch (res) {
    if (res instanceof Response) return res
    return Response.json(
      { error: "Authenticatie mislukt", code: "AUTH_ERROR" },
      { status: 401 }
    )
  }

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

  // Verify product belongs to user's organization
  if (dbProduct.organization_id !== auth.orgId) {
    return Response.json(
      { error: "Geen toegang tot dit product", code: "FORBIDDEN" },
      { status: 403 }
    )
  }

  // Validate source image URL
  if (!isAllowedImageUrl(sourceImageUrl)) {
    return Response.json(
      { error: "Ongeldige bronafbeelding URL", code: "INVALID_SOURCE_URL" },
      { status: 400 }
    )
  }

  const product = toLegacyProduct(dbProduct)
  const organizationId = dbProduct.organization_id

  // Atomic usage check + reservation (1 image for regenerate)
  const usageCheck = await reserveUsage(organizationId, 1)
  if (!usageCheck.allowed) {
    return Response.json(
      {
        error: `Maandlimiet bereikt (${usageCheck.used}/${usageCheck.limit} foto's). Upgrade je plan om door te gaan.`,
        code: "USAGE_LIMIT_REACHED",
        used: usageCheck.used,
        limit: usageCheck.limit,
      },
      { status: 429 }
    )
  }

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
      // Release reserved usage for failed generation
      await releaseUsage(organizationId, 1)

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
    const generatedImageId = await createGeneratedImage({
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

    // Revalideer zodat nieuwe image direct zichtbaar is
    revalidatePath(`/product/${productId}`)
    revalidatePath('/content')

    return Response.json({ imageUrl, imageType, generatedImageId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json(
      { error: message, code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
