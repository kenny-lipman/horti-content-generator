import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/data/auth"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { checkUsageLimit } from "@/lib/data/billing"
import { createGeneratedImage, trackGenerationUsage } from "@/lib/data/generation"
import { createNotification } from "@/lib/data/notifications"
import { generateImageMultiSource, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildCombinationPrompt } from "@/lib/gemini/prompts"
import { createAdminClient } from "@/lib/supabase/server"

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

  // Parse body
  let body: {
    productId: string
    accessoryId: string
    scenePrompt: string
    combinationId?: string
    aspectRatio?: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  const { productId, accessoryId, scenePrompt, combinationId, aspectRatio } = body

  if (!productId || !accessoryId || !scenePrompt) {
    return Response.json(
      { error: "productId, accessoryId en scenePrompt zijn verplicht", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  // Fetch both products
  const [dbProduct, dbAccessory] = await Promise.all([
    getProductById(productId),
    getProductById(accessoryId),
  ])

  if (!dbProduct) {
    return Response.json(
      { error: "Product niet gevonden", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
    )
  }

  if (!dbAccessory) {
    return Response.json(
      { error: "Accessoire niet gevonden", code: "ACCESSORY_NOT_FOUND" },
      { status: 404 }
    )
  }

  // Verify ownership
  if (dbProduct.organization_id !== auth.orgId || dbAccessory.organization_id !== auth.orgId) {
    return Response.json(
      { error: "Geen toegang tot deze producten", code: "FORBIDDEN" },
      { status: 403 }
    )
  }

  // Check usage limit
  const usageCheck = await checkUsageLimit(auth.orgId)
  if (!usageCheck.allowed) {
    return Response.json(
      {
        error: `Maandlimiet bereikt (${usageCheck.used}/${usageCheck.limit} foto's).`,
        code: "USAGE_LIMIT_REACHED",
      },
      { status: 429 }
    )
  }

  // Get source images
  const plantImageUrl = dbProduct.catalog_image_url
  const accessoryImageUrl = dbAccessory.catalog_image_url

  if (!plantImageUrl) {
    return Response.json(
      { error: "Plant heeft geen bronafbeelding", code: "NO_SOURCE_IMAGE" },
      { status: 400 }
    )
  }

  if (!accessoryImageUrl) {
    return Response.json(
      { error: "Accessoire heeft geen bronafbeelding", code: "NO_SOURCE_IMAGE" },
      { status: 400 }
    )
  }

  try {
    // Convert both images to base64
    const [plantImage, accessoryImage] = await Promise.all([
      imageUrlToBase64(plantImageUrl),
      imageUrlToBase64(accessoryImageUrl),
    ])

    // Build combination prompt
    const legacyProduct = toLegacyProduct(dbProduct)
    const accessoryInfo = {
      name: dbAccessory.name,
      type: dbAccessory.accessories?.accessory_type ?? undefined,
      material: dbAccessory.accessories?.material ?? undefined,
      color: dbAccessory.accessories?.color ?? undefined,
    }

    const prompt = buildCombinationPrompt(legacyProduct, accessoryInfo, scenePrompt)

    // Generate combination image
    const startTime = Date.now()
    const result = await generateImageMultiSource({
      prompt,
      sourceImages: [
        { base64: plantImage.base64, mimeType: plantImage.mimeType },
        { base64: accessoryImage.base64, mimeType: accessoryImage.mimeType },
      ],
      aspectRatio: aspectRatio ?? "1:1",
      temperature: 0.6,
    })

    const durationMs = Date.now() - startTime

    if (!result.success || !result.imageBase64) {
      // Track failed generation
      await trackGenerationUsage(auth.orgId, 0, 1)

      await createNotification({
        organizationId: auth.orgId,
        userId: auth.userId,
        type: "generation_failed",
        title: "Combinatiefoto mislukt",
        message: `Combinatie van ${dbProduct.name} + ${dbAccessory.name} kon niet worden gegenereerd: ${result.error}`,
      })

      return Response.json(
        { error: result.error ?? "Generatie mislukt", code: "GENERATION_FAILED" },
        { status: 500 }
      )
    }

    // Upload to storage
    const supabase = createAdminClient()
    const imageBuffer = Buffer.from(result.imageBase64, "base64")
    const ext = result.mimeType === "image/png" ? "png" : "jpg"
    const storagePath = `${auth.orgId}/${productId}/combination_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(storagePath, imageBuffer, {
        contentType: result.mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[combination] Storage upload error:", uploadError.message)
      return Response.json(
        { error: "Opslaan mislukt", code: "STORAGE_ERROR" },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(storagePath)

    const imageUrl = urlData.publicUrl

    // Create generated_images record
    const imageId = await createGeneratedImage({
      organizationId: auth.orgId,
      productId,
      imageType: "lifestyle", // Combination photos are lifestyle-type
      imageUrl,
      status: "completed",
      promptUsed: prompt,
      temperature: 0.6,
      generationDurationMs: durationMs,
    })

    // Track usage
    await trackGenerationUsage(auth.orgId, 1, 0)

    // Create notification
    await createNotification({
      organizationId: auth.orgId,
      userId: auth.userId,
      type: "generation_complete",
      title: "Combinatiefoto gegenereerd",
      message: `${dbProduct.name} + ${dbAccessory.name} — sfeerbeeld is klaar voor beoordeling`,
      data: { productId, imageId, combinationId },
    })

    return Response.json({
      success: true,
      imageId,
      imageUrl,
      durationMs,
    })
  } catch (err) {
    console.error("[combination] Error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Onbekende fout", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
