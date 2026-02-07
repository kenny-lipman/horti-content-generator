"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchFilterBar } from "./search-filter-bar"
import { ProductGrid } from "./product-grid"
import type { ProductWithAttributes } from "@/lib/supabase/types"

interface CatalogClientProps {
  initialProducts: ProductWithAttributes[]
  categories: string[]
}

export function CatalogClient({ initialProducts, categories }: CatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  const filteredProducts = useMemo(() => {
    let result = initialProducts

    // Zoek op naam, SKU of beschrijving
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          (p.plant_attributes?.vbn_code?.toLowerCase().includes(q) ?? false)
      )
    }

    // Filter op categorie
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory)
    }

    return result
  }, [initialProducts, searchQuery, selectedCategory])

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
          totalCount={filteredProducts.length}
          categories={categories}
        />
      </div>

      <ProductGrid products={filteredProducts} />
    </div>
  )
}
