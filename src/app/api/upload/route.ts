import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/data/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_FILE_SIZE } from "@/lib/constants"

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
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return Response.json(
      { error: "Alleen JPG, PNG en WebP zijn toegestaan", code: "INVALID_TYPE" },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return Response.json(
      { error: "Bestand is te groot (maximaal 10MB)", code: "FILE_TOO_LARGE" },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    const ext = file.name.split(".").pop() || "jpg"
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const storagePath = `${auth.orgId}/uploads/${timestamp}-${safeName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("source-images")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError || !uploadData) {
      console.error("Upload error:", uploadError)
      return Response.json(
        { error: "Upload mislukt", code: "UPLOAD_FAILED" },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from("source-images")
      .getPublicUrl(uploadData.path)

    return Response.json({ url: publicUrl })
  } catch (err) {
    console.error("Upload error:", err)
    return Response.json(
      { error: "Upload mislukt", code: "UPLOAD_FAILED" },
      { status: 500 }
    )
  }
}
