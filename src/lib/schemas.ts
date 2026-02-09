import { z } from "zod"

export const generateRequestSchema = z.object({
  productId: z.string().min(1),
  sourceImageUrl: z.string().url(),
  imageTypes: z.array(
    z.enum([
      "white-background",
      "measuring-tape",
      "detail",
      "composite",
      "tray",
      "lifestyle",
      "seasonal",
      "danish-cart",
    ])
  ).min(1),
  settings: z.object({
    aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16"]).default("1:1"),
    resolution: z.enum(["1024", "2048", "4096"]).default("1024"),
  }),
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>

export const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
})

// ============================================
// Organization Schemas
// ============================================

export const organizationUpdateSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht').optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug mag alleen kleine letters, cijfers en streepjes bevatten').optional(),
  billing_email: z.union([z.string().email('Ongeldig e-mailadres'), z.literal(''), z.null()]).optional(),
  logo_url: z.string().url().nullable().optional(),
})

export const businessTypesSchema = z.array(
  z.enum(['grower', 'wholesaler', 'retailer'], { message: 'Ongeldig bedrijfstype' })
)

export const inviteMemberSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  role: z.enum(['admin', 'member'], { message: 'Ongeldige rol' }),
})

export const sceneCreateSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  scene_type: z.enum(['interior', 'exterior', 'studio', 'commercial', 'seasonal', 'custom'], { message: 'Ongeldig scene type' }),
  description: z.string().optional(),
  prompt_template: z.string().min(1, 'Sfeer beschrijving is verplicht'),
})

export const combinationCreateSchema = z.object({
  productId: z.string().uuid('Ongeldig product ID'),
  accessoryId: z.string().uuid('Ongeldig accessoire ID'),
  sceneTemplateId: z.string().uuid('Ongeldig scene template ID').optional(),
  notes: z.string().max(500, 'Notitie mag maximaal 500 tekens zijn').optional(),
})
