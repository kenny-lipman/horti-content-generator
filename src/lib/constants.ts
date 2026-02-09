import type { ImageType, AspectRatio, ImageSize } from "./types"

export interface ImageTypeConfig {
  id: ImageType
  name: string              // Dutch display name
  description: string       // Dutch description
  defaultEnabled: boolean   // Default toggle state
}

export const IMAGE_TYPES: ImageTypeConfig[] = [
  {
    id: "white-background",
    name: "Witte achtergrond",
    description: "Product op pure witte achtergrond",
    defaultEnabled: true,
  },
  {
    id: "measuring-tape",
    name: "Meetlatfoto",
    description: "Product met meetschaal op ware hoogte",
    defaultEnabled: true,
  },
  {
    id: "detail",
    name: "Detailfoto",
    description: "Close-up van blad en textuur",
    defaultEnabled: true,
  },
  {
    id: "composite",
    name: "Composiet",
    description: "Productfoto met detail-inset en logo",
    defaultEnabled: false,
  },
  {
    id: "tray",
    name: "Tray",
    description: "Planten in kwekerij-tray opstelling",
    defaultEnabled: true,
  },
  {
    id: "lifestyle",
    name: "Sfeerbeeld",
    description: "Plant in een modern interieur",
    defaultEnabled: true,
  },
  {
    id: "seasonal",
    name: "Seizoensfoto",
    description: "Plant in volle bloei",
    defaultEnabled: true,
  },
  {
    id: "danish-cart",
    name: "Deense Kar",
    description: "Planten op Deense Container (DC)",
    defaultEnabled: true,
  },
]

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 (Vierkant)" },
  { value: "4:3", label: "4:3 (Liggend)" },
  { value: "3:4", label: "3:4 (Staand)" },
  { value: "16:9", label: "16:9 (Breedbeeld)" },
  { value: "9:16", label: "9:16 (Portret)" },
]

export const IMAGE_SIZES: { value: ImageSize; label: string; warning?: string }[] = [
  { value: "1024", label: "1K (1024px)" },
  { value: "2048", label: "2K (2048px)" },
  { value: "4096", label: "4K (4096px)", warning: "4K generatie duurt langer (tot 5 minuten per foto)" },
]

export const DC_SPECS = {
  width: 1350,
  depth: 565,
  height: 1900,
  shelfWidth: 1275,
  shelfDepth: 545,
  maxShelves: 6,
  heightHoles: 30,
} as const

export const DEFAULT_GROWER_SETTINGS = {
  logoUrl: null,
  logoPosition: "top-right" as const,
  defaultAspectRatio: "1:1" as const,
  defaultResolution: "1024" as const,
}

export const FUST_TYPES: Record<number, string> = {
  800: "Los op DC (zonder fust)",
  212: "Tray",
  206: "Doos",
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Artificial Plants": "bg-purple-100 text-purple-800",
  "Tropical indoor": "bg-emerald-100 text-emerald-800",
  "mediterranean outdoor": "bg-amber-100 text-amber-800",
}

export const NOTIFICATION_EMOJI: Record<string, string> = {
  generation_complete: "\u2705",
  generation_failed: "\u274C",
  usage_warning: "\u26A0\uFE0F",
  usage_limit_reached: "\uD83D\uDEAB",
  sync_complete: "\uD83D\uDD17",
  sync_failed: "\uD83D\uDD17",
  import_complete: "\uD83D\uDCE5",
  import_failed: "\uD83D\uDCE5",
  system: "\u2139\uFE0F",
}
