export const dynamic = 'force-dynamic'

import { getProducts, getCategories } from "@/lib/data/products"
import { CatalogClient } from "@/components/catalog/catalog-client"

export default async function CatalogusPage() {
  const [result, categories] = await Promise.all([
    getProducts({ isActive: true, pageSize: 200 }),
    getCategories(),
  ])

  return (
    <CatalogClient
      initialProducts={result.products}
      categories={categories}
    />
  )
}
