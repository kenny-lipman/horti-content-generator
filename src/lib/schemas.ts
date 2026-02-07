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
