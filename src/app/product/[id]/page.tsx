export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { getSceneTemplates } from "@/lib/data/scenes"
import { getAccessoryProducts, getCombinationsForProduct } from "@/lib/data/combinations"
import { getIntegrations } from "@/lib/data/integrations"
import { ProductDetailClient } from "@/components/product/product-detail-client"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return { title: "Product niet gevonden" }
  }

  return {
    title: `${product.name} - Floriday Content Generator`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return notFound()
  }

  // Fetch all data in parallel (RLS filtert automatisch op organization)
  const [scenes, accessories, combinations, integrations] = await Promise.all([
    getSceneTemplates(),
    getAccessoryProducts(),
    getCombinationsForProduct(id),
    getIntegrations(),
  ])

  // Convert to legacy format for the existing generation pipeline
  const legacyProduct = toLegacyProduct(product)

  return (
    <ProductDetailClient
      product={legacyProduct}
      scenes={scenes}
      accessories={accessories}
      combinations={combinations}
      integrations={integrations}
    />
  )
}
