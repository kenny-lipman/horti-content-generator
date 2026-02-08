export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductById, toLegacyProduct } from "@/lib/data/products"
import { getSceneTemplates } from "@/lib/data/scenes"
import { getAccessoryProducts, getCombinationsForProduct } from "@/lib/data/combinations"
import { getOrganizationIdOrDev } from "@/lib/data/auth"
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

  const organizationId = product.organization_id

  // Fetch all data in parallel
  const [scenes, accessories, combinations] = await Promise.all([
    getSceneTemplates(organizationId),
    getAccessoryProducts(organizationId),
    getCombinationsForProduct(id),
  ])

  // Convert to legacy format for the existing generation pipeline
  const legacyProduct = toLegacyProduct(product)

  return (
    <ProductDetailClient
      product={legacyProduct}
      scenes={scenes}
      accessories={accessories}
      combinations={combinations}
    />
  )
}
