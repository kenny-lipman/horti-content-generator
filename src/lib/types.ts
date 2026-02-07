// All TypeScript types for the project

export interface Carrier {
  fustCode: number        // 800 | 212 | 206
  fustType: string        // "Aanvoer zonder fust" | "Tray" | "Doos"
  carriageType: string    // "DC"
  layers: number
  perLayer: number
  units: number
}

export interface Product {
  id: string
  name: string               // "ARTIFICIAL Ficus Benjamina - 180cm"
  sku: string                // "13630"
  vbnCode: string            // "111335"
  category: string           // "Artificial Plants" | "Tropical indoor" | "mediterranean outdoor"
  carrier: Carrier
  potDiameter: number        // cm
  plantHeight: number        // cm
  availability: string       // "Week 1 - 53"
  catalogImage: string       // URL/path
  isArtificial: boolean
  canBloom: boolean
}

export type ImageType =
  | "white-background"
  | "measuring-tape"
  | "detail"
  | "composite"
  | "tray"
  | "lifestyle"
  | "seasonal"
  | "danish-cart"

export type GenerationStatus =
  | { state: "idle" }
  | { state: "generating"; progress: number; currentJob: string }
  | { state: "completed"; results: GeneratedImage[] }
  | { state: "error"; error: string; partialResults: GeneratedImage[] }

export type ReviewStatus = "pending" | "approved" | "rejected"

export interface GeneratedImage {
  id: string
  productId: string
  imageType: ImageType
  imageUrl: string
  status: "pending" | "generating" | "completed" | "failed"
  reviewStatus: ReviewStatus
  promptUsed: string
  error?: string
}

export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16"
export type ImageSize = "1024" | "2048" | "4096"

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface GrowerSettings {
  logoUrl: string | null
  logoPosition: LogoPosition
  defaultAspectRatio: AspectRatio
  defaultResolution: ImageSize
}
