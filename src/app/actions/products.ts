'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { getOrganizationIdOrDev } from '@/lib/data/auth'
import type {
  ProductInsert,
  ProductUpdate,
  PlantAttributesInsert,
  CutFlowerAttributesInsert,
  AccessoryInsert,
  SourceImageInsert,
} from '@/lib/supabase/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ============================================
// Return types
// ============================================

type ActionResult =
  | { success: true; productId: string }
  | { success: false; error: string }

type UploadResult =
  | { success: true; imageId: string; imageUrl: string }
  | { success: false; error: string }

// ============================================
// Zod Schemas
// ============================================

const productSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  sku: z.string().optional(),
  description: z.string().optional(),
  product_type: z.enum(['plant', 'cut_flower', 'accessory'], {
    message: 'Producttype is verplicht',
  }),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  organization_id: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    { message: 'Ongeldig organisatie-ID' }
  ),
})

const plantAttributesSchema = z.object({
  pot_diameter: z.coerce.number().positive('Potdiameter moet positief zijn').optional(),
  plant_height: z.coerce.number().positive('Planthoogte moet positief zijn').optional(),
  vbn_code: z.string().optional(),
  carrier_fust_code: z.coerce.number().optional(),
  carrier_fust_type: z.string().optional(),
  carrier_carriage_type: z.string().optional(),
  carrier_layers: z.coerce.number().int().positive().optional(),
  carrier_per_layer: z.coerce.number().int().positive().optional(),
  carrier_units: z.coerce.number().int().positive().optional(),
  availability: z.string().optional(),
  is_artificial: z.boolean().optional(),
  can_bloom: z.boolean().optional(),
})

const cutFlowerAttributesSchema = z.object({
  stem_length: z.coerce.number().positive('Steellengte moet positief zijn').optional(),
  bunch_size: z.coerce.number().int().positive('Bosgrootte moet positief zijn').optional(),
  vase_life_days: z.coerce.number().int().positive('Vaaslevensduur moet positief zijn').optional(),
  color_primary: z.string().optional(),
  color_secondary: z.string().optional(),
  fragrant: z.boolean().optional(),
  season: z.string().optional(),
})

const accessoryAttributesSchema = z.object({
  accessory_type: z.string().min(1, 'Accessoire-type is verplicht'),
  material: z.string().optional(),
  color: z.string().optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  compatible_pot_sizes: z.array(z.coerce.number()).optional(),
  style_tags: z.array(z.string()).optional(),
})

// ============================================
// Helpers
// ============================================

/**
 * Parse FormData booleans: checkbox values komen binnen als "on" of ontbreken.
 */
function parseBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === null || value === undefined) return undefined
  if (value === 'true' || value === 'on') return true
  if (value === 'false' || value === 'off') return false
  return undefined
}

/**
 * Parse een comma-separated string naar een array.
 */
function parseStringArray(value: FormDataEntryValue | null): string[] | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Parse een comma-separated string van nummers naar een number array.
 */
function parseNumberArray(value: FormDataEntryValue | null): number[] | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined
  const numbers = value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n))
  return numbers.length > 0 ? numbers : undefined
}

/**
 * Parse een optioneel nummer uit FormData.
 */
function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined
  const num = Number(value)
  return isNaN(num) ? undefined : num
}

/**
 * Parse een optionele string uit FormData.
 */
function parseOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined
  return value.trim()
}

/**
 * Parse dimensions JSON string naar object.
 */
