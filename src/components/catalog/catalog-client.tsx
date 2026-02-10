"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchFilterBar } from "./search-filter-bar"
import { ProductGrid } from "./product-grid"
import { Pagination } from "./pagination"
import type { ProductWithAttributes } from "@/lib/supabase/types"

interface CatalogClientProps {
  products: ProductWithAttributes[]
  categories: string[]
  currentPage: number
  totalPages: number
  totalCount: number
  currentSearch: string
  currentCategory: string
}

export function CatalogClient({
  products,
  categories,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentCategory,
}: CatalogClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      // Reset naar pagina 1 bij zoek/filter wijziging
      if ('search' in updates || 'category' in updates) {
        params.delete('page')
      }
      const qs = params.toString()
      router.push(qs ? `/?${qs}` : '/')
    },
    [router, searchParams]
  )

  const handleSearchChange = useCallback(
    (query: string) => {
      updateParams({ search: query })
    },
    [updateParams]
  )

  const handleCategoryChange = useCallback(
    (category: string) => {
      updateParams({ category: category === 'all' ? '' : category })
    },
    [updateParams]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productcatalogus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecteer een product om foto&apos;s te genereren
          </p>
        </div>
        <Button asChild>
          <Link href="/product/new">
            <Plus className="mr-2 h-4 w-4" />
            Product toevoegen
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <SearchFilterBar
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          totalCount={totalCount}
          categories={categories}
          initialSearch={currentSearch}
          initialCategory={currentCategory}
        />
      </div>

      <ProductGrid products={products} />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}
    </div>
  )
}
