export interface GeminiImagePart {
  inlineData: {
    mimeType: string
    data: string // base64
  }
}

export interface GeminiTextPart {
  text: string
}

export type GeminiPart = GeminiImagePart | GeminiTextPart

export interface GeminiSafetySetting {
  category: string
  threshold: string
}

export interface GeminiRequest {
  contents: [
    {
      parts: GeminiPart[]
    },
  ]
  generationConfig: {
    responseModalities: string[]
    temperature?: number
    seed?: number
    topK?: number
    topP?: number
    imageConfig?: {
      aspectRatio?: string
      imageSize?: string
      personGeneration?: "DONT_ALLOW" | "ALLOW_ADULT"
    }
  }
  safetySettings?: GeminiSafetySetting[]
  systemInstruction?: {
    parts: GeminiTextPart[]
  }
}

export interface GeminiCandidate {
  content: {
    parts: GeminiPart[]
  }
  finishReason?: string
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[]
  error?: {
    code: number
    message: string
    status: string
  }
}

export interface GenerateImageOptions {
  prompt: string
  sourceImageBase64: string
  sourceMimeType: string
  aspectRatio?: string
  imageSize?: string
  temperature?: number
  seed?: number
}

export interface GenerateImageResult {
  success: boolean
  imageBase64?: string
  mimeType?: string
  error?: string
}
