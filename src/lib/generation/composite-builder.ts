/**
 * Composite photo builder using Canvas API
 * Combines: white background photo + detail inset (circle, bottom-left) + logo (top-right)
 */

export interface CompositeOptions {
  /** Base image URL (white background photo) */
  baseImageUrl: string
  /** Detail/close-up image URL for the circular inset */
  detailImageUrl: string
  /** Optional logo URL (base64 data URL from settings) */
  logoUrl?: string | null
  /** Logo position */
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  /** Output width */
  width?: number
  /** Output height */
  height?: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Build a composite image on a canvas element
 * Returns a data URL of the composited image
 */
export async function buildComposite(
  options: CompositeOptions
): Promise<string> {
  const {
    baseImageUrl,
    detailImageUrl,
    logoUrl,
    logoPosition = "top-right",
    width = 1024,
    height = 1024,
  } = options

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context not available")

  // Load all images in parallel
  const [baseImg, detailImg] = await Promise.all([
    loadImage(baseImageUrl),
    loadImage(detailImageUrl),
  ])

  // --- Draw base image (white background photo) ---
  ctx.drawImage(baseImg, 0, 0, width, height)

  // --- Draw circular detail inset (bottom-left, ~25% of image width) ---
  const insetSize = Math.round(width * 0.25)
  const insetRadius = insetSize / 2
  const insetMargin = Math.round(width * 0.04)
  const insetX = insetMargin + insetRadius
  const insetY = height - insetMargin - insetRadius

  // White border ring
  ctx.save()
  ctx.beginPath()
  ctx.arc(insetX, insetY, insetRadius + 3, 0, Math.PI * 2)
  ctx.fillStyle = "#ffffff"
  ctx.fill()
  ctx.restore()

  // Clip to circle and draw detail image
  ctx.save()
  ctx.beginPath()
  ctx.arc(insetX, insetY, insetRadius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(
    detailImg,
    insetX - insetRadius,
    insetY - insetRadius,
    insetSize,
    insetSize
  )
  ctx.restore()

  // --- Draw logo if provided ---
  if (logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl)
      const maxLogoWidth = Math.round(width * 0.15)
      const maxLogoHeight = Math.round(height * 0.08)
      const logoScale = Math.min(
        maxLogoWidth / logoImg.width,
        maxLogoHeight / logoImg.height,
        1
      )
      const logoW = Math.round(logoImg.width * logoScale)
      const logoH = Math.round(logoImg.height * logoScale)
      const logoMargin = Math.round(width * 0.03)

      let logoX: number
      let logoY: number

      switch (logoPosition) {
        case "top-left":
          logoX = logoMargin
          logoY = logoMargin
          break
        case "top-right":
          logoX = width - logoW - logoMargin
          logoY = logoMargin
          break
        case "bottom-left":
          logoX = logoMargin
          logoY = height - logoH - logoMargin
          break
        case "bottom-right":
          logoX = width - logoW - logoMargin
          logoY = height - logoH - logoMargin
          break
      }

      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)
    } catch {
      // Logo failed to load — skip it
      console.warn("Logo could not be loaded, skipping overlay")
    }
  }

  return canvas.toDataURL("image/png")
}

/**
 * Apply logo overlay to a single image
 */
export async function applyLogoOverlay(
  imageUrl: string,
  logoUrl: string,
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" = "top-right",
  width = 1024,
  height = 1024
): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context not available")

  const [baseImg, logoImg] = await Promise.all([
    loadImage(imageUrl),
    loadImage(logoUrl),
  ])

  // Draw base image
  ctx.drawImage(baseImg, 0, 0, width, height)

  // Scale and position logo
  const maxLogoWidth = Math.round(width * 0.15)
  const maxLogoHeight = Math.round(height * 0.08)
  const logoScale = Math.min(
    maxLogoWidth / logoImg.width,
    maxLogoHeight / logoImg.height,
    1
  )
  const logoW = Math.round(logoImg.width * logoScale)
  const logoH = Math.round(logoImg.height * logoScale)
  const margin = Math.round(width * 0.03)

  let x: number
  let y: number

  switch (position) {
    case "top-left":
      x = margin
      y = margin
      break
    case "top-right":
      x = width - logoW - margin
      y = margin
      break
    case "bottom-left":
      x = margin
      y = height - logoH - margin
      break
    case "bottom-right":
      x = width - logoW - margin
      y = height - logoH - margin
      break
  }

  ctx.drawImage(logoImg, x, y, logoW, logoH)

  return canvas.toDataURL("image/png")
}
