import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProductForm } from "@/components/product/product-form"
import { createProductAction } from "@/app/actions/products"
import { getOrganizationIdOrDev } from "@/lib/data/auth"

export const metadata: Metadata = {
  title: "Nieuw product - Floriday Content Generator",
}

export default async function NewProductPage() {
  const organizationId = await getOrganizationIdOrDev()

  async function handleSubmit(formData: FormData) {
    'use server'
    const result = await createProductAction(formData)
    if (result.success) {
      redirect(`/product/${result.productId}`)
    }
    return result
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <ProductForm
        mode="create"
        onSubmit={handleSubmit}
        organizationId={organizationId}
      />
    </div>
  )
}
