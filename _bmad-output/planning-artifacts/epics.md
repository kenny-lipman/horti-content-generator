---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [product-brief.md, architecture.md]
date: '2026-02-06'
---

# Floriday Content Generator — Epic Breakdown

## Overview

Een AI-powered content generator die vanuit één productfoto alle benodigde Floriday foto-types genereert. Demo applicatie met live AI generatie (Gemini), 36 dummy producten, en volledige Nederlandse UI.

---

## Requirements Inventory

### Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Productcatalogus weergeven met grid layout |
| FR2 | Zoeken op productnaam of SKU |
| FR3 | Filteren op categorie |
| FR4 | Product detail pagina met alle productinformatie |
| FR5 | Source image selectie (uit catalogus of upload) |
| FR6 | Foto-type selectie via visuele cards (8 types) |
| FR7 | Conditionele logica: tray disabled bij potØ < 20cm |
| FR8 | Conditionele logica: seizoensfoto disabled bij Artificial Plants |
| FR9 | Aspect ratio keuze (1:1, 4:3, 3:4, 16:9, 9:16) |
| FR10 | Resolutie keuze (1K, 2K, 4K) |
| FR11 | AI generatie van witte achtergrond foto |
| FR12 | AI generatie van meetlatfoto |
| FR13 | AI generatie van detailfoto |
| FR14 | AI generatie van tray foto |
| FR15 | AI generatie van sfeerbeeld |
| FR16 | AI generatie van seizoensfoto |
| FR17 | AI generatie van Deense Kar foto |
| FR18 | Witte achtergrond eerst, daarna overige parallel |
| FR19 | Realtime generatie voortgang via SSE |
| FR20 | Review per gegenereerde foto (goedkeuren/afkeuren) |
| FR21 | Foto opnieuw genereren na afkeuring |
| FR22 | Lightbox voor groot bekijken |
| FR23 | Logo upload (eenmalig per kweker) |
| FR24 | Logo overlay op foto's (Canvas API, configureerbare positie) |
| FR25 | Composiet foto (witte bg + detail inset cirkel + logo) |
| FR26 | Stappen-indicator (5 stappen) |
| FR27 | Overzicht huidige Floriday foto's (mock) |
| FR28 | Selectie welke foto's te publiceren |
| FR29 | Sync naar Floriday simulatie (mock) |
| FR30 | Instellingen pagina (logo, voorkeuren) |

### Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR1 | Volledig Nederlandse UI |
| NFR2 | Responsive: desktop (primair) + tablet |
| NFR3 | Catalogus laadt in < 2 seconden |
| NFR4 | Accessible (shadcn/ui Radix primitives = ARIA compliant) |
| NFR5 | Gemini API retry (3x, exponential backoff) |
| NFR6 | Vercel deploy (team bespoke-automation) |
| NFR7 | Warm kleurenpalet (groen/aarde-tinten) |
| NFR8 | Grote klikgebieden (min 48px), niet-technische doelgroep |

### Additional Requirements (Architecture)

| ID | Requirement |
|---|---|
| AR1 | Next.js 16.1 App Router |
| AR2 | Tailwind CSS v4.1 + shadcn/ui |
| AR3 | Vercel Blob voor image opslag |
| AR4 | Zod schemas voor API validation |
| AR5 | SSE streaming (geen polling) |
| AR6 | Dummy data via JSON (geen database) |

---

## FR Coverage Map

| FR | Epic |
|---|---|
| FR1, FR2, FR3 | Epic 1 |
| FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR26 | Epic 2 |
| FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19 | Epic 3 |
| FR20, FR21, FR22 | Epic 4 |
| FR23, FR24, FR25, FR30 | Epic 5 |
| FR27, FR28, FR29 | Epic 6 |
| NFR1-8, AR1-6 | Verspreid over alle epics |

---

## Epic List

| Epic | Titel | User Value |
|---|---|---|
| 1 | Productcatalogus | Kweker kan producten bekijken en doorzoeken |
| 2 | Product Detail & Configuratie | Kweker kan een product selecteren en generatie configureren |
| 3 | AI Foto Generatie | Kweker kan foto's laten genereren met realtime voortgang |
| 4 | Review & Goedkeuring | Kweker kan gegenereerde foto's beoordelen en beheren |
| 5 | Logo & Composiet | Kweker kan bedrijfslogo toevoegen en composiet foto's maken |
| 6 | Publicatie naar Floriday | Kweker kan goedgekeurde foto's publiceren naar Floriday |

