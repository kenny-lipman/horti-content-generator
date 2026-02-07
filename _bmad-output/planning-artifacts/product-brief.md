---
stepsCompleted: [vision, users, metrics, scope, complete]
inputDocuments: [floriday-screenshots, shopify-content-generator-codebase]
date: 2026-02-06
author: Kenny & Mary (Business Analyst)
---

# Product Brief: Floriday Content Generator

## 1. Visie & Probleem

### Probleem
Kwekers in de sierteelt moeten voor elk product in hun Floriday catalogus meerdere professionele foto's aanleveren: witte-achtergrondfoto's, meetlatfoto's, klokfoto's (voor de veiling), sfeerbeelden, tray-foto's, en Deense Kar-opstellingen. Dit is een **tijdrovend en duur proces** dat vaak resulteert in:

- Ontbrekende of verouderde productfoto's in Floriday
- Inconsistente beeldkwaliteit tussen producten
- Hoge kosten voor professionele productfotografie
- Kwekers die het "erbij doen" en geen tijd hebben voor content

### Visie
Een AI-powered content generator die **in enkele klikken alle benodigde foto-types genereert** vanuit één enkele productfoto. De tool sluit direct aan op de Floriday catalogus, begrijpt de sierteelt-context (potmaten, Deense Karren, veilingklok-formaten), en laat kwekers gegenereerde foto's reviewen en publiceren naar Floriday.

### Kernbelofte
> "Upload één foto, krijg je complete Floriday productfotografie terug."

---

## 2. Doelgroep

### Primair: Kwekers (via Floriday)
- **Wie**: Medewerkers bij kwekerijen die verantwoordelijk zijn voor productcontent in Floriday
- **Technisch niveau**: Laag tot gemiddeld — veel medewerkers hebben niet enorm veel verstand van computers
- **Pijnpunt**: Moeten vele foto-types per product aanleveren, vaak handmatig, vaak verouderd
- **Motivatie**: Betere productpresentatie → meer verkoop op de veiling/handel

### Secundair: Everspring klanten (toekomst)
- **Wie**: Klanten van Everspring die witte foto's van planten en potten uploaden
- **Aanpak**: Uploaden witte foto's + hoogte/potmaat → AI genereert sfeerbeelden
- **Scope**: Buiten scope van deze demo, maar architectuur houdt er rekening mee

---

## 3. Scope: Demo MVP

### In scope (must-haves)
Dit is een **werkende demo** die het volledige proces demonstreert met echte AI-generatie.

#### Catalogus
- Floriday-achtige productcatalogus met dummy data (gebaseerd op echte Floriday screenshots)
- Zoeken op productnaam of SKU
- Productinformatie: naam, SKU, VBN code, categorie, potdiameter, planthoogte, belading (DC info)

#### Product Detail (single-page)
- Productinfo header met alle relevante data
- Source image selectie: uit catalogus of eigen upload
- Checkbox-selectie van foto-types om te genereren (met voorbeeld-thumbnails per type)
- Conditionele logica: tray disabled bij potØ < 20cm, seizoensfoto disabled bij Artificial Plants
- Aspect ratio keuze (1:1, 4:3, 3:4, 16:9, 9:16 etc.)
- Resolutie keuze (1K, 2K, 4K)

#### AI Foto Generatie (live, met Gemini 3 Pro Image Preview)

| # | Foto-type | AI Prompt richting | Conditie |
|---|---|---|---|
| 1 | **Witte achtergrond** | Achtergrond verwijderen, pure witte achtergrond | Altijd |
| 2 | **Meetlatfoto** | Plant met meetlat/cm-schaal links, geschaald op {hoogte}cm | Altijd |
| 3 | **Detailfoto** | Close-up van blad/textuur van de plant | Altijd |
| 4 | **Composiet** | Witte foto met detail-inset rechtsonder | Optioneel (kweker vinkt aan) |
| 5 | **Tray** | Plant in kwekerij-tray, logische grid-indeling | Alleen als potØ ≥ 20cm |
| 6 | **Sfeerbeeld** | Plant in modern interieur, natuurlijk licht | Altijd |
| 7 | **Seizoensfoto** | Dezelfde plant in volle bloei | Niet bij "Artificial Plants" |
| 8 | **Deense Kar** | Planten op Deense Container, gebaseerd op belading data | Altijd |

