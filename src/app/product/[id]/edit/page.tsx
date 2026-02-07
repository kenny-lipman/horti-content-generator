import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getProductById } from "@/lib/data/products"
import { ProductForm } from "@/components/product/product-form"
import { updateProductAction } from "@/app/actions/products"

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return { title: "Product niet gevonden" }
  }

  return {
    title: `${product.name} bewerken - Floriday Content Generator`,
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return notFound()
  }

  async function handleSubmit(formData: FormData) {
    'use server'
    const result = await updateProductAction(formData)
    if (result.success) {
      redirect(`/product/${result.productId}`)
    }
    return result
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <ProductForm
        mode="edit"
        initialData={product}
        onSubmit={handleSubmit}
        organizationId={product.organization_id}
      />
    </div>
  )
}
