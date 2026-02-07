import Link from "next/link"
import { ArrowLeft, Ruler, ArrowUpDown, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatCarrier } from "@/lib/utils"
import { CATEGORY_COLORS } from "@/lib/constants"
import type { Product } from "@/lib/types"

interface ProductHeaderProps {
  product: Product
}

export function ProductHeader({ product }: ProductHeaderProps) {
  const categoryColor =
    CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-800"

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Terug naar catalogus
      </Link>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {product.name}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">SKU: {product.sku}</Badge>
          <Badge variant="outline">VBN: {product.vbnCode}</Badge>
          <Badge className={cn("border-0", categoryColor)}>
            {product.category}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Ruler className="size-4" />
            <span>Potmaat: {product.potDiameter} cm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="size-4" />
            <span>Hoogte: {product.plantHeight} cm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="size-4" />
            <span>Belading: {formatCarrier(product.carrier)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
