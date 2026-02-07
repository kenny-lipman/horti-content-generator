import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: "Ongeldig formulier", code: "INVALID_FORM" },
      { status: 400 }
    )
  }

  const file = formData.get("file") as File | null

  if (!file) {
    return Response.json(
      { error: "Geen bestand gevonden", code: "NO_FILE" },
      { status: 400 }
    )
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: "Alleen JPG, PNG en WebP zijn toegestaan", code: "INVALID_TYPE" },
      { status: 400 }
    )
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return Response.json(
      { error: "Bestand is te groot (maximaal 10MB)", code: "FILE_TOO_LARGE" },
      { status: 400 }
    )
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN

    // If Vercel Blob token is configured, use it
    if (blobToken && blobToken.length > 10) {
      const { put } = await import("@vercel/blob")
      const filename = `uploads/${Date.now()}-${file.name}`
      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
      })
      return Response.json({ url: blob.url })
    }

    // Fallback: save locally to public/uploads/
    const uploadsDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const ext = file.name.split(".").pop() || "jpg"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    return Response.json({ url: `/uploads/${filename}` })
  } catch (err) {
    console.error("Upload error:", err)
    return Response.json(
      { error: "Upload mislukt", code: "UPLOAD_FAILED" },
      { status: 500 }
    )
  }
}
