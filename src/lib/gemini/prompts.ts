import type { ImageType, Product } from "@/lib/types"

// ---------------------------------------------------------------------------
// Style preamble -- prepended to every prompt
// ---------------------------------------------------------------------------

export const STYLE_PREAMBLE = `Professional horticultural product photography for Floriday (Dutch flower trade platform). High-resolution, photorealistic output. Consistent studio lighting (5500K daylight). Tack-sharp focus.`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptConfigEntry {
  template: (product: Product, options?: PromptOptions) => string
  temperature: number
  defaultAspectRatio: string
}

interface PromptOptions {
  logoDescription?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeightDescription(heightCm: number): string {
  if (heightCm <= 40) return "a small tabletop plant"
  if (heightCm <= 80) return "a medium-sized plant"
  if (heightCm <= 120) return "a tall floor-standing plant"
  if (heightCm <= 160) return "a large floor-standing plant"
  return "a very tall statement plant"
}

function getPlantDisplayName(name: string): string {
  return name.replace(/^ARTIFICIAL\s+/i, "").replace(/\s*-\s*\d+cm$/i, "").trim()
}

/**
 * Simple deterministic hash from a string. Returns a positive 32-bit integer.
 */
function simpleHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

/**
 * Generate a deterministic seed from productId + imageType.
 */
export function getSeed(productId: string, imageType: ImageType): number {
  return simpleHash(`${productId}:${imageType}`)
}

// ---------------------------------------------------------------------------
// Lifestyle scene config per category
// ---------------------------------------------------------------------------

function getLifestyleScene(category: string, heightDescription: string): string {
  switch (category) {
    case "Tropical indoor":
      return `a modern Scandinavian living room with warm natural window lighting. The room has light oak flooring, a neutral-toned linen sofa, and minimalist decor. The plant is ${heightDescription} and should be positioned naturally in the room -- use nearby furniture (sofa armrest, side table, bookshelf) as scale references to convey the plant's true size. The atmosphere is warm and inviting, like a professional interior design magazine photograph.`
    case "mediterranean outdoor":
      return `a Mediterranean terrace or garden setting bathed in natural sunlight. The scene includes terracotta tiles, a wrought-iron bistro table, and olive or lavender accents in the background. The plant is ${heightDescription} and should be positioned naturally on the terrace -- use nearby furniture (table, chair, planter) as scale references. The light is warm golden-hour sunlight creating soft shadows. Professional outdoor lifestyle photography.`
    case "Artificial Plants":
      return `a modern office or commercial space with sleek contemporary design. The scene includes a clean desk, minimalist shelving, or a reception area with polished concrete or light wood surfaces. The plant is ${heightDescription} and should be positioned naturally in the space -- use nearby furniture (desk, shelf unit, reception counter) as scale references. Cool, even professional lighting. The setting should emphasize how the artificial plant enhances a professional environment.`
    default:
      return `a modern, well-lit interior space. The plant is ${heightDescription} and should be positioned naturally in the room with nearby furniture as scale references. Professional interior photography with warm natural lighting.`
  }
}

// ---------------------------------------------------------------------------
// PROMPT_CONFIG -- the main configuration record
// ---------------------------------------------------------------------------

export const PROMPT_CONFIG: Record<ImageType, PromptConfigEntry> = {
  "white-background": {
    temperature: 0.3,
    defaultAspectRatio: "1:1",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      return `${STYLE_PREAMBLE}

Remove the background from this plant photo completely. Place the ${plantName} on a pure white background (#FFFFFF). Keep the exact proportions, colors, and details of the plant and its pot. Maintain original resolution and detail. The result should look like a professional product photograph suitable for an e-commerce catalog. Include a very subtle contact shadow at the base for natural grounding. Do not add reflections or additional elements. The plant must remain exactly as shown in the source image.`
    },
  },

