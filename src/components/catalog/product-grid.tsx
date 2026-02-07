"use client"

import Link from "next/link"
import { PackageSearch, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "./product-card"
import type { ProductWithAttributes } from "@/lib/supabase/types"

interface ProductGridProps {
  products: ProductWithAttributes[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <PackageSearch className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-medium">Geen producten gevonden</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Voeg je eerste product toe of pas de filters aan.
        </p>
        <Button asChild className="mt-4">
          <Link href="/product/new">
            <Plus className="mr-2 h-4 w-4" />
            Product toevoegen
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