function parseDimensions(value: FormDataEntryValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * Extract plant attributes uit FormData.
 */
function extractPlantAttributes(formData: FormData) {
  return {
    pot_diameter: parseOptionalNumber(formData.get('pot_diameter')),
    plant_height: parseOptionalNumber(formData.get('plant_height')),
    vbn_code: parseOptionalString(formData.get('vbn_code')),
    carrier_fust_code: parseOptionalNumber(formData.get('carrier_fust_code')),
    carrier_fust_type: parseOptionalString(formData.get('carrier_fust_type')),
    carrier_carriage_type: parseOptionalString(formData.get('carrier_carriage_type')),
    carrier_layers: parseOptionalNumber(formData.get('carrier_layers')),
    carrier_per_layer: parseOptionalNumber(formData.get('carrier_per_layer')),
    carrier_units: parseOptionalNumber(formData.get('carrier_units')),
    availability: parseOptionalString(formData.get('availability')),
    is_artificial: parseBoolean(formData.get('is_artificial')),
    can_bloom: parseBoolean(formData.get('can_bloom')),
  }
}

/**
 * Extract cut flower attributes uit FormData.
 */
function extractCutFlowerAttributes(formData: FormData) {
  return {
    stem_length: parseOptionalNumber(formData.get('stem_length')),
    bunch_size: parseOptionalNumber(formData.get('bunch_size')),
    vase_life_days: parseOptionalNumber(formData.get('vase_life_days')),
    color_primary: parseOptionalString(formData.get('color_primary')),
    color_secondary: parseOptionalString(formData.get('color_secondary')),
    fragrant: parseBoolean(formData.get('fragrant')),
    season: parseOptionalString(formData.get('season')),
  }
}

/**
 * Extract accessory attributes uit FormData.
 */
function extractAccessoryAttributes(formData: FormData) {
  return {
    accessory_type: parseOptionalString(formData.get('accessory_type')) ?? '',
    material: parseOptionalString(formData.get('material')),
    color: parseOptionalString(formData.get('color')),
    dimensions: parseDimensions(formData.get('dimensions')),
    compatible_pot_sizes: parseNumberArray(formData.get('compatible_pot_sizes')),
    style_tags: parseStringArray(formData.get('style_tags')),
  }
}

// ============================================
// Server Actions
// ============================================

/**
 * Maak een nieuw product aan met bijbehorende type-specifieke attributen.
 */
export async function createProductAction(formData: FormData): Promise<ActionResult> {
  try {
    // Parse basis product data
    const rawProduct = {
      name: formData.get('name'),
      sku: parseOptionalString(formData.get('sku')),
      description: parseOptionalString(formData.get('description')),
      product_type: formData.get('product_type'),
      category: parseOptionalString(formData.get('category')),
      tags: parseStringArray(formData.get('tags')),
      organization_id: (formData.get('organization_id') as string) || await getOrganizationIdOrDev(),
    }

    // Valideer product data
    const productResult = productSchema.safeParse(rawProduct)
    if (!productResult.success) {
      const firstError = productResult.error.issues[0]
      return { success: false, error: firstError?.message ?? 'Validatiefout' }
    }

    const productData = productResult.data

    // Valideer type-specifieke attributen
    let validatedAttributes: Record<string, unknown> | null = null

    switch (productData.product_type) {
      case 'plant': {
        const attrs = extractPlantAttributes(formData)
        const result = plantAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij plantgegevens' }
        }
        validatedAttributes = result.data
        break
      }
      case 'cut_flower': {
        const attrs = extractCutFlowerAttributes(formData)
        const result = cutFlowerAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij snijbloem-gegevens' }
        }
        validatedAttributes = result.data
        break
      }
      case 'accessory': {
        const attrs = extractAccessoryAttributes(formData)
        const result = accessoryAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij accessoire-gegevens' }
        }
        validatedAttributes = result.data
        break
      }
    }

    const supabase = createAdminClient()

    // Insert product
    const productInsert: ProductInsert = {
      name: productData.name,
      organization_id: productData.organization_id,
      product_type: productData.product_type,
      sku: productData.sku,
      description: productData.description,
      category: productData.category,
      tags: productData.tags,
      is_active: true,
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(productInsert)
      .select('id')
      .single()

    if (productError || !product) {
      console.error('Product insert error:', productError)
      return { success: false, error: 'Fout bij het aanmaken van het product' }
    }

    // Insert type-specifieke attributen
    if (validatedAttributes) {
      const attributeError = await insertAttributes(
        supabase,
        productData.product_type,
        product.id,
        validatedAttributes
      )
      if (attributeError) {
        // Rollback: verwijder het net aangemaakte product
        await supabase.from('products').delete().eq('id', product.id)
        return { success: false, error: attributeError }
      }
    }

    revalidatePath('/producten')

    return { success: true, productId: product.id }
  } catch (error) {
    console.error('Unexpected error in createProductAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}

/**
 * Werk een bestaand product en de bijbehorende attributen bij.
 */
export async function updateProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const productId = formData.get('id') as string
    if (!productId) {
      return { success: false, error: 'Product-ID is verplicht' }
    }

    // Parse basis product data
    const rawProduct = {
      name: formData.get('name'),
      sku: parseOptionalString(formData.get('sku')),
      description: parseOptionalString(formData.get('description')),
      product_type: formData.get('product_type'),
      category: parseOptionalString(formData.get('category')),
      tags: parseStringArray(formData.get('tags')),
      organization_id: (formData.get('organization_id') as string) || await getOrganizationIdOrDev(),
    }

    // Valideer product data
    const productResult = productSchema.safeParse(rawProduct)
    if (!productResult.success) {
      const firstError = productResult.error.issues[0]
      return { success: false, error: firstError?.message ?? 'Validatiefout' }
    }

    const productData = productResult.data

    // Valideer type-specifieke attributen
    let validatedAttributes: Record<string, unknown> | null = null

    switch (productData.product_type) {
      case 'plant': {
        const attrs = extractPlantAttributes(formData)
        const result = plantAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij plantgegevens' }
        }
        validatedAttributes = result.data
        break
      }
      case 'cut_flower': {
        const attrs = extractCutFlowerAttributes(formData)
        const result = cutFlowerAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij snijbloem-gegevens' }
        }
        validatedAttributes = result.data
        break
      }
      case 'accessory': {
        const attrs = extractAccessoryAttributes(formData)
        const result = accessoryAttributesSchema.safeParse(attrs)
        if (!result.success) {
          const firstError = result.error.issues[0]
          return { success: false, error: firstError?.message ?? 'Validatiefout bij accessoire-gegevens' }
        }
        validatedAttributes = result.data
        break
      }
    }

    const supabase = createAdminClient()

    // Update product
    const productUpdate: ProductUpdate = {
      name: productData.name,
      product_type: productData.product_type,
      sku: productData.sku,
      description: productData.description,
      category: productData.category,
      tags: productData.tags,
    }

    const orgId = await getOrganizationIdOrDev()

    const { error: productError } = await supabase
      .from('products')
      .update(productUpdate)
      .eq('id', productId)
      .eq('organization_id', orgId)

    if (productError) {
      console.error('Product update error:', productError)
      return { success: false, error: 'Fout bij het bijwerken van het product' }
    }

    // Upsert type-specifieke attributen
    if (validatedAttributes) {
      const attributeError = await upsertAttributes(
        supabase,
        productData.product_type,
        productId,
        validatedAttributes
      )
      if (attributeError) {
        return { success: false, error: attributeError }
      }
    }

    revalidatePath('/producten')
    revalidatePath(`/producten/${productId}`)

    return { success: true, productId }
  } catch (error) {
    console.error('Unexpected error in updateProductAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}

/**
 * Soft delete: zet is_active op false.
 */
export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const productId = formData.get('id') as string
    if (!productId) {
      return { success: false, error: 'Product-ID is verplicht' }
    }

    const supabase = createAdminClient()
    const orgId = await getOrganizationIdOrDev()

    const { error } = await supabase
      .from('products')
      .update({ is_active: false } satisfies ProductUpdate)
      .eq('id', productId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Product delete error:', error)
      return { success: false, error: 'Fout bij het verwijderen van het product' }
    }

    revalidatePath('/producten')
    revalidatePath(`/producten/${productId}`)

    return { success: true, productId }
  } catch (error) {
    console.error('Unexpected error in deleteProductAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}

/**
 * Upload een bronafbeelding naar Supabase Storage en maak een source_images record.
 */
export async function uploadSourceImageAction(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file') as File | null
    const productId = formData.get('product_id') as string | null
    const imageType = (formData.get('image_type') as string) || 'custom'
    const organizationId = (formData.get('organization_id') as string) || await getOrganizationIdOrDev()

    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Geen bestand geselecteerd' }
    }

    if (!productId) {
      return { success: false, error: 'Product-ID is verplicht' }
    }

    // Valideer bestandsgrootte
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `Bestand is te groot. Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB` }
    }

    // Valideer bestandstype
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: 'Ongeldig bestandstype. Gebruik JPG, PNG of WebP' }
    }

    const supabase = createAdminClient()

    // Genereer unieke bestandsnaam
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `${organizationId}/${productId}/${filename}`

    // Upload naar Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('source-images')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError || !uploadData) {
      console.error('Storage upload error:', uploadError)
      return { success: false, error: 'Fout bij het uploaden van de afbeelding' }
    }

    // Haal public URL op
    const { data: { publicUrl } } = supabase.storage
      .from('source-images')
      .getPublicUrl(uploadData.path)

    // Maak source_images record aan
    const sourceImageInsert: SourceImageInsert = {
      image_url: publicUrl,
      organization_id: organizationId,
      product_id: productId,
      image_type: imageType,
      mime_type: file.type,
      file_size: file.size,
    }

    const { data: sourceImage, error: dbError } = await supabase
      .from('source_images')
      .insert(sourceImageInsert)
      .select('id')
      .single()

    if (dbError || !sourceImage) {
      console.error('Source image insert error:', dbError)
      // Probeer het geuploadde bestand te verwijderen bij database fout
      await supabase.storage.from('source-images').remove([uploadData.path])
      return { success: false, error: 'Fout bij het opslaan van de afbeelding in de database' }
    }

    revalidatePath(`/producten/${productId}`)

    return { success: true, imageId: sourceImage.id, imageUrl: publicUrl }
  } catch (error) {
    console.error('Unexpected error in uploadSourceImageAction:', error)
    return { success: false, error: 'Er is een onverwachte fout opgetreden' }
  }
}