  "measuring-tape": {
    temperature: 0.3,
    defaultAspectRatio: "3:4",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      const height = product.plantHeight
      return `${STYLE_PREAMBLE}

This is a product photo of a ${plantName} (${height}cm tall) for the professional horticultural trade platform Floriday. Using the source image as a reference for the plant's appearance, generate a new image with the following specifications:

1. First, remove the background from the source plant photo and place the plant on a pure white background.
2. On the LEFT side of the image, add a standard gray plastic measuring ruler -- the kind commonly used in nursery/horticultural photography. The ruler must:
   - Start at 0cm at the very bottom of the pot base
   - End at exactly ${height}cm at the top of the plant
   - Show EXACT centimeter markings as small tick lines along its length
   - Display clearly legible numbers at every 10cm interval (0, 10, 20, 30... ${Math.floor(height / 10) * 10})
   - Show slightly longer tick marks at every 5cm interval
   - Have a flat, straight, professional appearance (standard gray measuring ruler)
   - Be positioned close to the plant but not overlapping it

The ruler must be proportionally accurate -- the distance between markings must correspond to the actual plant height shown. The numbers and tick marks must be sharp and easy to read. White background. No other elements.`
    },
  },

  "detail": {
    temperature: 0.5,
    defaultAspectRatio: "1:1",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      const foliageFocus = product.isArtificial
        ? `Focus on the craftsmanship, material quality, and realistic appearance of the artificial foliage. Highlight the texture of the synthetic leaves, the quality of the coloring, and the attention to detail that makes this artificial plant lifelike.`
        : `Focus on the natural leaf texture, veining patterns, color gradients, and surface details. Highlight the health, vibrancy, and botanical character of the living foliage.`

      return `${STYLE_PREAMBLE}

Generate a detailed close-up photograph of the leaves and foliage of this ${plantName}. Use a shallow depth of field (bokeh effect) to create a professional macro lens aesthetic -- the foreground subject should be tack-sharp while the background softly blurs. ${foliageFocus} Fill the entire frame with the foliage detail. Soft, diffused natural lighting highlighting the quality of the plant material.`
    },
  },

  "composite": {
    temperature: 0.4,
    defaultAspectRatio: "1:1",
    template: (product, options) => {
      const plantName = getPlantDisplayName(product.name)
      const logoInstruction = options?.logoDescription
        ? `In the top-right corner, include a small, tasteful logo element: ${options.logoDescription}. The logo should be subtle and not overpower the product.`
        : ``

      return `${STYLE_PREAMBLE}

Create a professional product catalog composite image for this ${plantName}. The layout should follow a clean, professional catalog style:

1. MAIN IMAGE (approximately 75% of the frame): The plant on a pure white background, showing the full plant including the pot. Maintain exact proportions and colors from the source photo. Include a very subtle contact shadow at the base.

2. DETAIL INSET (bottom-right corner): A circular inset showing a close-up of the foliage -- leaf texture, color, and quality details. The circle should have a thin white border (2-3px) and a subtle drop shadow. Size approximately 25% of the image width.

${logoInstruction}

The overall composition should be clean, balanced, and look like a professional horticultural catalog page. Pure white background for the main area. No text overlays or labels.`
    },
  },

  "tray": {
    temperature: 0.4,
    defaultAspectRatio: "1:1",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      const perLayer = product.carrier.perLayer
      const fustCode = product.carrier.fustCode
      const potDiameter = product.potDiameter

      // fustCode 800 = "Aanvoer zonder fust" (delivered without tray)
      if (fustCode === 800) {
        return `${STYLE_PREAMBLE}

Show ${perLayer} of these ${plantName} plants (each in a ${potDiameter}cm pot) arranged in a neat group as they would be delivered loose -- without a tray or container (fustcode 800: "Aanvoer zonder fust"). The plants are typically delivered directly on the Danish trolley shelf. Arrange ${perLayer} plants in a natural grid pattern that fits the shelf space based on the ${potDiameter}cm pot size. Professional product photography from a slightly elevated 3/4 angle on a white background. The arrangement should show how ${perLayer} plants per shelf look when delivered without packaging.`
      }

      const fustType = product.carrier.fustType || "tray"
      return `${STYLE_PREAMBLE}

Show ${perLayer} of these ${plantName} plants arranged in a standard nursery shipping ${fustType.toLowerCase()} for the Dutch flower auction (Floriday). The plants are in ${potDiameter}cm pots. Arrange exactly ${perLayer} plants in a realistic grid pattern that fits the ${fustType.toLowerCase()} naturally based on the pot size. This is one shelf's worth of product: ${perLayer} plants per tray. The ${fustType.toLowerCase()} should look like a typical black plastic horticultural transport container used in the Dutch flower trade. Professional product photography on a white background. Show the tray from a slightly elevated 3/4 angle.`
    },
  },

  "lifestyle": {
    temperature: 0.8,
    defaultAspectRatio: "1:1",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      const heightDescription = getHeightDescription(product.plantHeight)
      const scene = getLifestyleScene(product.category, heightDescription)

      return `${STYLE_PREAMBLE}

Place this ${plantName} plant in ${scene} The plant must maintain its exact appearance, proportions, and pot from the source photo -- it should look like the real plant was placed in this setting. The plant is the focal point of the scene. Professional lifestyle photography with natural depth of field.`
    },
  },

  "seasonal": {
    temperature: 0.6,
    defaultAspectRatio: "1:1",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)

      if (product.isArtificial) {
        return `${STYLE_PREAMBLE}

Show this artificial ${plantName} exactly as it appears in the source photo. Since this is an artificial plant, it does not have a natural blooming cycle. Present it in its standard form on a pure white background. Professional catalog photography maintaining exact proportions and details.`
      }

      return `${STYLE_PREAMBLE}

Show this ${plantName} plant in a natural, realistic blooming state during its peak flowering season. Show a botanically accurate representation of how this species naturally flowers. Do not exaggerate the number or size of blooms -- the flowering should look authentic and true to the species' natural appearance. The plant should maintain the same pot, proportions, and overall structure as the source photo. Only the addition of species-appropriate flowers/blooms should differ from the original. Place on a pure white background. Professional horticultural catalog photography style.`
    },
  },

  "danish-cart": {
    temperature: 0.3,
    defaultAspectRatio: "3:4",
    template: (product) => {
      const plantName = getPlantDisplayName(product.name)
      const { layers, perLayer } = product.carrier
      const height = product.plantHeight
      const potDiameter = product.potDiameter

      const singleLayerNote = layers === 1
        ? `Since there is only 1 layer, position the shelf at an appropriate height from the ground based on the plant height (${height}cm), not at the very top of the trolley. The shelf should be at a practical loading/viewing height.`
        : `Distribute the ${layers} shelves evenly across the trolley height with appropriate spacing for ${height}cm tall plants.`

      return `${STYLE_PREAMBLE}

Show ${perLayer} of these ${plantName} plants (each in a ${potDiameter}cm pot, ${height}cm tall) arranged on a standard Danish trolley (Deense Container / DC).

Trolley specifications:
- Overall dimensions: 1350mm wide x 565mm deep x 1900mm tall
- Each shelf: 1275mm x 545mm usable space
- Silver/gray metal frame with black rubber wheels
- ${layers} horizontal shelves

Each shelf holds exactly ${perLayer} plants arranged in a neat grid pattern. ${singleLayerNote}

Show the trolley from a 3/4 front-right angle so all ${layers} shelves are clearly visible. The plants on each shelf should be evenly spaced and stable. Professional horticultural trade photography, clean white/light gray studio background.`
    },
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the full prompt for a given image type and product.
 * Accepts the full Product type and uses its properties for context-aware prompts.
 */
export function buildPrompt(
  imageType: ImageType,
  product: Product,
  options?: PromptOptions
): string {
  const config = PROMPT_CONFIG[imageType]
  if (!config) {
    return `${STYLE_PREAMBLE}\n\nGenerate a professional photograph of a ${getPlantDisplayName(product.name)} plant.`
  }

  return config.template(product, options)
}

/**
 * Get the prompt configuration (temperature + default aspect ratio) for an image type.
 */
export function getPromptConfig(imageType: ImageType): {
  temperature: number
  defaultAspectRatio: string
} {
  const config = PROMPT_CONFIG[imageType]
  if (!config) {
    return { temperature: 0.4, defaultAspectRatio: "1:1" }
  }
  return {
    temperature: config.temperature,
    defaultAspectRatio: config.defaultAspectRatio,
  }
}

/**
 * Build a combination prompt for a plant + accessory in a scene.
 * Used with multi-source Gemini request (plant image + accessory image).
 */
export function buildCombinationPrompt(
  plant: Product,
  accessory: { name: string; type?: string; material?: string; color?: string },
  scenePrompt: string
): string {
  const plantName = getPlantDisplayName(plant.name)
  const accDesc = [
    accessory.name,
    accessory.material && `made of ${accessory.material}`,
    accessory.color && `in ${accessory.color}`,
  ].filter(Boolean).join(', ')

  return `${STYLE_PREAMBLE}

Create a professional lifestyle photograph combining these two products:

PLANT (first image): ${plantName}, ${plant.plantHeight}cm tall, currently in a ${plant.potDiameter}cm nursery pot.
ACCESSORY (second image): ${accDesc}.

Remove the plant from its nursery pot and place it IN the accessory (if it's a pot, vase, or container) or NEXT TO the accessory (if it's a stand, decoration, or packaging). The combination should look natural and commercially appealing.

SCENE INSTRUCTIONS:
${scenePrompt}

IMPORTANT RULES:
- The plant must maintain its exact appearance, proportions, and foliage from the first source image
- The accessory must maintain its exact appearance, material, and color from the second source image
- The combination should look like a real product photo — not composited or artificial
- Professional lighting consistent with a high-end product catalog
- Both products are the focal point of the scene
- Ensure realistic scale: the plant height (${plant.plantHeight}cm) and pot diameter (${plant.potDiameter}cm) should guide how the plant fits with the accessory`
}

/**
 * Get the raw prompt template string for an image type (for preview/debugging).
 * Renders the template with a placeholder product.
 */
export function getPromptTemplate(imageType: ImageType): string {
  const config = PROMPT_CONFIG[imageType]
  if (!config) return ""

  const placeholder: Product = {
    id: "preview",
    name: "Plant Name",
    sku: "",
    vbnCode: "",
    category: "Tropical indoor",
    carrier: {
      fustCode: 212,
      fustType: "Tray",
      carriageType: "DC",
      layers: 4,
      perLayer: 8,
      units: 32,
    },
    potDiameter: 17,
    plantHeight: 100,
    availability: "",
    catalogImage: "",
    isArtificial: false,
    canBloom: true,
  }

  return config.template(placeholder)
}
