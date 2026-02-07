---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: [product-brief.md, shopify-content-generator-codebase]
workflowType: 'architecture'
project_name: 'demo-content-generator-floriday'
user_name: 'Kenny'
date: '2026-02-06'
---

# Architecture Decision Document: Floriday Content Generator

## 1. Project Context & Scope

### Samenvatting
Een **werkende demo** van een AI-powered content generator voor het Floriday platform. De tool genereert 8 professionele foto-types vanuit één productfoto, met live AI-generatie via Google Gemini. Doelgroep: niet-technische kwekerijmedewerkers. Volledig Nederlandse UI.

### Input documenten
- **Product Brief** (`product-brief.md`) — Volledige feature-omschrijving, UX richtlijnen, data model
- **Shopify Content Generator** — Referentie-implementatie (Next.js 16 + Gemini + Supabase + Inngest)

### Scope-afbakening
| In scope | Buiten scope |
|---|---|
| Dummy data (JSON) | Echte Floriday API |
| Live AI generatie (Gemini) | Gebruikersbeheer / auth |
| Logo overlay (Canvas API) | Batch verwerking meerdere producten |
| Sync simulatie (mock) | Prompt editing door gebruikers |
| Single-page product detail | Database (Supabase) |
| Vercel deploy | Inngest / queue systemen |

---

## 2. Tech Stack — Geverifieerde Versies

