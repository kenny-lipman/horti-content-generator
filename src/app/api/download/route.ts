import { NextRequest } from "next/server"
import archiver from "archiver"
import { PassThrough } from "stream"
import { requireAuth } from "@/lib/data/auth"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 120

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
  let body: { imageIds: string[]; purpose?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  const { imageIds, purpose = "original" } = body

  if (!imageIds || imageIds.length === 0) {
    return Response.json(
      { error: "Geen afbeeldingen geselecteerd", code: "INVALID_INPUT" },
      { status: 400 }
    )
  }

  if (imageIds.length > 200) {
    return Response.json(
      { error: "Maximaal 200 afbeeldingen per download", code: "TOO_MANY" },
      { status: 400 }
    )
  }

  // Fetch image records (RLS filters by org)
  const supabase = await createClient()
  const { data: images, error } = await supabase
    .from("generated_images")
    .select("id, image_url, image_type, product_id, products!inner(name)")
    .in("id", imageIds)
    .eq("status", "completed")

  if (error || !images || images.length === 0) {
    return Response.json(
      { error: "Geen afbeeldingen gevonden", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  // Check for variant URLs if purpose !== 'original'
  let variantMap: Map<string, string> | null = null
  if (purpose !== "original") {
    const { data: variants } = await supabase
      .from("image_variants")
      .select("generated_image_id, image_url")
      .in("generated_image_id", imageIds)
      .eq("purpose", purpose)

    if (variants && variants.length > 0) {
      variantMap = new Map(
        variants.map((v) => [v.generated_image_id, v.image_url as string])
      )
    }
  }

  // Create ZIP stream
  const passThrough = new PassThrough()
  const archive = archiver("zip", { zlib: { level: 6 } })

  archive.on("error", (err) => {
    console.error("[download] Archive error:", err)
    passThrough.destroy(err)
  })

  archive.pipe(passThrough)

  // Add images to archive
  const usedNames = new Set<string>()

  for (const image of images) {
    const products = image.products as { name: string } | null
    const productName = (products?.name ?? "product")
      .replace(/[^a-zA-Z0-9-_\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
    const imageType = (image.image_type as string).replace(/_/g, "-")

    // Determine URL (variant if available, otherwise original)
    const imageUrl =
      (variantMap?.get(image.id) ?? image.image_url) as string | null
    if (!imageUrl) continue

    // Generate unique filename
    let filename = `${productName}/${imageType}`
    if (usedNames.has(filename)) {
      filename = `${productName}/${imageType}-${image.id.slice(0, 8)}`
    }
    usedNames.add(filename)

    // Determine extension from URL or purpose
    const ext = imageUrl.match(/\.(png|jpg|jpeg|webp)$/i)?.[1] ?? "jpg"
    filename = `${filename}.${ext}`

    try {
      const response = await fetch(imageUrl)
      if (!response.ok) continue

      const arrayBuffer = await response.arrayBuffer()
      archive.append(Buffer.from(arrayBuffer), { name: filename })
    } catch (err) {
      console.error(`[download] Failed to fetch image ${image.id}:`, err)
    }
  }

  await archive.finalize()

  // Convert Node stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      passThrough.on("end", () => {
        controller.close()
      })
      passThrough.on("error", (err) => {
        controller.error(err)
      })
    },
  })

  const timestamp = new Date().toISOString().slice(0, 10)
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="horti-export-${timestamp}.zip"`,
      "Cache-Control": "no-cache",
    },
  })
}
