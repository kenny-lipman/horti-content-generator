/**
 * Horti Content Generator — Convenience Types
 * Re-exports from auto-generated database.types.ts
 *
 * Regenereer database.types.ts met:
 * npx supabase gen types typescript --project-id jezipswnfifwxqsmpzwr --schema horti
 */

export type { Database, Json } from './database.types'
export type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

import type { Database } from './database.types'

// ============================================
// Schema shorthand
// ============================================
type HortiSchema = Database['horti']['Tables']

// ============================================
// Row types (voor lezen)
// ============================================
export type Organization = HortiSchema['organizations']['Row']
export type OrganizationBusinessType = HortiSchema['organization_business_types']['Row']
export type OrganizationMember = HortiSchema['organization_members']['Row']
export type OrganizationModule = HortiSchema['organization_modules']['Row']

export type SubscriptionPlan = HortiSchema['subscription_plans']['Row']
export type Subscription = HortiSchema['subscriptions']['Row']
export type GenerationUsage = HortiSchema['generation_usage']['Row']

export type Product = HortiSchema['products']['Row']
export type PlantAttributes = HortiSchema['plant_attributes']['Row']
export type RetailAttributes = HortiSchema['retail_attributes']['Row']
export type CutFlowerAttributes = HortiSchema['cut_flower_attributes']['Row']
export type Accessory = HortiSchema['accessories']['Row']

export type SourceImage = HortiSchema['source_images']['Row']
export type GeneratedImage = HortiSchema['generated_images']['Row']
export type ImageVariant = HortiSchema['image_variants']['Row']
export type GenerationJob = HortiSchema['generation_jobs']['Row']

export type SceneTemplate = HortiSchema['scene_templates']['Row']
export type ProductCombination = HortiSchema['product_combinations']['Row']

export type Integration = HortiSchema['integrations']['Row']
export type IntegrationProductMapping = HortiSchema['integration_product_mappings']['Row']
export type IntegrationSyncLog = HortiSchema['integration_sync_logs']['Row']

export type ImportTemplate = HortiSchema['import_templates']['Row']
export type ImportJob = HortiSchema['import_jobs']['Row']

export type Notification = HortiSchema['notifications']['Row']

// ============================================
// Insert types (voor aanmaken)
// ============================================
export type ProductInsert = HortiSchema['products']['Insert']
export type PlantAttributesInsert = HortiSchema['plant_attributes']['Insert']
export type RetailAttributesInsert = HortiSchema['retail_attributes']['Insert']
export type CutFlowerAttributesInsert = HortiSchema['cut_flower_attributes']['Insert']
export type AccessoryInsert = HortiSchema['accessories']['Insert']
export type SourceImageInsert = HortiSchema['source_images']['Insert']
export type GeneratedImageInsert = HortiSchema['generated_images']['Insert']
export type GenerationJobInsert = HortiSchema['generation_jobs']['Insert']
export type GenerationJobUpdate = HortiSchema['generation_jobs']['Update']
export type SceneTemplateInsert = HortiSchema['scene_templates']['Insert']
export type SceneTemplateUpdate = HortiSchema['scene_templates']['Update']
export type ProductCombinationInsert = HortiSchema['product_combinations']['Insert']
export type NotificationInsert = HortiSchema['notifications']['Insert']

// ============================================
// Update types (voor wijzigen)
// ============================================
export type ProductUpdate = HortiSchema['products']['Update']
export type PlantAttributesUpdate = HortiSchema['plant_attributes']['Update']
export type RetailAttributesUpdate = HortiSchema['retail_attributes']['Update']
export type CutFlowerAttributesUpdate = HortiSchema['cut_flower_attributes']['Update']
export type AccessoryUpdate = HortiSchema['accessories']['Update']

// ============================================
// Composite types
// ============================================
export interface ProductWithAttributes extends Product {
  plant_attributes: PlantAttributes | null
  retail_attributes: RetailAttributes | null
  cut_flower_attributes: CutFlowerAttributes | null
  accessories: Accessory | null
}

export interface ProductWithImages extends Product {
  source_images: SourceImage[]
  generated_images: GeneratedImage[]
}

export interface CombinationWithDetails extends ProductCombination {
  products: { name: string; sku: string | null; catalog_image_url: string | null } | null
  accessory_product: { name: string; sku: string | null; catalog_image_url: string | null } | null
  scene_templates: { name: string; scene_type: string; thumbnail_url: string | null } | null
  generated_images: Array<{ id: string; image_url: string | null; review_status: string; status: string }> | null
}

// ============================================
// Enum union types (voor type-safe checks)
// ============================================
export type BusinessType = 'grower' | 'wholesaler' | 'retailer'
export type OrgRole = 'admin' | 'member'
export type ModuleType = 'content_generation' | 'ai_texts' | 'video_content' | 'incidents'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'
export type ProductType = 'plant' | 'cut_flower' | 'accessory'
export type AccessoryType = 'pot' | 'vase' | 'stand' | 'basket' | 'cover' | 'decoration' | 'packaging'
export type SourceImageType = 'floor_photo' | 'catalog' | 'custom'
export type GeneratedImageType = 'white_background' | 'measuring_tape' | 'detail' | 'composite' | 'tray' | 'lifestyle' | 'seasonal' | 'danish_cart'
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type ImageFormat = 'png' | 'jpg' | 'webp'
export type ImagePurpose = 'original' | 'web' | 'print' | 'social_instagram_square' | 'social_instagram_portrait' | 'social_facebook' | 'social_pinterest' | 'thumbnail' | 'catalog'
export type SceneType = 'interior' | 'exterior' | 'studio' | 'seasonal' | 'commercial' | 'custom'
export type Platform = 'shopify' | 'woocommerce' | 'floriday'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error'
export type ImportStatus = 'uploaded' | 'validating' | 'processing' | 'completed' | 'failed'
export type NotificationType = 'generation_complete' | 'generation_failed' | 'usage_warning' | 'usage_limit_reached' | 'sync_complete' | 'sync_failed' | 'import_complete' | 'import_failed' | 'system'
