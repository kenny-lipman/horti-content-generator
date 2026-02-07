# Horti Content Generator — Project Instructies

## KRITIEK: Database Configuratie

> **HIER MAG NIET VAN WORDEN AFGEWEKEN!**

| Setting | Waarde |
|---------|--------|
| **Supabase Project ID** | `jezipswnfifwxqsmpzwr` |
| **PostgreSQL Schema** | `horti` |
| **Region** | `eu-central-1` |

### Regels

- **ALLE nieuwe tabellen** worden aangemaakt in het `horti` schema, NIET in `public`
- **NOOIT** tabellen aanmaken of wijzigen in het `public` schema — daar staan legacy tabellen die niet aangeraakt mogen worden
- **ALTIJD** `horti.` prefix gebruiken in SQL queries en migraties
- **ALTIJD** project ID `jezipswnfifwxqsmpzwr` gebruiken voor Supabase MCP calls
- Bij twijfel: vraag Kenny

### Schema Structuur

Het `horti` schema bevat alle tabellen voor de SaaS-applicatie:
- Core: `organizations`, `organization_business_types`, `organization_members`, `organization_modules`
- Billing: `subscription_plans`, `subscriptions`, `generation_usage`
- Products: `products`, `plant_attributes`, `retail_attributes`, `cut_flower_attributes`, `accessories`
- Images: `source_images`, `generated_images`, `image_variants`, `generation_jobs`
- Scenes: `scene_templates`, `product_combinations`
- Integrations: `integrations`, `integration_product_mappings`, `integration_sync_logs`
- Import: `import_templates`, `import_jobs`
- Notifications: `notifications`

### Supabase Client Configuratie

Bij het aanmaken van de Supabase client, gebruik:
```typescript
const supabase = createClient(url, key, {
  db: { schema: 'horti' }
})
```

## Project Context

- **Stack**: Next.js 16.1, React 19, Tailwind v4.1, shadcn/ui, Supabase
- **AI**: Gemini 3 Pro Image Preview (REST API)
- **Storage**: Supabase Storage (NIET Vercel Blob)
- **Brief**: `_bmad/bmm/data/horti-content-generator-brief.md`

### Storage Regels

- **Alle afbeeldingen** (source images, generated images, image variants, logos) via Supabase Storage
- **NIET** Vercel Blob gebruiken — alles in Supabase centraliseren

## Communicatie

- Communiceer met Kenny in het Nederlands
- Technische termen mogen in het Engels
