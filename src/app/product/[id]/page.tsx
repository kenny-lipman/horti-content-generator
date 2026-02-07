import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductById } from "@/lib/utils"
import { ProductDetailClient } from "@/components/product/product-detail-client"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = getProductById(id)

  if (!product) {
    return { title: "Product niet gevonden" }
  }

  return {
    title: `${product.name} - Floriday Content Generator`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = getProductById(id)

  if (!product) {
    return notFound()
  }

  return <ProductDetailClient product={product} />
}
