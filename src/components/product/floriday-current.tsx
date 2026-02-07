"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon, Truck } from "lucide-react"
import { FUST_TYPES, DC_SPECS } from "@/lib/constants"
import type { Product } from "@/lib/types"

interface FloridayCurrentProps {
  product?: Product
}

const MOCK_CURRENT_PHOTOS = [
  { label: "Productfoto", type: "catalog" },
  { label: "Sfeerbeeld", type: "lifestyle" },
  { label: "Detailfoto", type: "detail" },
]

export function FloridayCurrent({ product }: FloridayCurrentProps) {
  const carrier = product?.carrier
  const fustLabel = carrier ? FUST_TYPES[carrier.fustCode] ?? `Code ${carrier.fustCode}` : null
  const totalPerDC = carrier ? carrier.layers * carrier.perLayer : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Huidig op Floriday</CardTitle>
        <CardDescription className="text-xs">
          Demo — dit zijn voorbeeldfoto&apos;s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {MOCK_CURRENT_PHOTOS.map((photo) => (
            <div key={photo.type} className="space-y-1">
              <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/50">
                <ImageIcon className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {photo.label}
              </p>
            </div>
          ))}
        </div>

        {/* DC Specs sectie */}
        {product && carrier && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Truck className="size-4 text-muted-foreground" />
              DC Specificaties
            </div>
            <div className="grid gap-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Fust type</span>
                <span className="font-medium text-foreground">{fustLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>DC indeling</span>
                <span className="font-medium text-foreground">
                  {carrier.layers} laag &times; {carrier.perLayer} planten = {totalPerDC} per DC
                </span>
              </div>
              <div className="flex justify-between">
                <span>DC afmetingen</span>
                <span className="font-medium text-foreground">
                  {DC_SPECS.width} &times; {DC_SPECS.depth} &times; {DC_SPECS.height}mm
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