#### Generatie dependency chain
```
Originele foto (upload/catalogus)
  └─→ ① Witte achtergrond (AI)
        ├─→ ② Meetlatfoto (AI + hoogte data)
        ├─→ ③ Detailfoto (AI close-up)
        │     └─→ ④ Composiet (automatisch als aangevinkt)
        ├─→ ⑤ Tray (AI, conditioneel)
        ├─→ ⑥ Sfeerbeeld (AI)
        ├─→ ⑦ Seizoensfoto (AI, conditioneel)
        └─→ ⑧ Deense Kar (AI + belading data)
```

**Stap 1 (witte achtergrond) moet eerst voltooid zijn** voordat de rest parallel kan starten. De rest kan parallel.

#### Review & Goedkeuring
- Per gegenereerde foto: goedkeuren of afkeuren
- Lightbox voor groot bekijken
- Opnieuw genereren van afgekeurde foto's

#### Logo Overlay Tool
- Eenmalige logo upload per kweker-account (instellingen pagina)
- Canvas-based editor om logo op foto's te plaatsen
- Configureerbare positie
- Klokfoto = meetlatfoto + logo overlay (kweker doet dit handmatig)

#### Sync naar Floriday
- Overzicht: links huidige Floriday foto's, rechts nieuwe gegenereerde foto's
- Per foto toggle: wel/niet publiceren
- "Sync naar Floriday" knop (voor demo: mock/simulatie)

#### Stappen-indicator
Visuele gids bovenaan de product pagina:
```
① Foto kiezen → ② Types selecteren → ③ Genereren → ④ Goedkeuren → ⑤ Publiceren
```

### Buiten scope (toekomst)
- Echte Floriday API integratie (read/write)
- Everspring koppeling
- Gebruikersbeheer / multi-tenant
- Incidentenregister
- Meerdere planten als mix aanbieden
- Batch verwerking (meerdere producten tegelijk)
- Prompt editing door gebruikers

---

## 4. Deense Container Logica

### Specificaties (standaard DC)
| Eigenschap | Waarde |
|---|---|
| Buitenafmetingen | 1350 × 565 × 1900 mm |
| Plankoppervlak | 1275 × 545 mm |
| Standaard planken | 3 legborden |
| Hoogte-instelling | 30 gaten, 5-180 cm afstand |

### Belading formaat
`800 - 2×20×1 - DC` = Fust 800 (Aanvoer zonder fust) | 2 lagen per DC | 20 stuks per laag | 1 kar

### Pot-per-plank berekening
| PotØ (cm) | Geschat per plank | Grid |
|---|---|---|
| 15 | ~24 | 8×3 |
| 18 | ~18 | 7×2-3 |
| 20 | ~12 | 6×2 |
| 24 | ~8 | 5×2 |
| 27 | ~8 | 4×2 |
| 32 | ~4 | 3×1-2 |
| 40+ | ~2 | 2×1 |

De AI ontvangt deze data als context bij het genereren van de kar-visualisatie.

---

## 5. Tech Stack

| Laag | Keuze | Reden |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Vercel deploy, API routes, SSR, Kenny's ervaring |
| **Styling** | Tailwind CSS + shadcn/ui | Bewezen in Shopify tool, professioneel, toegankelijk |
| **AI Model** | Google Gemini 3 Pro Image Preview | Image-to-image, tot 4K, bewezen in Shopify tool |
| **Image compositing** | Canvas API (browser-side) | Logo overlay, detail inset compositing |
| **Data** | JSON file (dummy) | Geen database nodig voor demo |
| **Image opslag** | Vercel Blob of base64 in-memory | Gegenereerde images opslaan |
| **Deploy** | Vercel (team: bespoke-automation) | Instant deploys, `vercel.com/bespoke-automation` |
| **Icons** | Lucide React | Consistent met shadcn/ui |
| **Animaties** | Framer Motion (subtiel) | Generatie voortgang, hover states |