| Technologie | Versie | Rol | Bron |
|---|---|---|---|
| **Next.js** | 16.1 | App Router, API routes, SSR | [nextjs.org](https://nextjs.org/blog/next-16-1) |
| **React** | 19 | UI rendering | Meegeleverd met Next.js 16 |
| **TypeScript** | 5.7+ | Type safety | |
| **Tailwind CSS** | 4.1 | Utility-first styling, CSS-first config | [tailwindcss.com](https://tailwindcss.com/) |
| **shadcn/ui** | Latest (Feb 2026) | Unified Radix UI package, accessible components | [ui.shadcn.com](https://ui.shadcn.com/docs/changelog) |
| **Motion** | 12.x (framer-motion) | Subtiele animaties, generatie voortgang | [motion.dev](https://motion.dev) |
| **Gemini API** | gemini-3-pro-image-preview | AI image generation (1K/2K/4K) | [ai.google.dev](https://ai.google.dev/gemini-api/docs/models) |
| **@vercel/blob** | 2.1.x | Gegenereerde images opslaan | [vercel.com/docs/vercel-blob](https://vercel.com/docs/vercel-blob) |
| **Lucide React** | Latest | Iconen, consistent met shadcn/ui | |
| **Vercel** | — | Hosting, team: bespoke-automation | [vercel.com](https://vercel.com/bespoke-automation) |

### Bewuste keuzes t.o.v. Shopify tool
| Shopify tool | Deze demo | Reden |
|---|---|---|
| Supabase (PostgreSQL) | JSON file | Geen persistentie nodig voor demo |
| Inngest (queue) | Promise.all in API route | Eenvoudiger, geen worker infra nodig |
| SSE polling (2s interval) | SSE streaming | Realtime voortgang zonder polling |
| React 19 + Next.js 16 | Zelfde | Bewezen patroon, hergebruiken |
| Tailwind v4 + shadcn/ui | Zelfde | Bewezen patroon, hergebruiken |
| Gemini REST API met retry | Zelfde | Bewezen patroon, hergebruiken |

---

## 3. Core Architectural Decisions

### 3.1 Data Architecture

**Besluit: Statisch JSON + Runtime State + Vercel Blob**

| Laag | Technologie | Doel |
|---|---|---|
| Product catalogus | `src/data/products.json` | 36 dummy producten, read-only |
| Runtime state | React state (useState/useReducer) | Generatie status, review state |
| Image opslag | Vercel Blob | Gegenereerde images persistent opslaan |
| Gebruikersinstellingen | localStorage | Logo, voorkeuren |

**Geen database.** Dit is een demo — alle productdata is hardcoded. Gegenereerde images worden opgeslagen in Vercel Blob zodat ze beschikbaar blijven na page refresh.

**Data validatie**: Zod schemas voor API request/response validation.

### 3.2 Authenticatie & Security

**Besluit: Geen authenticatie**

Dit is een demo zonder multi-user. Security-overwegingen:

| Concern | Aanpak |
|---|---|
| Gemini API key | Server-side only (env var `GEMINI_API_KEY`) |
| Vercel Blob token | Server-side only (env var `BLOB_READ_WRITE_TOKEN`) |
| CORS | Standaard Next.js (same-origin) |
| Rate limiting | Niet nodig voor demo — Gemini API heeft eigen limits |
| Input sanitatie | Zod validation op API inputs |

### 3.3 API & Communicatie

**Besluit: Next.js API Routes + Server-Sent Events (SSE)**

#### API Routes

| Route | Method | Doel |
|---|---|---|
| `/api/generate` | POST | Start batch generatie, retourneert SSE stream |
| `/api/upload` | POST | Upload logo of source image naar Vercel Blob |
| `/api/images/[id]` | GET | Haal gegenereerde image op |
| `/api/images/[id]` | DELETE | Verwijder gegenereerde image |

#### SSE Protocol (generatie voortgang)

```typescript
// Client → Server: POST /api/generate
{
  productId: string
  sourceImageUrl: string
  imageTypes: ImageType[]
  settings: {
    aspectRatio: AspectRatio
    resolution: ImageSize
  }
}

// Server → Client: SSE stream
event: status
data: {"type": "batch-start", "totalJobs": 7}

event: job-start
data: {"jobId": "1", "imageType": "white-background"}

event: job-complete
data: {"jobId": "1", "imageType": "white-background", "imageUrl": "https://...blob.vercel-storage.com/..."}

event: job-error
data: {"jobId": "2", "imageType": "measuring-tape", "error": "Gemini API timeout"}

event: status
data: {"type": "batch-complete", "successCount": 6, "failedCount": 1}
```

#### Error Response Format

```typescript
{
  error: string        // Korte foutmelding
  code: string         // Machine-readable code: "GEMINI_TIMEOUT" | "INVALID_INPUT" | "BLOB_ERROR"
  details?: unknown    // Extra context voor debugging
}
```

### 3.4 Frontend Architecture

**Besluit: Next.js App Router + React State + shadcn/ui**

#### Rendering strategie

| Route | Rendering | Reden |
|---|---|---|
| `/` (catalogus) | Static (SSG) | Productdata is statisch JSON |
| `/product/[id]` | Dynamic (client-heavy) | Veel interactie, state, SSE |
| `/settings` | Client | localStorage interactie |

#### State Management

**Geen externe state library.** React 19 `useState` + `useReducer` is voldoende:

| State | Scope | Type |
|---|---|---|
| Product data | Page-level | Props van server component |
| Geselecteerde foto-types | Component (ImageTypeSelector) | `useState<Set<ImageType>>` |
| Generatie voortgang | Component (GenerationPanel) | `useReducer` met SSE events |
| Gegenereerde images | Component (ReviewPanel) | `useState<GeneratedImage[]>` |
| Review status | Component (ReviewPanel) | `useState<Map<string, ReviewStatus>>` |
| Logo & voorkeuren | Custom hook (useGrowerSettings) | localStorage + `useState` |

#### Component architectuur

**Feature-based organisatie** — components gegroepeerd per feature/sectie van de product page:

```
components/
├── ui/               ← shadcn/ui primitives (Button, Card, Dialog, etc.)
├── catalog/          ← Cataloguspagina components
├── product/          ← Product detail page sections
├── logo-overlay/     ← Logo editor
└── shared/           ← Herbruikbare cross-feature components
```

### 3.5 Infrastructure & Deployment

**Besluit: Vercel (team bespoke-automation)**

| Aspect | Keuze |
|---|---|
| Hosting | Vercel (Hobby of Pro tier) |
| Build | `next build` via Vercel |
| Environment vars | Vercel Dashboard: `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN` |
| Domain | Vercel auto-generated (`.vercel.app`) |
| CDN | Vercel Edge Network (automatisch) |
| Monitoring | Vercel Analytics (ingebouwd) |
| CI/CD | Git push → auto deploy |

#### Vercel-specifieke overwegingen

| Concern | Aanpak |
|---|---|
| API route timeout | Max 60s op Hobby, 300s op Pro. Gemini calls kunnen 30-180s duren → **Pro tier aanbevolen** |
| Streaming | Next.js API routes met `ReadableStream` — Vercel ondersteunt dit native |
| Vercel Blob limits | 500MB gratis, 1TB Pro. Voldoende voor demo |
| Cold starts | Minimal impact — API routes starten snel |

---

## 4. Implementation Patterns & Consistency Rules

### 4.1 Naming Patterns

#### Bestanden & Directories
| Type | Conventie | Voorbeeld |
|---|---|---|
| React components | `kebab-case.tsx` | `product-card.tsx` |
| Component exports | `PascalCase` | `export function ProductCard()` |
| Utility files | `kebab-case.ts` | `cart-calculator.ts` |
| API routes | `route.ts` in directory | `api/generate/route.ts` |
| Types files | `kebab-case.ts` | `types.ts` |
| Hooks | `use-kebab-case.ts` | `use-grower-settings.ts` |
| Constants | `kebab-case.ts` | `prompts.ts` |

#### Code Naming
| Type | Conventie | Voorbeeld |
|---|---|---|
| Functions | `camelCase` | `generateProductImage()` |
| Variables | `camelCase` | `const imageUrl = ...` |
| Constants (top-level) | `UPPER_SNAKE_CASE` | `const DEFAULT_ASPECT_RATIO = "1:1"` |
| Types/Interfaces | `PascalCase` | `interface Product { }` |
| Enums/Union types | `PascalCase` + `kebab-case` values | `type ImageType = "white-background" \| "measuring-tape"` |
| CSS classes | Tailwind utilities | `className="flex items-center gap-2"` |
| Event handlers | `handle` + `PascalCase` | `handleGenerateClick` |

#### API Naming
| Type | Conventie | Voorbeeld |
|---|---|---|
| Endpoints | `/api/kebab-case` | `/api/generate`, `/api/upload` |
| Query params | `camelCase` | `?imageType=white-background` |
| JSON response fields | `camelCase` | `{ imageUrl: "...", imageType: "..." }` |
| SSE event names | `kebab-case` | `event: job-complete` |

### 4.2 Structure Patterns

#### Import volgorde
```typescript
// 1. React/Next.js
import { useState } from "react"
import Image from "next/image"

// 2. Externe packages
import { motion } from "framer-motion"

// 3. shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// 4. Project components
import { ProductCard } from "@/components/catalog/product-card"

// 5. Lib/utils
import { generateImage } from "@/lib/gemini/client"
import type { Product } from "@/lib/types"

// 6. Data
import products from "@/data/products.json"
```

#### Component structuur
```typescript
// 1. Imports (zie volgorde boven)
// 2. Types (component-specifiek)
// 3. Constants
// 4. Component function
// 5. Helper functions (indien lokaal)
// 6. Default export (indien nodig)

interface ProductCardProps {
  product: Product
  onSelect: (id: string) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  // hooks eerst
  const [isHovered, setIsHovered] = useState(false)

  // handlers
  function handleClick() {
    onSelect(product.id)
  }

  // render
  return (
    <Card onClick={handleClick}>
      {/* ... */}
    </Card>
  )
}
```

### 4.3 Format Patterns

#### API Response Format
```typescript
// Success (generatie)
// → SSE stream (zie sectie 3.3)

// Success (upload)
{ url: string }

// Success (images list)
{ images: GeneratedImage[] }

// Error (altijd)
{ error: string, code: string, details?: unknown }
```

#### Date/Time Format
- JSON: ISO 8601 strings (`2026-02-06T14:30:00Z`)
- UI weergave: Nederlandse locale (`6 februari 2026, 14:30`)

### 4.4 Process Patterns

#### Loading States
```typescript
type GenerationStatus =
  | { state: "idle" }
  | { state: "generating"; progress: number; currentJob: string }
  | { state: "completed"; results: GeneratedImage[] }
  | { state: "error"; error: string; partialResults: GeneratedImage[] }
```

Alle loading states zijn **lokaal per component** — geen globale loading state.

#### Error Handling
| Laag | Aanpak |
|---|---|
| API routes | try/catch → JSON error response met code |
| Gemini calls | Retry (3x, exponential backoff 5-30s) → fallback error |
| SSE stream | `job-error` event per mislukte job, stream gaat door |
| Frontend | Error state per component, toast notificaties (sonner) |
| Blob uploads | Retry 1x → error toast |

#### Retry Pattern (Gemini)
```typescript
// Bewezen patroon uit Shopify tool
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 5000,     // 5s
  maxDelay: 30000,     // 30s
  timeout: 180000,     // 3 min standaard
  timeout4K: 300000,   // 5 min voor 4K
}
```

---

## 5. Project Structure & Boundaries

### 5.1 Complete Directory Structure

```
demo-content-generator-floriday/
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.local                              # GEMINI_API_KEY, BLOB_READ_WRITE_TOKEN
├── .env.example                            # Template zonder secrets
├── .gitignore
├── postcss.config.mjs                      # Tailwind v4
│
├── src/
│   ├── app/
│   │   ├── globals.css                     # Tailwind imports + kleurenpalet CSS vars
│   │   ├── layout.tsx                      # Root layout: font, nav, theme
│   │   ├── page.tsx                        # Catalogus pagina (SSG)
│   │   │
│   │   ├── product/
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Product detail (server component wrapper)
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx                    # Logo upload + voorkeuren
│   │   │
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts                # POST → SSE stream (generatie pipeline)
│   │       ├── upload/
│   │       │   └── route.ts                # POST → Vercel Blob upload
│   │       └── images/
│   │           └── [id]/
│   │               └── route.ts            # GET/DELETE gegenereerde image
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn/ui (Button, Card, Dialog, Badge,
│   │   │   ├── button.tsx                  #   Checkbox, Select, Progress, Tooltip,
│   │   │   ├── card.tsx                    #   Sheet, Tabs, Toggle, Separator, etc.)
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx                  # Top navigatie: logo, nav links
│   │   │   └── footer.tsx                  # Simpele footer
│   │   │
│   │   ├── catalog/
│   │   │   ├── product-card.tsx            # Product card in grid (foto, naam, specs)
│   │   │   ├── product-grid.tsx            # Responsive grid + zoeken/filteren
│   │   │   └── search-filter-bar.tsx       # Zoekbalk + categorie filter
│   │   │
│   │   ├── product/
│   │   │   ├── product-detail-client.tsx   # Client wrapper: alle state & interactie
│   │   │   ├── product-header.tsx          # Naam, specs, belading info
│   │   │   ├── step-indicator.tsx          # Visuele 5-stappen gids
│   │   │   ├── source-image-selector.tsx   # Catalogus foto of upload
│   │   │   ├── image-type-selector.tsx     # Foto-type cards met toggles
│   │   │   ├── generation-settings.tsx     # Aspect ratio, resolutie dropdowns
│   │   │   ├── generate-button.tsx         # "Genereer X foto's" CTA
│   │   │   ├── generation-progress.tsx     # Voortgangsbalk + per-job status
│   │   │   ├── generated-images-grid.tsx   # Review grid: approve/reject per foto
│   │   │   ├── floriday-current.tsx        # Mock: "Huidig op Floriday" sectie
│   │   │   └── floriday-sync.tsx           # Sync selectie + "Push naar Floriday"
│   │   │
│   │   ├── logo-overlay/
│   │   │   └── logo-editor.tsx             # Canvas-based logo plaatser
│   │   │
│   │   └── shared/
│   │       ├── image-lightbox.tsx          # Fullscreen image viewer
│   │       ├── image-card.tsx              # Herbruikbare image card met status badge
│   │       └── confirm-dialog.tsx          # Bevestigingsdialoog
│   │
│   ├── lib/
│   │   ├── gemini/
│   │   │   ├── client.ts                   # Gemini REST API client (retry, timeout)
│   │   │   ├── prompts.ts                  # Prompt templates + variabele substitutie
│   │   │   └── types.ts                    # Gemini API request/response types
│   │   │
│   │   ├── generation/
│   │   │   ├── pipeline.ts                 # Orchestratie: dependency chain, parallel exec
│   │   │   ├── cart-calculator.ts          # DC plank-layout berekening
│   │   │   └── composite-builder.ts        # Canvas API: detail inset + logo compositing
│   │   │
│   │   ├── blob/
│   │   │   └── storage.ts                  # Vercel Blob upload/delete helpers
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-generation.ts           # SSE consumer hook voor generatie
│   │   │   ├── use-grower-settings.ts      # localStorage hook voor logo/voorkeuren
│   │   │   └── use-image-review.ts         # Review state management hook
│   │   │
│   │   ├── types.ts                        # Alle TypeScript types/interfaces
│   │   ├── schemas.ts                      # Zod schemas voor API validation
│   │   ├── utils.ts                        # Helpers: formatters, belading parser
│   │   └── constants.ts                    # Image types config, aspect ratios, etc.
│   │
│   └── data/
│       └── products.json                   # 36 dummy producten uit Floriday
│
└── public/
    └── images/
        ├── products/                       # Placeholder product images
        ├── examples/                       # Voorbeeld-thumbnails per foto-type
        └── logo-placeholder.svg            # Default logo placeholder
```

### 5.2 Architectural Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (Client)                                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Catalogus    │  │ Product      │  │ Settings      │ │
│  │ Page         │  │ Detail Page  │  │ Page          │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                  │                   │         │
│  ┌──────┴──────────────────┴───────────────────┴──────┐ │
│  │              Shared Components / Hooks              │ │
│  │  (image-lightbox, use-generation, use-settings)     │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │ fetch / SSE                  │
├───────────────────────────┼─────────────────────────────┤
│  SERVER (Next.js API Routes)                             │
│                           │                              │
│  ┌────────────────────────┴───────────────────────────┐ │
│  │              API Routes Layer                       │ │
│  │  /api/generate  │  /api/upload  │  /api/images/[id]│ │
│  └────────┬────────┴──────┬────────┴────────┬─────────┘ │
│           │               │                  │           │
│  ┌────────┴────────┐ ┌────┴─────┐  ┌────────┴────────┐ │
│  │ Generation      │ │ Blob     │  │ Blob            │ │
│  │ Pipeline        │ │ Storage  │  │ Storage         │ │
│  │ (pipeline.ts)   │ │ Upload   │  │ Read/Delete     │ │
│  └────────┬────────┘ └──────────┘  └─────────────────┘ │
│           │                                              │
│  ┌────────┴────────┐                                    │
│  │ Gemini Client   │                                    │
│  │ (client.ts)     │                                    │
│  │ Retry + Timeout │                                    │
│  └────────┬────────┘                                    │
├───────────┼─────────────────────────────────────────────┤
│  EXTERNAL │                                              │
│           │                                              │
│  ┌────────┴────────┐  ┌──────────────────────────────┐ │
│  │ Google Gemini   │  │ Vercel Blob Storage          │ │
│  │ API             │  │                              │ │
│  └─────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Data Flow: Generatie Pipeline

```
Gebruiker klikt "Genereer X foto's"
         │
         ▼
┌─ POST /api/generate ──────────────────────────────┐
│                                                     │
│  1. Valideer input (Zod)                           │
│  2. Open SSE stream                                │
│  3. Haal product data op (products.json)           │
│  4. Bouw prompts (prompts.ts + product context)    │
│                                                     │
│  ┌─ FASE 1: Witte achtergrond (sequentieel) ─────┐│
│  │ Gemini API call → base64 image → Blob upload  ││
│  │ SSE: job-start → job-complete                  ││
│  └────────────────────────────────────────────────┘│
│         │                                           │
│         ▼ (witte achtergrond als input)             │
│  ┌─ FASE 2: Overige types (parallel) ────────────┐│
│  │ Promise.allSettled([                            ││
│  │   generateMeasuringTape(whiteImg, product),    ││
│  │   generateDetail(whiteImg, product),           ││
│  │   generateTray(whiteImg, product),    // cond. ││
│  │   generateLifestyle(whiteImg, product),        ││
│  │   generateSeasonal(whiteImg, product),// cond. ││
│  │   generateDanishCart(whiteImg, product),       ││
│  │ ])                                              ││
│  │ Per job: SSE events (start/complete/error)     ││
│  └────────────────────────────────────────────────┘│
│         │                                           │
│         ▼                                           │
│  ┌─ FASE 3: Composiet (sequentieel, optioneel) ──┐│
│  │ Canvas API: white-bg + detail inset + logo    ││
│  │ (Dit kan server-side met node-canvas of       ││
│  │  client-side na ontvangst van beide images)   ││
│  └────────────────────────────────────────────────┘│
│                                                     │
│  SSE: batch-complete                               │
│  Stream sluiten                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Feature → File Mapping

| Feature | Components | Lib | API |
|---|---|---|---|
| **Catalogus** | `catalog/*` | `types.ts`, `utils.ts` | — (SSG) |
| **Product header** | `product/product-header.tsx`, `product/step-indicator.tsx` | `types.ts` | — |
| **Source selectie** | `product/source-image-selector.tsx` | — | `api/upload/route.ts` |
| **Type selectie** | `product/image-type-selector.tsx` | `constants.ts` | — |
| **Generatie** | `product/generate-button.tsx`, `product/generation-progress.tsx` | `hooks/use-generation.ts`, `generation/pipeline.ts`, `gemini/*` | `api/generate/route.ts` |
| **Review** | `product/generated-images-grid.tsx` | `hooks/use-image-review.ts` | `api/images/[id]/route.ts` |
| **Logo overlay** | `logo-overlay/logo-editor.tsx` | `generation/composite-builder.ts`, `hooks/use-grower-settings.ts` | `api/upload/route.ts` |
| **Floriday sync** | `product/floriday-current.tsx`, `product/floriday-sync.tsx` | — | — (mock) |
| **Instellingen** | `settings/page.tsx` | `hooks/use-grower-settings.ts` | `api/upload/route.ts` |

---

## 6. Gemini API Integratie (Detail)

### 6.1 Client Architecture

```typescript
// lib/gemini/client.ts — Kernstructuur

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent"

interface GeminiRequest {
  contents: [{
    parts: (
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }  // base64
    )[]
  }]
  generationConfig: {
    responseModalities: ["Text", "Image"]
    imageConfig?: {
      aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16"
      imageSize?: "1024" | "2048" | "4096"
    }
  }
}

interface GeminiResponse {
  candidates: [{
    content: {
      parts: (
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      )[]
    }
  }]
}
```

### 6.2 Prompt Variabelen

Alle prompts gebruiken `{{variabele}}` syntax, vervangen door:

| Variabele | Bron | Voorbeeld |
|---|---|---|
| `{{plantName}}` | `product.name` (zonder "ARTIFICIAL" prefix) | "Ficus Benjamina" |
| `{{plantHeight}}` | `product.plantHeight` | "180" |
| `{{potDiameter}}` | `product.potDiameter` | "21" |
| `{{heightDescription}}` | Berekend uit plantHeight | "a tall floor-standing plant" |
| `{{plantsPerLayer}}` | `product.carrier.perLayer` | "10" |
| `{{layers}}` | `product.carrier.layers` | "2" |
| `{{trayGrid}}` | Berekend uit potDiameter | "4×3" |

### 6.3 Height-to-Description Mapping

```typescript
function getHeightDescription(heightCm: number): string {
  if (heightCm <= 40)  return "a small tabletop plant"
  if (heightCm <= 80)  return "a medium-sized plant"
  if (heightCm <= 120) return "a tall floor-standing plant"
  if (heightCm <= 160) return "a large floor-standing plant"
  return "a very tall statement plant"
}
```

---

## 7. Composiet & Logo Overlay (Canvas API)

### 7.1 Composiet Builder

De composiet foto combineert:
1. **Witte achtergrond foto** (volledig beeld)
2. **Detail inset** (cirkel, ~25% beeldbreedte, links-onder)
3. **Logo** (optioneel, configureerbare positie)

```typescript
// lib/generation/composite-builder.ts

interface CompositeConfig {
  baseImage: string          // URL van white-bg foto
  detailImage: string        // URL van detail foto
  logoImage?: string         // URL van logo (optioneel)
  logoPosition: LogoPosition // "top-left" | "top-right" | "bottom-left" | "bottom-right"
  insetSize: number          // Percentage van beeldbreedte (default: 25)
}
```

### 7.2 Logo Editor

- Canvas-based editor op de Settings pagina
- Drag & drop logo upload
- Preview op een voorbeeld-foto
- Positie kiezen via 4 knoppen (hoeken)
- Logo wordt opgeslagen als base64 in localStorage

---

## 8. Conditionele Logica

### 8.1 Foto-type beschikbaarheid

```typescript
function getAvailableImageTypes(product: Product): ImageTypeConfig[] {
  return ALL_IMAGE_TYPES.map(type => ({
    ...type,
    enabled: true,
    available: isTypeAvailable(type.id, product),
    disabledReason: getDisabledReason(type.id, product),
  }))
}

function isTypeAvailable(type: ImageType, product: Product): boolean {
  switch (type) {
    case "tray":
      return product.potDiameter >= 20
    case "seasonal":
      return !product.isArtificial && product.canBloom
    case "composite":
      return true  // Optioneel, niet standaard aan
    default:
      return true
  }
}

function getDisabledReason(type: ImageType, product: Product): string | null {
  switch (type) {
    case "tray":
      if (product.potDiameter < 20)
        return `Tray niet beschikbaar bij potmaat ${product.potDiameter}cm (minimaal 20cm)`
    case "seasonal":
      if (product.isArtificial)
        return "Seizoensfoto niet beschikbaar voor kunstplanten"
    default:
      return null
  }
}
```

### 8.2 Default selectie

- Alle beschikbare types: **standaard AAN**
- `composite`: **standaard UIT** (optioneel, kweker vinkt handmatig aan)
- Niet-beschikbare types: **disabled met tooltip uitleg**

---

## 9. Deense Container Berekening

### 9.1 Input Data

Uit het `carrier` veld van elk product:
```typescript
interface Carrier {
  fustCode: number     // 800 | 212 | 206
  fustType: string     // "Aanvoer zonder fust" | "Tray" | "Doos"
  carriageType: string // "DC"
  layers: number       // Aantal lagen per DC
  perLayer: number     // Stuks per laag
  units: number        // Aantal DC's
}
```

### 9.2 DC Specificaties

```typescript
const DC_SPECS = {
  width: 1350,        // mm (buitenmaat)
  depth: 565,         // mm (buitenmaat)
  height: 1900,       // mm (buitenmaat)
  shelfWidth: 1275,   // mm (bruikbaar oppervlak)
  shelfDepth: 545,    // mm (bruikbaar oppervlak)
  maxShelves: 6,      // Maximaal aantal planken
  heightHoles: 30,    // Hoogte-instelgaten
}
```

### 9.3 Prompt Context Builder

De AI ontvangt concrete context over de kar-opstelling:
```typescript
function buildCartPromptContext(product: Product): string {
  const { layers, perLayer } = product.carrier
  const totalPlants = layers * perLayer

  return `
    Show ${perLayer} plants per shelf across ${layers} shelves
    (${totalPlants} plants total) on a Danish trolley.
    Each plant is ${product.plantHeight}cm tall in a ${product.potDiameter}cm pot.
    The trolley is 1350mm wide × 565mm deep × 1900mm tall.
  `
}
```

---

## 10. Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@vercel/blob": "^2.1.0",
    "framer-motion": "^12.31.0",
    "lucide-react": "latest",
    "sonner": "latest",
    "zod": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "postcss": "latest"
  }
}
```

> **Note**: shadcn/ui components worden geïnstalleerd via `npx shadcn@latest add [component]` — geen package dependency.

---

## 11. Validation Checklist

### Requirements Coverage

| Requirement (uit Product Brief) | Architectuur component | Status |
|---|---|---|
| Catalogus met zoeken/filteren | `catalog/*` + SSG page | ✅ |
| Product detail single-page | `product/*` + client wrapper | ✅ |
| 8 foto-types generatie | `generation/pipeline.ts` + `gemini/*` | ✅ |
| Conditionele logica (tray/seasonal) | `constants.ts` + `image-type-selector.tsx` | ✅ |
| Witte achtergrond eerst, dan parallel | `generation/pipeline.ts` (2-fase) | ✅ |
| SSE realtime voortgang | `api/generate/route.ts` + `hooks/use-generation.ts` | ✅ |
| Review (approve/reject) | `product/generated-images-grid.tsx` + `hooks/use-image-review.ts` | ✅ |
| Logo overlay (Canvas) | `logo-overlay/logo-editor.tsx` + `generation/composite-builder.ts` | ✅ |
| Sync naar Floriday (mock) | `product/floriday-sync.tsx` | ✅ |
| Stappen-indicator | `product/step-indicator.tsx` | ✅ |
| Nederlandse UI | Hardcoded NL teksten in components | ✅ |
| Vercel deploy | Next.js 16, Vercel team bespoke-automation | ✅ |
| Dummy data (36 producten) | `data/products.json` | ✅ |
| Gemini 3 Pro Image Preview | `gemini/client.ts` + retry logica | ✅ |
| Lightbox groot bekijken | `shared/image-lightbox.tsx` | ✅ |
| Aspect ratio / resolutie keuze | `product/generation-settings.tsx` | ✅ |

### Cross-Cutting Concerns

| Concern | Aanpak | Gevalideerd |
|---|---|---|
| Error handling | Per-laag strategie (API, Gemini, SSE, UI) | ✅ |
| Performance | SSG catalogus, lazy loading images, parallel generatie | ✅ |
| Security | Server-side API keys, Zod validation | ✅ |
| Accessibility | shadcn/ui (Radix primitives = ARIA compliant) | ✅ |
| Responsive | Tailwind responsive classes, desktop-first | ✅ |
| Nederlandse taal | Hardcoded NL strings, geen i18n overhead | ✅ |

### Architectural Coherence

| Check | Status |
|---|---|
| Geen circulaire dependencies tussen modules | ✅ |
| Data flow is unidirectioneel (server → client via SSE) | ✅ |
| Alle externe calls (Gemini, Blob) zijn server-side | ✅ |
| State management is proportioneel (geen overkill) | ✅ |
| Project structuur matcht de tech stack conventies | ✅ |
| Deployment model is compatible met Vercel limits | ⚠️ Pro tier aanbevolen voor API timeouts |

---

## 12. Implementatie Volgorde

### Fase 1: Fundament
1. Next.js project init (`npx create-next-app@latest`)
2. Tailwind v4 + shadcn/ui setup
3. Kleurenpalet als CSS custom properties
4. Layout component (header, footer)
5. `products.json` laden + types definiëren
6. Cataloguspagina (grid + zoeken)
7. Product detail page (lege structuur)
8. Vercel deploy (initieel)

### Fase 2: AI Engine
1. Gemini client (`lib/gemini/client.ts`) met retry
2. Prompt templates (`lib/gemini/prompts.ts`)
3. Generation pipeline (`lib/generation/pipeline.ts`)
4. SSE API route (`api/generate/route.ts`)
5. Vercel Blob integratie (`lib/blob/storage.ts`)

### Fase 3: Product Page Interactie
1. Source image selector
2. Image type selector cards met conditionele logica
3. Generation settings (aspect ratio, resolutie)
4. `use-generation` hook (SSE consumer)
5. Generate button + progress UI
6. Generated images review grid

### Fase 4: Polish & Features
1. Logo upload + logo editor (Canvas)
2. Composiet builder
3. Floriday sync simulatie
4. Stappen-indicator
5. Lightbox
6. Toast notificaties (sonner)
7. Motion animaties
8. Nederlandse teksten review
9. Responsive tweaks

---

*Dit document is het resultaat van de architecture solutioning sessie op 2026-02-06, gebaseerd op de Product Brief en analyse van de Shopify Content Generator referentie-implementatie.*