// ============================================
// Private helpers
// ============================================

/**
 * Insert type-specifieke attributen voor een nieuw product.
 */
async function insertAttributes(
  supabase: ReturnType<typeof createAdminClient>,
  productType: 'plant' | 'cut_flower' | 'accessory',
  productId: string,
  attributes: Record<string, unknown>
): Promise<string | null> {
  switch (productType) {
    case 'plant': {
      const insert: PlantAttributesInsert = {
        product_id: productId,
        ...attributes,
      }
      const { error } = await supabase.from('plant_attributes').insert(insert)
      if (error) {
        console.error('Plant attributes insert error:', error)
        return 'Fout bij het opslaan van plantgegevens'
      }
      return null
    }
    case 'cut_flower': {
      const insert: CutFlowerAttributesInsert = {
        product_id: productId,
        ...attributes,
      }
      const { error } = await supabase.from('cut_flower_attributes').insert(insert)
      if (error) {
        console.error('Cut flower attributes insert error:', error)
        return 'Fout bij het opslaan van snijbloem-gegevens'
      }
      return null
    }
    case 'accessory': {
      const insert: AccessoryInsert = {
        product_id: productId,
        accessory_type: (attributes as { accessory_type: string }).accessory_type,
        ...attributes,
      }
      const { error } = await supabase.from('accessories').insert(insert)
      if (error) {
        console.error('Accessory insert error:', error)
        return 'Fout bij het opslaan van accessoire-gegevens'
      }
      return null
    }
  }
}

