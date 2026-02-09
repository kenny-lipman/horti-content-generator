import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import products from "@/data/products.json"
import type { Product, Carrier, ImageType } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Zojuist"
  if (diffMin < 60) return `${diffMin}m geleden`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}u geleden`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d geleden`
}

// Cast the JSON data to typed products
const typedProducts = products as Product[]

export function getProducts(): Product[] {
  return typedProducts
}

export function getProductById(id: string): Product | undefined {
  return typedProducts.find((p) => p.id === id)
}

export function searchProducts(query: string): Product[] {
  if (!query.trim()) return typedProducts
  const q = query.toLowerCase()
  return typedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.vbnCode.toLowerCase().includes(q)
  )
}

export function filterByCategory(products: Product[], category: string): Product[] {
  if (!category || category === "all") return products
  return products.filter((p) => p.category === category)
}

export function getCategories(): string[] {
  const cats = new Set(typedProducts.map((p) => p.category))
  return Array.from(cats).sort()
}

export function formatCarrier(carrier: Carrier): string {
  return `${carrier.fustCode} - ${carrier.layers}×${carrier.perLayer}×${carrier.units} - ${carrier.carriageType}`
}

export function getPlantDisplayName(name: string): string {
  return name.replace(/^ARTIFICIAL\s+/i, "").replace(/\s*-\s*\d+cm$/i, "")
}

export function getHeightDescription(heightCm: number): string {
  if (heightCm <= 40) return "a small tabletop plant"
  if (heightCm <= 80) return "a medium-sized plant"
  if (heightCm <= 120) return "a tall floor-standing plant"
  if (heightCm <= 160) return "a large floor-standing plant"
  return "a very tall statement plant"
}

export function isImageTypeAvailable(type: ImageType, product: Product): boolean {
  switch (type) {
    case "tray":
      return product.potDiameter >= 20
    case "seasonal":
      return !product.isArtificial && product.canBloom
    default:
      return true
  }
}

export function getDisabledReason(type: ImageType, product: Product): string | null {
  switch (type) {
    case "tray":
      if (product.potDiameter < 20)
        return `Tray niet beschikbaar bij potmaat ${product.potDiameter}cm (minimaal 20cm)`
      return null
    case "seasonal":
      if (product.isArtificial)
        return "Seizoensfoto niet beschikbaar voor kunstplanten"
      if (!product.canBloom)
        return "Seizoensfoto niet beschikbaar voor deze plant"
      return null
    default:
      return null
  }
}
