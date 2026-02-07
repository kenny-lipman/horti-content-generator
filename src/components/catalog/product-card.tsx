"use client"

import Link from "next/link"
import { Leaf } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatCarrier } from "@/lib/utils"
import { CATEGORY_COLORS } from "@/lib/constants"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const categoryColor = CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-800"

  return (
    <Link href={`/product/${product.id}`} className="group block min-h-[48px]">
      <Card className="h-full gap-0 py-0 transition-shadow duration-200 group-hover:shadow-md group-hover:border-primary/50">
        {/* Placeholder afbeelding */}
        <div className="flex h-40 items-center justify-center rounded-t-xl bg-emerald-50">
          <Leaf className="size-12 text-emerald-300" strokeWidth={1.5} />
        </div>

        <CardContent className="space-y-3 p-4">
          {/* Naam en SKU */}
          <div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {product.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              SKU: {product.sku}
            </p>
          </div>

          {/* Categorie badge */}
          <Badge variant="secondary" className={cn("text-[11px]", categoryColor)}>
            {product.category}
          </Badge>

          {/* Specificaties */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Potmaat</span>
              <span className="font-medium text-foreground">{product.potDiameter} cm</span>
            </div>
            <div className="flex justify-between">
              <span>Hoogte</span>
              <span className="font-medium text-foreground">{product.plantHeight} cm</span>
            </div>
            <div className="flex justify-between">
              <span>Belading</span>
              <span className="font-medium text-foreground">{formatCarrier(product.carrier)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