---

## Epic 1: Productcatalogus

**Goal:** De kweker kan de productcatalogus openen, producten bekijken in een visueel grid, en zoeken/filteren om snel het juiste product te vinden.

**Covers:** FR1, FR2, FR3, NFR1, NFR2, NFR3, NFR7, NFR8, AR1, AR2, AR6

---

### Story 1.1: Project setup en basis layout

As a **developer**,
I want **een werkend Next.js project met Tailwind en shadcn/ui**,
So that **alle volgende stories op een solide fundament bouwen**.

**Acceptance Criteria:**

**Given** een leeg project directory
**When** het project wordt geïnitialiseerd
**Then** draait `next dev` zonder errors
**And** Tailwind CSS v4 is geconfigureerd met het kleurenpalet uit de product brief:
  - Primair: `#2D6A4F`, Secundair: `#52B788`, Achtergrond: `#FAFAF8`
  - Tekst: `#1B1B1B`, Subtekst: `#6B7280`, Border: `#E5E7EB`
**And** shadcn/ui is geïnstalleerd (Button, Card als eerste components)
**And** het root layout bevat een header met "Floriday Content Generator" titel en navigatie
**And** de header bevat links naar "/" (Catalogus) en "/settings" (Instellingen)
**And** de footer toont "Demo — Niet verbonden met Floriday"
**And** alle UI tekst is in het Nederlands
**And** het project deployt succesvol naar Vercel

**Technical Notes:**
- `npx create-next-app@latest` met App Router, TypeScript, Tailwind
- `npx shadcn@latest init` (new-york style, unified Radix UI)
- CSS custom properties in `globals.css` voor kleurenpalet
- Font: Inter via `next/font`
- `products.json` is reeds aanwezig in `src/data/`

---

### Story 1.2: Product data types en utilities

As a **developer**,
I want **TypeScript types en helper functies voor de product data**,
So that **alle components type-safe met productdata kunnen werken**.

**Acceptance Criteria:**

**Given** het bestand `src/data/products.json` met 36 producten
**When** de types worden gedefinieerd
**Then** bestaat er een `Product` interface met alle velden (id, name, sku, vbnCode, category, carrier, potDiameter, plantHeight, availability, catalogImage, isArtificial, canBloom)
**And** bestaat er een `Carrier` interface (fustCode, fustType, carriageType, layers, perLayer, units)
**And** bestaat er een `ImageType` union type met alle 8 foto-types
**And** bestaat er een `getProducts()` functie die alle producten retourneert
**And** bestaat er een `getProductById(id)` functie
**And** bestaat er een `searchProducts(query)` functie die zoekt op naam en SKU
**And** bestaat er een `filterByCategory(category)` functie
**And** bestaat er een `formatCarrier(carrier)` helper die "800 - 2×10×1 - DC" format retourneert
**And** alle functies zijn correct getypeerd

**Technical Notes:**
- Types in `src/lib/types.ts`
- Helpers in `src/lib/utils.ts`
- `ImageType = "white-background" | "measuring-tape" | "detail" | "composite" | "tray" | "lifestyle" | "seasonal" | "danish-cart"`

---

### Story 1.3: Productcatalogus pagina

As a **kweker**,
I want **een overzicht van alle producten in een visueel grid**,
So that **ik snel het product kan vinden waarvoor ik foto's wil genereren**.

**Acceptance Criteria:**

**Given** de kweker opent de catalogus pagina (/)
**When** de pagina laadt
**Then** worden alle 36 producten weergegeven in een responsive grid (4 kolommen desktop, 2 tablet, 1 mobiel)
**And** elke product card toont: productfoto, naam, SKU, categorie badge, potmaat, planthoogte, belading
**And** de categorie badge heeft een kleur per categorie (Artificial Plants, Tropical indoor, mediterranean outdoor)
**And** de cards hebben een hover effect
**And** klikken op een card navigeert naar `/product/[id]`
**And** de pagina laadt in < 2 seconden (SSG)
**And** alle tekst is in het Nederlands ("Potmaat", "Hoogte", "Belading")

**Technical Notes:**
- SSG: product data wordt geladen at build time
- Components: `product-grid.tsx`, `product-card.tsx`
- Product images: placeholder images (of SVG placeholders) in `/public/images/products/`

---

### Story 1.4: Zoeken en filteren

