import { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { generateRequestSchema } from "@/lib/schemas"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { reserveUsage } from "@/lib/data/billing"
import { requireAuth } from "@/lib/data/auth"
import { isAllowedImageUrl } from "@/lib/storage/images"
import { runPipeline } from "@/lib/generation/pipeline"
import { hasActiveGenerationJob } from "@/lib/data/generation"
import type { PipelineEvent } from "@/lib/generation/pipeline"

export const maxDuration = 300 // 5 minutes max for Vercel

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

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  const parsed = generateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request",
        code: "INVALID_INPUT",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { productId, sourceImageUrl, imageTypes, settings } = parsed.data

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

  // Validate source image URL is from our Supabase Storage
  if (!isAllowedImageUrl(sourceImageUrl)) {
    return Response.json(
      { error: "Ongeldige bronafbeelding URL", code: "INVALID_SOURCE_URL" },
      { status: 400 }
    )
  }

  // Convert to legacy format for prompt templates
  const product = toLegacyProduct(dbProduct)
  const organizationId = dbProduct.organization_id

  // Concurrency guard: max 1 batch generation per organization
  const isGenerating = await hasActiveGenerationJob(organizationId)
  if (isGenerating) {
    return Response.json(
      {
        error: "Er loopt al een generatie voor je organisatie. Wacht tot deze klaar is.",
        code: "GENERATION_IN_PROGRESS",
      },
      { status: 429 }
    )
  }

  // Atomic usage check + reservation (prevents race conditions)
  const usageCheck = await reserveUsage(organizationId, imageTypes.length)
  if (!usageCheck.allowed) {
    const remaining = usageCheck.limit !== null ? Math.max(usageCheck.limit - usageCheck.used, 0) : null
    return Response.json(
      {
        error: remaining === 0
          ? `Maandlimiet bereikt (${usageCheck.used}/${usageCheck.limit} foto's). Upgrade je plan om door te gaan.`
          : `Niet genoeg tegoed. Je hebt nog ${remaining} foto('s) over, maar vraagt er ${imageTypes.length} aan.`,
        code: "USAGE_LIMIT_REACHED",
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining,
        requested: imageTypes.length,
      },
      { status: 429 }
    )
  }

  // Create SSE stream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: PipelineEvent) {
        const data = JSON.stringify(event)
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
      }

      try {
        await runPipeline({
          product,
          sourceImageUrl,
          imageTypes,
          aspectRatio: settings.aspectRatio,
          imageSize: settings.resolution,
          organizationId,
          onEvent: sendEvent,
        })

        // Revalideer product- en contentpagina's zodat nieuwe images direct zichtbaar zijn
        revalidatePath(`/product/${productId}`)
        revalidatePath('/content')
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown pipeline error"
        sendEvent({
          type: "batch-complete",
          successCount: 0,
          failedCount: imageTypes.length,
        })
        console.error("Pipeline error:", errorMessage)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
