'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { ProductWithAttributes, ProductType, AccessoryType } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionResult {
  success: boolean
  error?: string
  redirectTo?: string
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  initialData?: ProductWithAttributes | null
  onSubmit: (formData: FormData) => Promise<ActionResult>
  organizationId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'plant', label: 'Potplant' },
  { value: 'cut_flower', label: 'Snijbloem' },
  { value: 'accessory', label: 'Accessoire' },
]

const ACCESSORY_TYPE_OPTIONS: { value: AccessoryType; label: string }[] = [
  { value: 'pot', label: 'Pot' },
  { value: 'vase', label: 'Vaas' },
  { value: 'stand', label: 'Standaard' },
  { value: 'basket', label: 'Mand' },
  { value: 'cover', label: 'Hoes' },
  { value: 'decoration', label: 'Decoratie' },
  { value: 'packaging', label: 'Verpakking' },
]

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP'] as const

// ---------------------------------------------------------------------------
// Shared textarea classes (mirrors Input styling)
// ---------------------------------------------------------------------------

const textareaClasses =
  'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium leading-none', className)}
    >
      {children}
    </label>
  )
}

function FormField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function SwitchField({
  label,
  name,
  defaultChecked,
}: {
  label: string
  name: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false)

  return (
    <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={checked ? 'true' : 'false'} />
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductForm({
  mode,
  initialData,
  onSubmit,
  organizationId,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [productType, setProductType] = useState<ProductType>(
    (initialData?.product_type as ProductType) ?? 'plant'
  )

  // Shorthand for initial attribute data
  const plant = initialData?.plant_attributes
  const cutFlower = initialData?.cut_flower_attributes
  const accessory = initialData?.accessories
  const retail = initialData?.retail_attributes

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        const result = await onSubmit(formData)
        if (!result.success) {
          setError(result.error ?? 'Er is een fout opgetreden.')
        }
        // Redirect is handled by the parent / server action
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Er is een onverwachte fout opgetreden.'
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="organization_id" value={organizationId} />
      {mode === 'edit' && initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Card 1: Basisgegevens */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Basisgegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Productnaam *" htmlFor="name" className="sm:col-span-2">
              <Input
                id="name"
                name="name"
                required
                placeholder="Bijv. Ficus Benjamina"
                defaultValue={initialData?.name ?? ''}
              />
            </FormField>

            <FormField label="SKU" htmlFor="sku">
              <Input
                id="sku"
                name="sku"
                placeholder="Artikelnummer"
                defaultValue={initialData?.sku ?? ''}
              />
            </FormField>

            <FormField label="Producttype *" htmlFor="product_type">
              <Select
                name="product_type"
                value={productType}
                onValueChange={(v) => setProductType(v as ProductType)}
                disabled={mode === 'edit'}
              >
                <SelectTrigger id="product_type" className="w-full">
                  <SelectValue placeholder="Kies producttype" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Beschrijving" htmlFor="description" className="sm:col-span-2">
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Optionele productbeschrijving"
                defaultValue={initialData?.description ?? ''}
                className={textareaClasses}
              />
            </FormField>

            <FormField label="Categorie" htmlFor="category">
              <Input
                id="category"
                name="category"
                placeholder="Bijv. Tropisch"
                defaultValue={initialData?.category ?? ''}
              />
            </FormField>

            <FormField label="Tags" htmlFor="tags">
              <Input
                id="tags"
                name="tags"
                placeholder="Kommagescheiden, bijv. groen, tropisch"
                defaultValue={initialData?.tags?.join(', ') ?? ''}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Card 2: Plant Attributen */}
      {/* ----------------------------------------------------------------- */}
      {productType === 'plant' && (
        <Card>
          <CardHeader>
            <CardTitle>Plant Attributen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="VBN Code" htmlFor="vbn_code">
                <Input
                  id="vbn_code"
                  name="vbn_code"
                  placeholder="Bijv. 111335"
                  defaultValue={plant?.vbn_code ?? ''}
                />
              </FormField>

              <FormField label="Potmaat (cm)" htmlFor="pot_diameter">
                <Input
                  id="pot_diameter"
                  name="pot_diameter"
                  type="number"
                  min={0}
                  placeholder="Bijv. 17"
                  defaultValue={plant?.pot_diameter ?? ''}
                />
              </FormField>

              <FormField label="Planthoogte (cm)" htmlFor="plant_height">
                <Input
                  id="plant_height"
                  name="plant_height"
                  type="number"
                  min={0}
                  placeholder="Bijv. 65"
                  defaultValue={plant?.plant_height ?? ''}
                />
              </FormField>

              <FormField label="Beschikbaarheid" htmlFor="availability">
                <Input
                  id="availability"
                  name="availability"
                  placeholder="Bijv. Week 1 - 53"
                  defaultValue={plant?.availability ?? ''}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SwitchField
                label="Kunstplant"
                name="is_artificial"
                defaultChecked={plant?.is_artificial ?? false}
              />
              <SwitchField
                label="Kan bloeien"
                name="can_bloom"
                defaultChecked={plant?.can_bloom ?? false}
              />
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">
              Carrier specificaties
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Fustcode" htmlFor="carrier_fust_code">
                <Input
                  id="carrier_fust_code"
                  name="carrier_fust_code"
                  type="number"
                  placeholder="Bijv. 800"
                  defaultValue={plant?.carrier_fust_code ?? ''}
                />
              </FormField>

              <FormField label="Fusttype" htmlFor="carrier_fust_type">
                <Input
                  id="carrier_fust_type"
                  name="carrier_fust_type"
                  placeholder="Bijv. Tray"
                  defaultValue={plant?.carrier_fust_type ?? ''}
                />
              </FormField>

              <FormField label="Transporttype" htmlFor="carrier_carriage_type">
                <Input
                  id="carrier_carriage_type"
                  name="carrier_carriage_type"
                  placeholder="DC"
                  defaultValue={plant?.carrier_carriage_type ?? 'DC'}
                />
              </FormField>

              <FormField label="Lagen" htmlFor="carrier_layers">
                <Input
                  id="carrier_layers"
                  name="carrier_layers"
                  type="number"
                  min={0}
                  placeholder="Bijv. 4"
                  defaultValue={plant?.carrier_layers ?? ''}
                />
              </FormField>

              <FormField label="Per laag" htmlFor="carrier_per_layer">
                <Input
                  id="carrier_per_layer"
                  name="carrier_per_layer"
                  type="number"
                  min={0}
                  placeholder="Bijv. 8"
                  defaultValue={plant?.carrier_per_layer ?? ''}
                />
              </FormField>

              <FormField label="Eenheden" htmlFor="carrier_units">
                <Input
                  id="carrier_units"
                  name="carrier_units"
                  type="number"
                  min={0}
                  placeholder="Bijv. 1"
                  defaultValue={plant?.carrier_units ?? ''}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Card 3: Snijbloem Attributen */}
      {/* ----------------------------------------------------------------- */}
      {productType === 'cut_flower' && (
        <Card>
          <CardHeader>
            <CardTitle>Snijbloem Attributen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Steellengte (cm)" htmlFor="stem_length">
                <Input
                  id="stem_length"
                  name="stem_length"
                  type="number"
                  min={0}
                  placeholder="Bijv. 60"
                  defaultValue={cutFlower?.stem_length ?? ''}
                />
              </FormField>

              <FormField label="Bos grootte" htmlFor="bunch_size">
                <Input
                  id="bunch_size"
                  name="bunch_size"
                  type="number"
                  min={1}
                  placeholder="Bijv. 10"
                  defaultValue={cutFlower?.bunch_size ?? ''}
                />
              </FormField>

              <FormField label="Vaas leven (dagen)" htmlFor="vase_life_days">
                <Input
                  id="vase_life_days"
                  name="vase_life_days"
                  type="number"
                  min={0}
                  placeholder="Bijv. 7"
                  defaultValue={cutFlower?.vase_life_days ?? ''}
                />
              </FormField>

              <FormField label="Primaire kleur" htmlFor="color_primary">
                <Input
                  id="color_primary"
                  name="color_primary"
                  placeholder="Bijv. Rood"
                  defaultValue={cutFlower?.color_primary ?? ''}
                />
              </FormField>

              <FormField label="Secundaire kleur" htmlFor="color_secondary">
                <Input
                  id="color_secondary"
                  name="color_secondary"
                  placeholder="Bijv. Wit"
                  defaultValue={cutFlower?.color_secondary ?? ''}
                />
              </FormField>

              <FormField label="Seizoen" htmlFor="season">
                <Input
                  id="season"
                  name="season"
                  placeholder="Bijv. Voorjaar"
                  defaultValue={cutFlower?.season ?? ''}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SwitchField
                label="Geurig"
                name="fragrant"
                defaultChecked={cutFlower?.fragrant ?? false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Card 4: Accessoire Attributen */}
      {/* ----------------------------------------------------------------- */}
      {productType === 'accessory' && (
        <Card>
          <CardHeader>
            <CardTitle>Accessoire Attributen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Type *" htmlFor="accessory_type">
                <Select
                  name="accessory_type"
                  defaultValue={accessory?.accessory_type ?? 'pot'}
                >
                  <SelectTrigger id="accessory_type" className="w-full">
                    <SelectValue placeholder="Kies type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESSORY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Materiaal" htmlFor="material">
                <Input
                  id="material"
                  name="material"
                  placeholder="Bijv. Keramiek"
                  defaultValue={accessory?.material ?? ''}
                />
              </FormField>

              <FormField label="Kleur" htmlFor="accessory_color">
                <Input
                  id="accessory_color"
                  name="accessory_color"
                  placeholder="Bijv. Wit"
                  defaultValue={accessory?.color ?? ''}
                />
              </FormField>

              <FormField label="Compatibele potmaten" htmlFor="compatible_pot_sizes">
                <Input
                  id="compatible_pot_sizes"
                  name="compatible_pot_sizes"
                  placeholder="Kommagescheiden, bijv. 12, 14, 17"
                  defaultValue={accessory?.compatible_pot_sizes?.join(', ') ?? ''}
                />
              </FormField>

              <FormField label="Stijl tags" htmlFor="style_tags" className="sm:col-span-2">
                <Input
                  id="style_tags"
                  name="style_tags"
                  placeholder="Kommagescheiden, bijv. modern, minimalistisch"
                  defaultValue={accessory?.style_tags?.join(', ') ?? ''}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Card 5: Retail Attributen */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Retail Attributen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Prijs" htmlFor="price">
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                defaultValue={retail?.price ?? ''}
              />
            </FormField>

            <FormField label="Vergelijkingsprijs" htmlFor="compare_at_price">
              <Input
                id="compare_at_price"
                name="compare_at_price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                defaultValue={retail?.compare_at_price ?? ''}
              />
            </FormField>

            <FormField label="Valuta" htmlFor="currency">
              <Select
                name="currency"
                defaultValue={retail?.currency ?? 'EUR'}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Kies valuta" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((cur) => (
                    <SelectItem key={cur} value={cur}>
                      {cur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Korte beschrijving" htmlFor="short_description">
            <textarea
              id="short_description"
              name="short_description"
              rows={2}
              placeholder="Korte productbeschrijving voor webshop"
              defaultValue={retail?.short_description ?? ''}
              className={textareaClasses}
            />
          </FormField>

          <FormField label="Lange beschrijving" htmlFor="long_description">
            <textarea
              id="long_description"
              name="long_description"
              rows={4}
              placeholder="Uitgebreide productbeschrijving"
              defaultValue={retail?.long_description ?? ''}
              className={textareaClasses}
            />
          </FormField>

          <FormField label="Collecties" htmlFor="collections">
            <Input
              id="collections"
              name="collections"
              placeholder="Kommagescheiden, bijv. Lente 2025, Bestsellers"
              defaultValue={retail?.collections?.join(', ') ?? ''}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Form actions */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 pb-8">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" />
            Terug
          </Link>
        </Button>

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {mode === 'create' ? 'Product aanmaken' : 'Product opslaan'}
        </Button>
      </div>
    </form>
  )
}