As a **kweker**,
I want **zoeken op productnaam/SKU en filteren op categorie**,
So that **ik snel het juiste product vind in de catalogus van 36+ producten**.

**Acceptance Criteria:**

**Given** de kweker is op de catalogus pagina
**When** de kweker typt in het zoekveld
**Then** worden producten direct gefilterd op naam OF SKU (case-insensitive)
**And** het filter werkt realtime bij elke toetsaanslag (debounced 300ms)
**And** als er geen resultaten zijn wordt "Geen producten gevonden" getoond

**Given** de kweker klikt op een categorie filter
**When** een categorie wordt geselecteerd
**Then** worden alleen producten van die categorie getoond
**And** de opties zijn: "Alle categorieën", "Artificial Plants", "Tropical indoor", "mediterranean outdoor"
**And** het aantal resultaten wordt getoond ("12 producten")
**And** zoeken en filteren werken samen (AND logica)

**Technical Notes:**
- Component: `search-filter-bar.tsx`
- Client-side filtering (alle data is in-memory)
- shadcn/ui `Input` + `Select` components

---

## Epic 2: Product Detail & Configuratie

**Goal:** De kweker kan een product openen, alle productinformatie zien, een bronafbeelding kiezen, en de gewenste foto-types en instellingen selecteren voor generatie.

**Covers:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR26, NFR1, NFR8

---

### Story 2.1: Product detail pagina layout

As a **kweker**,
I want **een overzichtelijke product detail pagina met alle informatie**,
So that **ik de productgegevens kan controleren voordat ik foto's genereer**.

**Acceptance Criteria:**

**Given** de kweker navigeert naar `/product/[id]`
**When** de pagina laadt
**Then** wordt de product header getoond met: naam, SKU, VBN code, categorie, potdiameter, planthoogte, belading (geformatteerd)
**And** er is een "← Terug naar catalogus" link
**And** de pagina heeft een twee-kolommen layout (links: configuratie, rechts: resultaten)
**And** de stappen-indicator bovenaan toont 5 stappen: "① Foto kiezen → ② Types selecteren → ③ Genereren → ④ Goedkeuren → ⑤ Publiceren"
**And** stap 1 is actief gemarkeerd
**And** als het product niet bestaat wordt een 404 pagina getoond
**And** alle tekst is in het Nederlands

**Technical Notes:**
- Server component: `product/[id]/page.tsx` laadt product data
- Client component: `product-detail-client.tsx` bevat alle interactie
- Components: `product-header.tsx`, `step-indicator.tsx`

---

### Story 2.2: Source image selectie

As a **kweker**,
I want **een bronafbeelding kiezen uit de catalogus of een eigen foto uploaden**,
So that **de AI een goede basis heeft voor het genereren van foto's**.

**Acceptance Criteria:**

**Given** de kweker is op de product detail pagina
**When** de kweker het "Foto kiezen" gedeelte ziet
**Then** zijn er twee opties: "Catalogusfoto" (standaard geselecteerd) en "Upload nieuw"
**And** bij "Catalogusfoto" wordt de productfoto uit de catalogus getoond als thumbnail
**And** bij "Upload nieuw" verschijnt een drag & drop zone met "Sleep een foto hierheen of klik om te uploaden"
**And** geaccepteerde formaten: JPG, PNG, WebP (max 10MB)
**And** na upload wordt een preview getoond
**And** de geselecteerde foto wordt visueel bevestigd met een groen vinkje
**And** de stappen-indicator markeert stap 1 als voltooid wanneer een foto is geselecteerd

**Given** de kweker upload een te groot bestand
**When** het bestand > 10MB is
**Then** wordt een foutmelding getoond: "Bestand is te groot (maximaal 10MB)"

**Technical Notes:**
- Component: `source-image-selector.tsx`
- Upload via `api/upload/route.ts` → Vercel Blob
- Native `<input type="file">` + drag & drop event handlers
- Preview via `URL.createObjectURL` of Blob URL na upload

---

### Story 2.3: Foto-type selectie cards

As a **kweker**,
I want **visuele cards zien van alle beschikbare foto-types die ik kan genereren**,
So that **ik begrijp welke foto's worden gemaakt en kan kiezen welke ik wil**.

**Acceptance Criteria:**

