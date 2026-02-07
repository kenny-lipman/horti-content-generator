import { NextRequest } from "next/server"
import { z } from "zod"
import { getProductById } from "@/lib/utils"
import { generateImage, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildPrompt, getPromptConfig, getSeed } from "@/lib/gemini/prompts"
import { uploadImage, generateFilename } from "@/lib/blob/storage"
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

  const product = getProductById(productId)
  if (!product) {
    return Response.json(
      { error: "Product niet gevonden", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
    )
  }

  try {
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

    if (!result.success || !result.imageBase64 || !result.mimeType) {
      return Response.json(
        { error: result.error || "Generatie mislukt", code: "GENERATION_FAILED" },
        { status: 500 }
      )
    }

    // Upload to Vercel Blob
    const ext = result.mimeType.includes("png") ? "png" : "webp"
    const filename = generateFilename(productId, imageType, ext)
    const imageUrl = await uploadImage(result.imageBase64, result.mimeType, filename)

    return Response.json({ imageUrl, imageType })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json(
      { error: message, code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