### Gemini API Integratie
- **Endpoint**: `generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- **Aanpak**: Direct REST API calls (bewezen patroon uit Shopify tool)
- **Retry**: 3 retries met exponential backoff (5-30s)
- **Timeout**: 3 min standaard, 5 min voor 4K
- **Input**: Source image (base64) + text prompt
- **Output**: Base64 encoded image

### Generatie Pipeline (vereenvoudigd t.o.v. Shopify tool)
- **Geen Inngest** — Simpele Next.js API route met Promise.all
- **Voortgang via SSE** (Server-Sent Events) — Realtime updates naar frontend
- **Sequentieel**: Eerst witte achtergrond, dan rest parallel

---

## 6. UX Design Principes

### Doelgroep-specifieke aanpassingen
De doelgroep (kwekerijmedewerkers) is **niet-technisch**. Elk UX-besluit moet hierop afgestemd zijn:

| Principe | Implementatie |
|---|---|
| **Geen twijfel** | Visuele stappen-indicator, duidelijke volgende-stap CTA |
| **Visueel, niet tekstueel** | Foto-types als cards met voorbeeld-thumbnails, niet als tekst-checkboxes |
| **Grote klikgebieden** | Buttons minstens 48px hoog, cards i.p.v. kleine controls |
| **Smart defaults** | Alle beschikbare foto-types standaard AAN |
| **Directe feedback** | Elke actie heeft zichtbaar resultaat binnen 1 seconde |
| **Nederlands** | Volledig Nederlandse UI, geen Engelse termen |
| **Foutpreventie** | Disabled states met uitleg ("Tray niet beschikbaar bij deze potmaat") |
| **Warm kleurenpalet** | Groen/aarde-tinten — past bij de doelgroep (planten/kwekers) |

### Kleurenpalet
```
Primair:      #2D6A4F (donkergroen)      → Buttons, accenten
Secundair:    #52B788 (middengroen)      → Hover, actieve states
Achtergrond:  #FAFAF8 (warm wit)         → Pagina achtergrond
Cards:        #FFFFFF                     → Card achtergronden
Tekst:        #1B1B1B                     → Hoofdtekst
Subtekst:     #6B7280                     → Labels, hints
Waarschuwing: #F59E0B (amber)            → Niet-beschikbaar states
Succes:       #10B981                     → Gegenereerd / Goedgekeurd
Border:       #E5E7EB                     → Subtiele randen
```

### Typografie
- **Font**: Inter of Plus Jakarta Sans
- **Heading**: Semibold, tracking-tight
- **Body**: Regular, ruime line-height voor leesbaarheid
- **Labels**: Small, muted — niet overweldigend

---

## 7. Pagina Structuur

### Routes
| Route | Pagina | Doel |
|---|---|---|
| `/` | Catalogus | Product grid, zoeken, filteren |
| `/product/[id]` | Product Detail | Alles-in-één: source, genereer, review, sync |
| `/settings` | Instellingen | Logo upload, standaard voorkeuren |

### Product Detail Page Layout
```
┌──────────────────────────────────────────────────────────┐
│  ← Terug    [Productnaam] | [hoogte]cm                   │
│             VBN [code] · [categorie] · PotØ [x]cm        │
│             Belading: [lagen]×[stuks] - DC                │
│                                                           │
│  ① Foto kiezen → ② Types selecteren → ③ Genereren →     │
│       ✓              ●                  ○                 │
│  → ④ Goedkeuren → ⑤ Publiceren                          │
│       ○              ○                                    │
├──────────────────────────┬───────────────────────────────┤
│  LINKER KOLOM            │  RECHTER KOLOM                │
│                          │                                │
│  ┌─ Source Image ──────┐ │  ┌─ Huidig op Floriday ────┐ │
│  │ ○ Uit catalogus     │ │  │ [foto] [foto] [foto]    │ │
│  │ ○ Upload nieuw      │ │  │ [foto] [foto]           │ │
│  │ [thumbnails]        │ │  └─────────────────────────┘ │
│  └─────────────────────┘ │                                │
│                          │  ┌─ Gegenereerde foto's ────┐ │
│  ┌─ Foto Types ────────┐ │  │ [✓][✓][generating...]   │ │
│  │ [card][card][card]  │ │  │ [✓][waiting][done]      │ │
│  │ [card][card][card]  │ │  │                          │ │
│  │ Elke card:          │ │  │ Per foto:               │ │
│  │  - Voorbeeld thumb  │ │  │  ✓ Goedkeuren           │ │
│  │  - Naam             │ │  │  ✕ Afkeuren             │ │
│  │  - Aan/Uit toggle   │ │  └─────────────────────────┘ │
│  └─────────────────────┘ │                                │
│                          │  ┌─ Push naar Floriday ─────┐ │
│  ┌─ Instellingen ──────┐ │  │ [✓ foto][✓ foto][foto]  │ │
│  │ Aspect: [1:1 ▾]    │ │  │                          │ │
│  │ Resolutie: [1K ▾]  │ │  │ [Sync X naar Floriday]  │ │
│  └─────────────────────┘ │  └─────────────────────────┘ │
│                          │                                │
│  [✨ Genereer X foto's] │                                │
│                          │                                │
│  ┌─ Voortgang ─────────┐ │                                │
│  │ ████████░░░░ 60%    │ │                                │
│  │ ✓ Witte achtergrond │ │                                │
│  │ ⟳ Meetlat...       │ │                                │
│  │ ○ Sfeerbeeld        │ │                                │
│  └─────────────────────┘ │                                │
└──────────────────────────┴───────────────────────────────┘
```

---

## 8. Data Model

### Product (dummy data, JSON)
```typescript
interface Product {
  id: string
  name: string                    // "ARTIFICIAL Ficus Benjamina - 180cm"
  sku: string                     // "13630"
  vbnCode: string                 // "VBN 111335"
  category: string                // "Artificial Plants" | "Tropical indoor" | "mediterranean outdoor"
  carrier: {
    fustCode: number              // 800
    fustType: string              // "Aanvoer zonder fust"
    carriageType: string          // "DC"
    layers: number                // 2
    perLayer: number              // 20
    units: number                 // 1
  }
  potDiameter: number             // cm
  plantHeight: number             // cm
  availability: string            // "Week 1 - 53"
  catalogImage: string            // URL/pad naar originele productfoto
  isArtificial: boolean           // afgeleid uit category
  canBloom: boolean               // bepaalt of seizoensfoto beschikbaar is
}
```

### Generated Images (runtime state)
```typescript
interface GeneratedImage {
  id: string
  productId: string
  imageType: ImageType
  dataUrl: string                 // base64 data URL
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'approved' | 'rejected'
  promptUsed: string
}

type ImageType =
  | 'white-background'
  | 'measuring-tape'
  | 'detail'
  | 'composite'          // white bg + detail inset
  | 'tray'
  | 'lifestyle'
  | 'seasonal'
  | 'danish-cart'
```

### Grower Settings (localStorage)
```typescript
interface GrowerSettings {
  logoUrl: string | null          // Base64 of geüploade logo
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  defaultAspectRatio: AspectRatio
  defaultResolution: ImageSize
}
```

---

## 9. Prompt Templates

### Witte achtergrond
```
Remove the background from this plant photo. Place the plant on a pure white background (#FFFFFF). Keep the exact proportions, colors, and details of the plant and its pot. The result should look like a professional product photograph suitable for an e-commerce catalog. Do not add shadows or reflections.
```

### Meetlatfoto
```
Take this white-background plant photo and add a professional measuring ruler/scale on the left side. The ruler should show centimeter markings from 0 at the bottom to {{plantHeight}}cm at the top of the plant. The ruler should be a simple, clean gray measuring tape. Keep the plant exactly as-is. This is for a horticultural trade catalog.
```

### Detailfoto
```
Generate a detailed close-up macro photograph of the leaves and foliage of this {{plantName}}. Focus on the texture, veining, color variations, and natural patterns. The image should be sharp, well-lit with soft natural lighting, and highlight the quality and health of the plant material.
```

### Composiet (detail inset)
De composiet-foto combineert de witte-achtergrondfoto met een cirkelvormige detail-inset (links-onder, ~25% van beeldbreedte) en optioneel het bedrijfslogo (rechts-boven). Dit wordt browser-side samengesteld met Canvas API.
```
Combine the white-background product photo with a circular detail inset in the bottom-left corner (approximately 25% of image width). The detail circle should have a thin white border. Optionally, place the company logo in the top-right corner. The result should look like a professional composite product photograph.
```

### Tray
AI genereert een visueel overtuigende tray-indeling. Geen exacte berekening — de AI bepaalt een logische grid op basis van potdiameter.
```
Show this {{plantName}} plant arranged in a standard nursery shipping tray for the Dutch flower auction. The plants are in {{potDiameter}}cm pots. Arrange them in a realistic grid pattern that fits the tray naturally. The tray should look like a typical horticultural transport tray used in the Dutch flower trade. White background, professional product photography.
```

### Sfeerbeeld
```
Place this {{plantName}} in a beautiful modern living room interior. The plant should be the focal point, {{heightDescription}}. Use natural window lighting creating a warm, inviting atmosphere. The scene should look like a professional interior design photograph. The plant must maintain its exact appearance from the source photo.
```

### Seizoensfoto
```
Show this {{plantName}} plant in its full flowering/blooming state during peak season. The plant should have abundant, vibrant flowers/blooms while maintaining the same pot, proportions, and overall structure as the source photo. Place on a pure white background. Professional horticultural catalog photography.
```

### Deense Kar
```
Show {{plantsPerLayer}} of these {{plantName}} plants ({{potDiameter}}cm pots, {{plantHeight}}cm tall) arranged on a standard Danish trolley (Deense Container). The trolley has {{layers}} shelves. Each shelf is 1275mm × 545mm. Show the trolley from a 3/4 front angle so all shelves are visible. The plants should be neatly arranged in a grid pattern on each shelf. Professional horticultural trade photography, white/light gray background.
```

> **Besluit**: Prompts zijn in het Engels — Gemini reageert hier beter op. De UI is volledig in het Nederlands.

---

## 10. Project Structuur

```
demo-content-generator-floriday/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Catalogus pagina
│   │   ├── layout.tsx                      # Root layout + navigatie
│   │   ├── product/[id]/
│   │   │   └── page.tsx                    # Product detail (single page)
│   │   ├── settings/
│   │   │   └── page.tsx                    # Logo upload + voorkeuren
│   │   └── api/
│   │       └── generate/
│   │           └── route.ts                # SSE endpoint voor AI generatie
│   ├── components/
│   │   ├── ui/                             # shadcn/ui componenten
│   │   ├── catalog/
│   │   │   ├── product-card.tsx            # Product card in grid
│   │   │   ├── product-grid.tsx            # Grid layout met zoeken
│   │   │   └── search-bar.tsx              # Zoekbalk
│   │   ├── product/
│   │   │   ├── product-header.tsx          # Naam, specs, stappen-indicator
│   │   │   ├── source-image-selector.tsx   # Catalogus/upload toggle
│   │   │   ├── image-type-cards.tsx        # Foto-type selectie cards
│   │   │   ├── image-settings.tsx          # Aspect ratio, resolutie
│   │   │   ├── generation-progress.tsx     # Voortgangsbalk + per-type status
│   │   │   ├── generated-images-review.tsx # Review grid met approve/reject
│   │   │   ├── floriday-sync.tsx           # Sync naar Floriday sectie
│   │   │   └── step-indicator.tsx          # Visuele stappen-indicator
│   │   ├── logo-overlay/
│   │   │   └── logo-editor.tsx             # Canvas-based logo plaatser
│   │   └── shared/
│   │       ├── image-grid.tsx              # Herbruikbare image grid
│   │       ├── image-lightbox.tsx          # Groot bekijken
│   │       └── confirm-dialog.tsx          # Bevestigingsdialoog
│   ├── lib/
│   │   ├── gemini/
│   │   │   ├── client.ts                   # Gemini API client (retry, timeout)
│   │   │   └── prompts.ts                  # Prompt templates + variabele vervanging
│   │   ├── generation/
│   │   │   ├── pipeline.ts                 # Orchestratie: welke types, in welke volgorde
│   │   │   └── cart-calculator.ts          # DC plank berekening
│   │   ├── types.ts                        # TypeScript types
│   │   └── utils.ts                        # Helpers
│   └── data/
│       └── products.json                   # Dummy catalogus (30+ producten)
├── public/
│   └── images/
│       ├── products/                       # Originele product images uit Floriday
│       └── examples/                       # Voorbeeld-thumbnails per foto-type
├── .env.local                              # GEMINI_API_KEY
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 11. Succescriteria Demo

| Criterium | Meetbaar |
|---|---|
| **Werkt live** | AI genereert daadwerkelijk foto's in de demo (niet pre-generated) |
| **Alle foto-types** | Alle 8 types worden gegenereerd en getoond |
| **Conditionele logica** | Tray en seizoensfoto worden correct enabled/disabled |
| **Kar-berekening** | DC visualisatie gebruikt echte belading data |
| **Review flow** | Goedkeuren/afkeuren werkt per foto |
| **Sync simulatie** | "Push naar Floriday" flow is visueel overtuigend |
| **Logo overlay** | Kweker kan logo plaatsen op foto's |
| **Responsive** | Werkt op desktop (primair) en tablet |
| **Snel geladen** | Cataloguspagina laadt in < 2 seconden |
| **Nederlandse UI** | Alle tekst in het Nederlands |
| **Begrijpelijk** | Een kweker-medewerker snapt de flow zonder uitleg |

---

## 12. Besluiten (voorheen Open Vragen)

Alle open vragen zijn opgelost op 2026-02-06:

1. **Detail-inset formaat**: **Cirkel**, ~25% van beeldbreedte, links-onder gepositioneerd. Referentie: Eden Collection composiet foto's.

2. **Tray grid-logica**: **AI genereert een visueel overtuigende tray** — geen exacte berekening nodig. De AI bepaalt zelf een logische indeling op basis van potdiameter.

3. **Bloeiende soorten**: `canBloom: true` is de **standaard voor alle niet-artificial planten**. Seizoensfoto wordt standaard aangeboden als optie, behalve bij kunstplanten (`isArtificial: true`).

4. **Kar hoogte-verdeling**: **Logisch opgebouwd op basis van het aantal lagen** uit de carrier/belading data. De AI ontvangt het aantal lagen en de planthoogte als context.

5. **Dummy product images**: **Extractie uit Floriday screenshots**. Productdata (naam, potmaat, hoogte, belading, categorie) wordt afgelezen van de screenshots.

6. **Prompts taal**: **Engels** — Gemini reageert hier beter op. De UI blijft volledig in het Nederlands.

7. **Vercel deploy**: Team **bespoke-automation** op `https://vercel.com/bespoke-automation`.

---

## 13. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|---|---|---|
| **Gemini genereert inconsistente kwaliteit** | Hoog | Retry logica + mogelijkheid om opnieuw te genereren |
| **Meetlat niet accuraat door AI** | Medium | AI genereert visueel overtuigende meetlat; voor productie eventueel hybride aanpak |
| **Logo overlay complexiteit** | Medium | Canvas API is bewezen technologie; eenvoudige implementatie |
| **API rate limits Gemini** | Laag | Sequentiële verwerking waar nodig; retry met backoff |
| **Grote base64 images in geheugen** | Medium | Vercel Blob voor opslag i.p.v. in-memory; lazy loading |
| **Demo-snelheid (10-30s per foto)** | Medium | Loading states, animaties, stap-voor-stap voortgang |

---

## 14. Planning Indicatie

### Fase 1: Fundament (dag 1-2)
- Next.js project setup + Vercel deploy
- Dummy data JSON samenstellen (30+ producten uit screenshots)
- Cataloguspagina met zoeken
- Product detail page layout (lege secties)

### Fase 2: AI Engine (dag 3-4)
- Gemini client met retry logica
- Prompt templates
- SSE endpoint voor generatie voortgang
- Generatie pipeline (witte achtergrond eerst, dan parallel)

### Fase 3: Product Page (dag 5-6)
- Source image selectie
- Foto-type cards met conditionele logica
- Generatie voortgang UI
- Review & approve flow

### Fase 4: Polish (dag 7-8)
- Logo overlay tool (Canvas)
- Sync naar Floriday simulatie
- Stappen-indicator
- Responsive tweaks
- Nederlandse teksten
- Kleurenpalet + styling verfijning

---

*Dit document is het resultaat van een brainstorm sessie op 2026-02-06 tussen Kenny (product owner) en Mary (Business Analyst). Het vormt de basis voor de technische implementatie van de Floriday Content Generator demo.*