/**
 * Upsert type-specifieke attributen voor een bestaand product.
 * Als er al een record bestaat, wordt het bijgewerkt. Anders wordt een nieuw record aangemaakt.
 */
async function upsertAttributes(
  supabase: ReturnType<typeof createAdminClient>,
  productType: 'plant' | 'cut_flower' | 'accessory',
  productId: string,
  attributes: Record<string, unknown>
): Promise<string | null> {
  switch (productType) {
    case 'plant': {
      const upsertData: PlantAttributesInsert = {
        product_id: productId,
        ...attributes,
      }
      const { error } = await supabase
        .from('plant_attributes')
        .upsert(upsertData, { onConflict: 'product_id' })
      if (error) {
        console.error('Plant attributes upsert error:', error)
        return 'Fout bij het bijwerken van plantgegevens'
      }
      return null
    }
    case 'cut_flower': {
      const upsertData: CutFlowerAttributesInsert = {
        product_id: productId,
        ...attributes,
      }
      const { error } = await supabase
        .from('cut_flower_attributes')
        .upsert(upsertData, { onConflict: 'product_id' })
      if (error) {
        console.error('Cut flower attributes upsert error:', error)
        return 'Fout bij het bijwerken van snijbloem-gegevens'
      }
      return null
    }
    case 'accessory': {
      const upsertData: AccessoryInsert = {
        product_id: productId,
        accessory_type: (attributes as { accessory_type: string }).accessory_type,
        ...attributes,
      }
      const { error } = await supabase
        .from('accessories')
        .upsert(upsertData, { onConflict: 'product_id' })
      if (error) {
        console.error('Accessory upsert error:', error)
        return 'Fout bij het bijwerken van accessoire-gegevens'
      }
      return null
    }
  }
}
