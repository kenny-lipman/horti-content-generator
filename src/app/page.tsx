export const dynamic = 'force-dynamic'

import { getProducts, getCategories } from "@/lib/data/products"
import { CatalogClient } from "@/components/catalog/catalog-client"

const PAGE_SIZE = 24

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>
}

export default async function CatalogusPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const search = params.search || ''
  const category = params.category || ''

  const [result, categories] = await Promise.all([
    getProducts({
      isActive: true,
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      category: category || undefined,
    }),
    getCategories(),
  ])

  return (
    <CatalogClient
      products={result.products}
      categories={categories}
      currentPage={result.page}
      totalPages={result.totalPages}
      totalCount={result.total}
      currentSearch={search}
      currentCategory={category}
    />
  )
}
