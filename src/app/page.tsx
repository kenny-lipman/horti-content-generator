"use client"

import { useState, useCallback, useMemo } from "react"
import { SearchFilterBar } from "@/components/catalog/search-filter-bar"
import { ProductGrid } from "@/components/catalog/product-grid"
import { searchProducts, filterByCategory } from "@/lib/utils"

export default function CatalogusPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  const filteredProducts = useMemo(() => {
    const searched = searchProducts(searchQuery)
    return filterByCategory(searched, selectedCategory)
  }, [searchQuery, selectedCategory])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Productcatalogus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecteer een product om foto&apos;s te genereren
        </p>
      </div>

      <div className="mb-6">
        <SearchFilterBar
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          totalCount={filteredProducts.length}
        />
      </div>

      <ProductGrid products={filteredProducts} />
    </div>
  )
}
