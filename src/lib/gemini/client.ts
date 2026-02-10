import type {
  GeminiPart,
  GeminiRequest,
  GeminiResponse,
  GenerateImageOptions,
  GenerateImageResult,
} from "./types"

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent"

const SYSTEM_INSTRUCTION = `You are a professional horticultural product photographer for the Dutch flower trade platform Floriday. All images must have consistent neutral-to-warm color temperature (5500K daylight equivalent), even professional studio lighting, and tack-sharp focus. Maintain photographic realism — no illustrations, no cartoonish elements, no watermarks. Every output must look like it was shot by the same photographer in the same studio session.`

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
]

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 5000, // 5 seconds
  maxDelay: 30000, // 30 seconds
  timeout: 180000, // 3 minutes standard
  timeout4K: 300000, // 5 minutes for 4K
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }
  return key
}

function getTimeout(imageSize?: string): number {
  return imageSize === "4096" ? RETRY_CONFIG.timeout4K : RETRY_CONFIG.timeout
}

function isRetryableError(status: number): boolean {
  return status === 429 || status === 500 || status === 503
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const { prompt, sourceImageBase64, sourceMimeType, aspectRatio, imageSize, temperature, seed } =
    options

  const requestBody: GeminiRequest = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: sourceMimeType,
              data: sourceImageBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseModalities: ["Text", "Image"],
      ...(temperature !== undefined && { temperature }),
      ...(seed !== undefined && { seed }),
      ...(aspectRatio || imageSize
        ? {
            imageConfig: {
              ...(aspectRatio && { aspectRatio }),
              ...(imageSize && { imageSize }),
            },
          }
        : {}),
    },
    safetySettings: SAFETY_SETTINGS,
  }

  const timeout = getTimeout(imageSize)
  const apiKey = getApiKey()
  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (
          isRetryableError(response.status) &&
          attempt < RETRY_CONFIG.maxRetries
        ) {
          const delay = getRetryDelay(attempt)
          console.warn(
            `Gemini API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
          )
          await sleep(delay)
          continue
        }

        const errorBody = await response.text().catch(() => "Unknown error")
        return {
          success: false,
          error: `Gemini API error ${response.status}: ${errorBody}`,
        }
      }

      const data: GeminiResponse = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Gemini API error: ${data.error.message}`,
        }
      }

      if (!data.candidates || data.candidates.length === 0) {
        return {
          success: false,
          error: "Gemini API returned no candidates",
        }
      }

      // Extract the generated image from the response
      const candidate = data.candidates[0]
      for (const part of candidate.content.parts) {
        if ("inlineData" in part && part.inlineData) {
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          }
        }
      }

      return {
        success: false,
        error: "Gemini API response did not contain an image",
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = getRetryDelay(attempt)
          console.warn(
            `Gemini API timed out, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
          )
          await sleep(delay)
          continue
        }
        return {
          success: false,
          error: `Gemini API timed out after ${timeout / 1000}s`,
        }
      }

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(attempt)
        console.warn(
          `Gemini API error: ${err}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
        )
        await sleep(delay)
        continue
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
  }
}

/**
 * Generate an image using multiple source images (for combinations).
 * Sends multiple inlineData parts to Gemini.
 */
export async function generateImageMultiSource(options: {
  prompt: string
  sourceImages: Array<{ base64: string; mimeType: string }>
  aspectRatio?: string
  temperature?: number
  seed?: number
}): Promise<GenerateImageResult> {
  const { prompt, sourceImages, aspectRatio, temperature, seed } = options

  const parts: GeminiPart[] = [
    ...sourceImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    })),
    { text: prompt },
  ]

  const requestBody: GeminiRequest = {
    contents: [{ parts }],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseModalities: ["Text", "Image"],
      ...(temperature !== undefined && { temperature }),
      ...(seed !== undefined && { seed }),
      ...(aspectRatio
        ? {
            imageConfig: {
              aspectRatio,
            },
          }
        : {}),
    },
    safetySettings: SAFETY_SETTINGS,
  }

  const timeout = RETRY_CONFIG.timeout
  const apiKey = getApiKey()
  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (isRetryableError(response.status) && attempt < RETRY_CONFIG.maxRetries) {
          const delay = getRetryDelay(attempt)
          console.warn(`Gemini API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`)
          await sleep(delay)
          continue
        }
        const errorBody = await response.text().catch(() => "Unknown error")
        return { success: false, error: `Gemini API error ${response.status}: ${errorBody}` }
      }

      const data: GeminiResponse = await response.json()

      if (data.error) {
        return { success: false, error: `Gemini API error: ${data.error.message}` }
      }

      if (!data.candidates || data.candidates.length === 0) {
        return { success: false, error: "Gemini API returned no candidates" }
      }

      const candidate = data.candidates[0]
      for (const part of candidate.content.parts) {
        if ("inlineData" in part && part.inlineData) {
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          }
        }
      }

      return { success: false, error: "Gemini API response did not contain an image" }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < RETRY_CONFIG.maxRetries) {
          await sleep(getRetryDelay(attempt))
          continue
        }
        return { success: false, error: `Gemini API timed out after ${timeout / 1000}s` }
      }
      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(getRetryDelay(attempt))
        continue
      }
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  return { success: false, error: "Max retries exceeded" }
}

/**
 * Convert an image URL to base64
 */
export async function imageUrlToBase64(url: string): Promise<{
  base64: string
  mimeType: string
}> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`)
    }

    // Check content-length header to prevent loading huge files
    const contentLength = response.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
      throw new Error("Source image too large (max 50MB)")
    }

    const arrayBuffer = await response.arrayBuffer()

    // Double-check actual size
    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      throw new Error("Source image too large (max 50MB)")
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = response.headers.get("content-type") || "image/png"
    return { base64, mimeType }
  } finally {
    clearTimeout(timeoutId)
  }
}
