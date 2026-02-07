"use client"

import Link from "next/link"
import Image from "next/image"
import { Leaf } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CATEGORY_COLORS } from "@/lib/constants"
import type { ProductWithAttributes } from "@/lib/supabase/types"

interface ProductCardProps {
  product: ProductWithAttributes
}

function formatCarrierInfo(product: ProductWithAttributes): string | null {
  const pa = product.plant_attributes
  if (!pa?.carrier_fust_code) return null
  const layers = pa.carrier_layers ?? 0
  const perLayer = pa.carrier_per_layer ?? 0
  const units = pa.carrier_units ?? 0
  return `${pa.carrier_fust_code} - ${layers}×${perLayer}×${units} - ${pa.carrier_carriage_type ?? 'DC'}`
}

export function ProductCard({ product }: ProductCardProps) {
  const categoryColor = CATEGORY_COLORS[product.category ?? ""] ?? "bg-gray-100 text-gray-800"
  const pa = product.plant_attributes
  const cfa = product.cut_flower_attributes
  const acc = product.accessories
  const carrierInfo = formatCarrierInfo(product)

  return (
    <Link href={`/product/${product.id}`} className="group block min-h-[48px]">
      <Card className="h-full gap-0 py-0 transition-shadow duration-200 group-hover:shadow-md group-hover:border-primary/50">
        {/* Product afbeelding of placeholder */}
        {product.catalog_image_url ? (
          <div className="relative h-40 overflow-hidden rounded-t-xl bg-emerald-50">
            <Image
              src={product.catalog_image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-t-xl bg-emerald-50">
            <Leaf className="size-12 text-emerald-300" strokeWidth={1.5} />
          </div>
        )}

        <CardContent className="space-y-3 p-4">
          {/* Naam en SKU */}
          <div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {product.name}
            </h3>
            {product.sku && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                SKU: {product.sku}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {product.category && (
              <Badge variant="secondary" className={cn("text-[11px]", categoryColor)}>
                {product.category}
              </Badge>
            )}
            <Badge variant="outline" className="text-[11px]">
              {product.product_type === 'plant' ? 'Potplant' :
               product.product_type === 'cut_flower' ? 'Snijbloem' :
               'Accessoire'}
            </Badge>
          </div>

          {/* Specificaties per type */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {pa && (
              <>
                {pa.pot_diameter != null && (
                  <div className="flex justify-between">
                    <span>Potmaat</span>
                    <span className="font-medium text-foreground">{pa.pot_diameter} cm</span>
                  </div>
                )}
                {pa.plant_height != null && (
                  <div className="flex justify-between">
                    <span>Hoogte</span>
                    <span className="font-medium text-foreground">{pa.plant_height} cm</span>
                  </div>
                )}
                {carrierInfo && (
                  <div className="flex justify-between">
                    <span>Belading</span>
                    <span className="font-medium text-foreground">{carrierInfo}</span>
                  </div>
                )}
              </>
            )}
            {cfa && (
              <>
                {cfa.stem_length != null && (
                  <div className="flex justify-between">
                    <span>Steellengte</span>
                    <span className="font-medium text-foreground">{cfa.stem_length} cm</span>
                  </div>
                )}
                {cfa.bunch_size != null && (
                  <div className="flex justify-between">
                    <span>Bos</span>
                    <span className="font-medium text-foreground">{cfa.bunch_size} stuks</span>
                  </div>
                )}
              </>
            )}
            {acc && (
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-medium text-foreground">{acc.accessory_type}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