**Given** de kweker heeft een bronafbeelding geselecteerd
**When** het "Types selecteren" gedeelte wordt getoond
**Then** worden alle 8 foto-types als visuele cards weergegeven:
  - Witte achtergrond — altijd beschikbaar, standaard AAN
  - Meetlatfoto — altijd beschikbaar, standaard AAN
  - Detailfoto — altijd beschikbaar, standaard AAN
  - Composiet — altijd beschikbaar, standaard UIT
  - Tray — conditioneel (potØ ≥ 20cm), standaard AAN als beschikbaar
  - Sfeerbeeld — altijd beschikbaar, standaard AAN
  - Seizoensfoto — conditioneel (niet bij Artificial Plants), standaard AAN als beschikbaar
  - Deense Kar — altijd beschikbaar, standaard AAN
**And** elke card toont: voorbeeld-thumbnail, Nederlandse naam, korte beschrijving
**And** elke card heeft een toggle (aan/uit)
**And** niet-beschikbare cards zijn visueel disabled (grijs) met tooltip uitleg
**And** het totaal aantal geselecteerde types wordt getoond: "X foto-types geselecteerd"
**And** de stappen-indicator markeert stap 2 als actief

**Given** een product met potØ 15cm (bijv. ARTIFICIAL Onion Grass)
**When** de tray card wordt bekeken
**Then** is deze disabled met tooltip: "Tray niet beschikbaar bij potmaat 15cm (minimaal 20cm)"

**Given** een Artificial Plants product
**When** de seizoensfoto card wordt bekeken
**Then** is deze disabled met tooltip: "Seizoensfoto niet beschikbaar voor kunstplanten"

**Technical Notes:**
- Component: `image-type-selector.tsx`
- Config in `src/lib/constants.ts`: IMAGE_TYPES array met naam, beschrijving, voorbeeld, condities
- Conditielogica: `isTypeAvailable(type, product)` functie

---

### Story 2.4: Generatie-instellingen

As a **kweker**,
I want **aspect ratio en resolutie instellen voor de gegenereerde foto's**,
So that **de foto's het juiste formaat hebben voor mijn gebruik**.

**Acceptance Criteria:**

**Given** de kweker heeft foto-types geselecteerd
**When** het instellingen gedeelte wordt getoond
**Then** is er een "Beeldverhouding" dropdown met opties: 1:1 (standaard), 4:3, 3:4, 16:9, 9:16
**And** is er een "Resolutie" dropdown met opties: 1K (1024px, standaard), 2K (2048px), 4K (4096px)
**And** bij 4K selectie verschijnt een waarschuwing: "4K generatie duurt langer (tot 5 minuten per foto)"
**And** de geselecteerde instellingen worden onthouden via localStorage voor volgende sessies

**Technical Notes:**
- Component: `generation-settings.tsx`
- Opslaan in `useGrowerSettings` hook (localStorage)
- Types: `AspectRatio`, `ImageSize` in `types.ts`

---

## Epic 3: AI Foto Generatie

**Goal:** De kweker kan met één klik alle geselecteerde foto's laten genereren door de AI, met realtime voortgang zodat duidelijk is wat er gebeurt.

**Covers:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, NFR5, AR3, AR4, AR5

---

### Story 3.1: Gemini API client

As a **developer**,
I want **een robuuste Gemini API client met retry logica**,
So that **AI generatie betrouwbaar werkt, ook bij tijdelijke fouten**.

**Acceptance Criteria:**

