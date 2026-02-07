import { NextRequest } from "next/server"
import { generateRequestSchema } from "@/lib/schemas"
import { getProductById } from "@/lib/utils"
import { runPipeline } from "@/lib/generation/pipeline"
import type { PipelineEvent } from "@/lib/generation/pipeline"

export const maxDuration = 300 // 5 minutes max for Vercel

export async function POST(request: NextRequest) {
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

  // Look up product
  const product = getProductById(productId)
  if (!product) {
    return Response.json(
      { error: "Product niet gevonden", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
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
          onEvent: sendEvent,
        })
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