**Given** een geldige `GEMINI_API_KEY` environment variable
**When** `generateImage(prompt, sourceImage, config)` wordt aangeroepen
**Then** wordt een POST request gestuurd naar `generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
**And** de source image wordt meegestuurd als base64 `inlineData`
**And** `generationConfig` bevat `responseModalities: ["Text", "Image"]` en de juiste `imageConfig`
**And** het response wordt geparsed en de gegenereerde image base64 wordt geretourneerd

**Given** een Gemini API call faalt met een tijdelijke fout (429, 500, 503)
**When** de retry logica wordt geactiveerd
**Then** worden maximaal 3 retries uitgevoerd
**And** de delay is exponential: 5s, 10s, 20s (max 30s)
**And** bij definitief falen wordt een duidelijke error geretourneerd

**Given** een Gemini API call duurt te lang
**When** de timeout wordt bereikt (180s standaard, 300s voor 4K)
**Then** wordt de call geannuleerd met een timeout error

**Technical Notes:**
- File: `src/lib/gemini/client.ts`
- Patroon overnemen uit Shopify Content Generator (bewezen)
- Gemini types in `src/lib/gemini/types.ts`
- Geen SDK — direct REST calls met `fetch`

---

### Story 3.2: Prompt templates en variabele substitutie

As a **developer**,
I want **prompt templates met variabele substitutie per foto-type**,
So that **elke generatie een optimaal geformuleerde prompt krijgt met de juiste product context**.

**Acceptance Criteria:**

**Given** een product en een foto-type
**When** `buildPrompt(imageType, product, settings)` wordt aangeroepen
**Then** wordt de juiste template geselecteerd voor het foto-type
**And** worden alle `{{variabelen}}` vervangen:
  - `{{plantName}}` → productnaam (zonder "ARTIFICIAL" prefix)
  - `{{plantHeight}}` → planthoogte in cm
  - `{{potDiameter}}` → potdiameter in cm
  - `{{heightDescription}}` → "a small tabletop plant" / "a tall floor-standing plant" etc.
  - `{{plantsPerLayer}}` → stuks per laag (carrier data)
  - `{{layers}}` → aantal lagen (carrier data)
**And** bestaan er 8 prompt templates (één per foto-type, in het Engels)
**And** de Deense Kar prompt bevat specifieke DC afmetingen en carrier layout

**Technical Notes:**
- File: `src/lib/gemini/prompts.ts`
- Templates uit de Product Brief (sectie 9)
- `heightDescription` mapping: ≤40cm → small tabletop, ≤80cm → medium, etc.

---

### Story 3.3: Generatie pipeline met dependency chain

As a **developer**,
I want **een generatie pipeline die de juiste volgorde en parallellisatie hanteert**,
So that **de witte achtergrond eerst wordt gegenereerd en de rest parallel kan draaien**.

**Acceptance Criteria:**

**Given** een lijst geselecteerde foto-types en een source image
**When** de pipeline wordt gestart
**Then** wordt **Fase 1** uitgevoerd: witte achtergrond generatie (sequentieel)
**And** na succesvolle Fase 1 wordt **Fase 2** uitgevoerd: alle overige types parallel via `Promise.allSettled`
**And** als composiet is geselecteerd wordt **Fase 3** uitgevoerd na voltooiing van witte achtergrond + detail
**And** elke gegenereerde image wordt geüpload naar Vercel Blob
**And** de pipeline rapporteert per job: start, complete (met URL), of error
**And** als Fase 1 faalt, worden alle overige jobs als "failed" gemarkeerd (dependency)
**And** als een Fase 2 job faalt, gaan andere jobs gewoon door

**Technical Notes:**
- File: `src/lib/generation/pipeline.ts`
- Vercel Blob upload via `src/lib/blob/storage.ts`
- Pipeline retourneert events via callback of generator function

---

### Story 3.4: SSE API endpoint voor generatie

As a **developer**,
I want **een SSE streaming endpoint die generatie voortgang realtime naar de browser stuurt**,
So that **de kweker ziet wat er gebeurt tijdens het genereren**.

**Acceptance Criteria:**

**Given** een POST request naar `/api/generate` met productId, sourceImageUrl, imageTypes, en settings
**When** de request wordt verwerkt
**Then** wordt de input gevalideerd met Zod schema
**And** wordt een SSE stream geopend (`Content-Type: text/event-stream`)
**And** worden de volgende events gestuurd:
  - `event: status` met `{"type": "batch-start", "totalJobs": N}`
  - `event: job-start` met `{"jobId": "...", "imageType": "..."}`
  - `event: job-complete` met `{"jobId": "...", "imageType": "...", "imageUrl": "..."}`
  - `event: job-error` met `{"jobId": "...", "imageType": "...", "error": "..."}`
  - `event: status` met `{"type": "batch-complete", "successCount": N, "failedCount": N}`
**And** de stream wordt gesloten na batch-complete

**Given** een ongeldige request
**When** de Zod validatie faalt
**Then** wordt een 400 error retourneerd met `{ error: "...", code: "INVALID_INPUT" }`

**Technical Notes:**
- File: `src/app/api/generate/route.ts`
- Next.js `ReadableStream` + `TextEncoder` voor SSE
- Zod schema in `src/lib/schemas.ts`
- Roept `pipeline.ts` aan en streamt events door

---

### Story 3.5: Generatie UI met voortgang

As a **kweker**,
I want **op één knop klikken om foto's te genereren en de voortgang live zien**,
So that **ik weet dat het werkt en hoelang het nog duurt**.

**Acceptance Criteria:**

**Given** de kweker heeft source image, foto-types, en instellingen geselecteerd
**When** de "Genereer X foto's" knop beschikbaar is
**Then** toont de knop het exacte aantal: "Genereer 6 foto's" (met sparkle icoon)
**And** de knop is disabled zolang er geen source image is geselecteerd

**Given** de kweker klikt op "Genereer"
**When** de generatie start
**Then** verandert de stappen-indicator naar stap 3 (actief)
**And** verschijnt een voortgangspaneel met:
  - Totale voortgangsbalk (percentage)
  - Per foto-type: naam + status icoon (⏳ wachtend, ⟳ bezig, ✓ klaar, ✕ mislukt)
**And** de voortgang update realtime via SSE
**And** de "Genereer" knop is disabled tijdens generatie
**And** bij voltooiing verschijnt een succes-toast: "X van Y foto's succesvol gegenereerd"

**Given** een of meer foto's falen tijdens generatie
**When** de batch voltooid is met fouten
**Then** worden mislukte foto's getoond met rood kruis en foutmelding
**And** verschijnt een toast: "X foto's gegenereerd, Y mislukt"

**Technical Notes:**
- Components: `generate-button.tsx`, `generation-progress.tsx`
- Hook: `src/lib/hooks/use-generation.ts` (SSE consumer met EventSource of fetch)
- Toast notificaties via sonner

---

## Epic 4: Review & Goedkeuring

**Goal:** De kweker kan alle gegenereerde foto's bekijken, groot inzien, en per foto goedkeuren of afkeuren, met de mogelijkheid om afgekeurde foto's opnieuw te genereren.

**Covers:** FR20, FR21, FR22

---

### Story 4.1: Gegenereerde foto's grid met review acties

As a **kweker**,
I want **alle gegenereerde foto's naast elkaar zien met goedkeur/afkeur knoppen**,
So that **ik snel kan beoordelen welke foto's goed zijn**.

**Acceptance Criteria:**

**Given** de generatie is voltooid (geheel of gedeeltelijk)
**When** het review gedeelte wordt getoond
**Then** verschijnen alle gegenereerde foto's in een grid (rechter kolom)
**And** elke foto toont: de afbeelding, het foto-type als label, en twee knoppen
**And** de knoppen zijn: ✓ Goedkeuren (groen) en ✕ Afkeuren (rood)
**And** bij goedkeuren krijgt de foto een groene rand en vinkje-badge
**And** bij afkeuren krijgt de foto een rode rand en kruis-badge
**And** het totaal wordt getoond: "X van Y goedgekeurd"
**And** de stappen-indicator markeert stap 4 als actief
**And** mislukte foto's tonen een placeholder met foutmelding

**Technical Notes:**
- Component: `generated-images-grid.tsx`
- Hook: `src/lib/hooks/use-image-review.ts`
- State: `Map<imageId, "pending" | "approved" | "rejected">`

---

### Story 4.2: Lightbox voor groot bekijken

As a **kweker**,
I want **een foto groot kunnen bekijken in een lightbox**,
So that **ik de kwaliteit goed kan beoordelen voordat ik goedkeur**.

**Acceptance Criteria:**

**Given** de kweker ziet gegenereerde foto's in het grid
**When** de kweker op een foto klikt
**Then** opent een fullscreen lightbox/dialog met de foto op groot formaat
**And** de lightbox toont het foto-type als titel
**And** er zijn navigatie-pijlen om naar vorige/volgende foto te gaan
**And** er zijn goedkeur/afkeur knoppen in de lightbox
**And** de lightbox sluit met Escape, klikken buiten de foto, of een sluit-knop
**And** de achtergrond is donker (overlay)

**Technical Notes:**
- Component: `shared/image-lightbox.tsx`
- shadcn/ui `Dialog` component als basis
- Keyboard navigatie: pijltjes links/rechts, Escape

---

### Story 4.3: Foto opnieuw genereren

As a **kweker**,
I want **een afgekeurde foto opnieuw kunnen laten genereren**,
So that **ik een beter resultaat krijg zonder het hele proces opnieuw te starten**.

**Acceptance Criteria:**

**Given** een foto is afgekeurd
**When** de kweker op "Opnieuw genereren" klikt bij die foto
**Then** wordt alleen die specifieke foto opnieuw gegenereerd
**And** de voortgang wordt getoond bij die specifieke foto (loading spinner)
**And** de oude foto wordt vervangen door de nieuwe
**And** de review status wordt gereset naar "pending" voor die foto
**And** bij succes verschijnt een toast: "[Foto-type] opnieuw gegenereerd"
**And** bij falen verschijnt een error toast

**Technical Notes:**
- Hergebruik `generateImage` uit de Gemini client
- Enkele API call, geen volledige pipeline nodig
- Dezelfde prompt + source image als oorspronkelijke generatie

---

## Epic 5: Logo & Composiet

**Goal:** De kweker kan een bedrijfslogo uploaden, op foto's plaatsen, en composiet foto's laten samenstellen met de detail-inset en logo.

**Covers:** FR23, FR24, FR25, FR30

---

### Story 5.1: Instellingen pagina met logo upload

As a **kweker**,
I want **een instellingen pagina waar ik mijn bedrijfslogo kan uploaden**,
So that **het logo beschikbaar is om op foto's te plaatsen**.

**Acceptance Criteria:**

**Given** de kweker navigeert naar `/settings`
**When** de pagina laadt
**Then** wordt een "Bedrijfslogo" sectie getoond
**And** er is een upload zone (drag & drop of klik) voor het logo
**And** geaccepteerde formaten: PNG, SVG (transparante achtergrond aanbevolen)
**And** na upload wordt het logo als preview getoond
**And** het logo wordt opgeslagen in localStorage (als base64)
**And** er is een "Logo verwijderen" knop
**And** er is een "Standaard positie" selector met 4 opties: linksboven, rechtsboven, linksonder, rechtsonder
**And** er zijn standaard instellingen voor aspect ratio en resolutie
**And** alle tekst is in het Nederlands

**Technical Notes:**
- Page: `src/app/settings/page.tsx`
- Hook: `src/lib/hooks/use-grower-settings.ts` (localStorage)
- Logo upload naar localStorage als base64 (geen Blob nodig — logo is klein)

---

### Story 5.2: Logo overlay editor

As a **kweker**,
I want **mijn logo op een goedgekeurde foto kunnen plaatsen met een visuele editor**,
So that **ik een klokfoto (meetlat + logo) kan maken**.

**Acceptance Criteria:**

**Given** de kweker heeft een goedgekeurde foto en een logo geüpload
**When** de kweker op "Logo toevoegen" klikt bij een foto
**Then** opent een editor/dialog met de foto en het logo als overlay
**And** het logo wordt getoond op de standaard positie (uit instellingen)
**And** de kweker kan de positie wijzigen via 4 positie-knoppen
**And** de kweker kan het logo groter/kleiner maken (slider)
**And** er is een "Toepassen" knop die de composiet opslaat
**And** het resultaat wordt opgeslagen als nieuwe image (Canvas API samengesteld)
**And** de originele foto blijft behouden

**Technical Notes:**
- Component: `logo-overlay/logo-editor.tsx`
- Canvas API voor compositing
- Geen drag & drop van het logo zelf (te complex voor demo) — alleen positie-knoppen

---

### Story 5.3: Automatische composiet foto

As a **kweker**,
I want **dat de composiet foto automatisch wordt samengesteld uit de witte achtergrond en detailfoto**,
So that **ik een professionele productfoto krijg met detail-inset**.

**Acceptance Criteria:**

**Given** de kweker heeft "Composiet" aangevinkt als foto-type
**And** zowel witte achtergrond als detailfoto zijn succesvol gegenereerd
**When** de composiet wordt samengesteld
**Then** wordt de witte achtergrond foto als basis gebruikt
**And** wordt de detailfoto als cirkelvormige inset geplaatst (links-onder, ~25% van beeldbreedte)
**And** de cirkel heeft een dunne witte rand
**And** als er een logo is geüpload, wordt dit rechtsboven geplaatst
**And** het resultaat verschijnt als aparte foto in het review grid
**And** de composiet wordt opgeslagen naar Vercel Blob

**Given** de detailfoto is niet beschikbaar (generatie mislukt)
**When** de composiet zou worden samengesteld
**Then** wordt de composiet overgeslagen met foutmelding "Detailfoto nodig voor composiet"

**Technical Notes:**
- File: `src/lib/generation/composite-builder.ts`
- Canvas API: `drawImage` + circular clip path
- Kan server-side (in API route) of client-side worden uitgevoerd

---

## Epic 6: Publicatie naar Floriday

**Goal:** De kweker kan goedgekeurde foto's selecteren en naar Floriday publiceren (gesimuleerd), met een vergelijking tussen huidige en nieuwe foto's.

**Covers:** FR27, FR28, FR29

---

### Story 6.1: Huidige Floriday foto's weergave (mock)

As a **kweker**,
I want **zien welke foto's er momenteel op Floriday staan voor dit product**,
So that **ik kan vergelijken met de nieuw gegenereerde foto's**.

**Acceptance Criteria:**

**Given** de kweker is op de product detail pagina
**When** de rechter kolom wordt getoond
**Then** is er een "Huidig op Floriday" sectie bovenaan de rechter kolom
**And** deze toont 2-4 mock foto's (placeholder images) die "huidige" Floriday foto's voorstellen
**And** elke foto heeft een label (bijv. "Productfoto", "Sfeerbeeld")
**And** de sectie is visueel onderscheiden van de gegenereerde foto's sectie
**And** er staat een disclaimer: "Demo — dit zijn voorbeeldfoto's"

**Technical Notes:**
- Component: `product/floriday-current.tsx`
- Mock data: hardcoded placeholder URLs per product (of generiek)
- Puur visueel — geen echte Floriday API

---

### Story 6.2: Sync selectie en publicatie simulatie

As a **kweker**,
I want **kiezen welke goedgekeurde foto's ik naar Floriday wil publiceren en dit uitvoeren**,
So that **ik de workflow van publicatie kan ervaren**.

**Acceptance Criteria:**

**Given** de kweker heeft minimaal 1 foto goedgekeurd
**When** de "Publiceren naar Floriday" sectie wordt getoond
**Then** worden alle goedgekeurde foto's getoond met een checkbox per foto
**And** standaard zijn alle goedgekeurde foto's aangevinkt
**And** de kweker kan individuele foto's aan/uitzetten
**And** het aantal geselecteerde foto's wordt getoond: "X foto's geselecteerd"
**And** er is een "Sync naar Floriday" knop (prominent, groene kleur)
**And** de stappen-indicator markeert stap 5 als actief

**Given** de kweker klikt op "Sync naar Floriday"
**When** de sync wordt uitgevoerd
**Then** wordt een laad-animatie getoond (2-3 seconden simulatie)
**And** verschijnt een succes-dialoog: "X foto's succesvol gepubliceerd naar Floriday!"
**And** de dialoog bevat een vinkje-animatie
**And** de gepubliceerde foto's krijgen een "Gepubliceerd" badge
**And** de stappen-indicator markeert stap 5 als voltooid (alle stappen groen)

**Technical Notes:**
- Component: `product/floriday-sync.tsx`
- Geen echte API call — `setTimeout` simulatie (2-3s)
- shadcn/ui `Dialog` voor succes-melding
- Motion animatie voor het vinkje

---

## Dependency Overview

```
Epic 1: Productcatalogus
  └─→ Epic 2: Product Detail & Configuratie
       └─→ Epic 3: AI Foto Generatie
            └─→ Epic 4: Review & Goedkeuring
                 ├─→ Epic 5: Logo & Composiet
                 └─→ Epic 6: Publicatie naar Floriday
```

- **Epic 1** is standalone — levert werkende catalogus
- **Epic 2** bouwt voort op Epic 1 (product pages)
- **Epic 3** bouwt voort op Epic 2 (source image + type selectie)
- **Epic 4** bouwt voort op Epic 3 (gegenereerde images)
- **Epic 5 en 6** bouwen beide voort op Epic 4, maar zijn onderling onafhankelijk
- Elke epic levert **werkende, demonstreerbare functionaliteit**

---

## Story Sizing Indicatie

| Epic | Stories | Complexiteit |
|---|---|---|
| Epic 1 | 4 stories | Laag — standaard Next.js + UI |
| Epic 2 | 4 stories | Laag-Medium — UI components + conditionele logica |
| Epic 3 | 5 stories | Hoog — Gemini API, pipeline, SSE streaming |
| Epic 4 | 3 stories | Medium — review state, lightbox, re-generatie |
| Epic 5 | 3 stories | Medium — Canvas API, compositing |
| Epic 6 | 2 stories | Laag — mock/simulatie |
| **Totaal** | **21 stories** | |

---

*Dit document is het resultaat van de epic/story breakdown sessie op 2026-02-06, gebaseerd op de Product Brief en Architecture Decision Document.*
