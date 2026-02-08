import type { Product, ImageType } from "@/lib/types"
import { generateImage, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildPrompt, getPromptConfig, getSeed } from "@/lib/gemini/prompts"
import { uploadImage, generateStoragePath } from "@/lib/storage/images"
import {
  createGenerationJob,
  updateGenerationJob,
  createGeneratedImage,
  trackGenerationUsage,
} from "@/lib/data/generation"

export interface PipelineJob {
  id: string
  imageType: ImageType
  status: "pending" | "generating" | "completed" | "failed"
  imageUrl?: string
  error?: string
  promptUsed?: string
  imageBase64?: string    // Keep in memory for chaining
  imageMimeType?: string
  generatedImageId?: string  // Database record ID
}

export type PipelineEvent =
  | { type: "batch-start"; totalJobs: number }
  | { type: "job-start"; jobId: string; imageType: ImageType }
  | {
      type: "job-complete"
      jobId: string
      imageType: ImageType
      imageUrl: string
    }
  | { type: "job-error"; jobId: string; imageType: ImageType; error: string }
  | { type: "batch-complete"; successCount: number; failedCount: number }

export interface PipelineOptions {
  product: Product
  sourceImageUrl: string
  imageTypes: ImageType[]
  aspectRatio?: string
  imageSize?: string
  organizationId: string
  sourceImageId?: string
  onEvent: (event: PipelineEvent) => void
}

// Types that benefit from the clean white-background as source
const WHITE_BG_DEPENDENT_TYPES: ImageType[] = ["measuring-tape", "tray", "danish-cart"]

async function runJob(
  job: PipelineJob,
  product: Product,
  sourceBase64: string,
  sourceMimeType: string,
  organizationId: string,
  sourceImageId?: string,
  parentImageId?: string,
  aspectRatio?: string,
  imageSize?: string
): Promise<PipelineJob> {
  const startTime = Date.now()
  const prompt = buildPrompt(job.imageType, product)
  const promptConfig = getPromptConfig(job.imageType)
  const seed = getSeed(product.id, job.imageType)

  const result = await generateImage({
    prompt,
    sourceImageBase64: sourceBase64,
    sourceMimeType,
    aspectRatio,
    imageSize,
    temperature: promptConfig.temperature,
    seed,
  })

  const durationMs = Date.now() - startTime

  if (!result.success || !result.imageBase64 || !result.mimeType) {
    // Record failed generation in database
    await createGeneratedImage({
      organizationId,
      productId: product.id,
      sourceImageId,
      parentImageId,
      imageType: job.imageType,
      imageUrl: '',
      status: 'failed',
      promptUsed: prompt,
      seed,
      temperature: promptConfig.temperature,
      generationDurationMs: durationMs,
      error: result.error || "Unknown generation error",
    })

    return {
      ...job,
      status: "failed",
      error: result.error || "Unknown generation error",
      promptUsed: prompt,
    }
  }

  // Upload to Supabase Storage
  const ext = result.mimeType.includes("png") ? "png" : "webp"
  const storagePath = generateStoragePath(organizationId, product.id, job.imageType, ext)
  const imageUrl = await uploadImage(result.imageBase64, result.mimeType, storagePath)

  // Record in database
  const generatedImageId = await createGeneratedImage({
    organizationId,
    productId: product.id,
    sourceImageId,
    parentImageId,
    imageType: job.imageType,
    imageUrl,
    status: 'completed',
    promptUsed: prompt,
    seed,
    temperature: promptConfig.temperature,
    generationDurationMs: durationMs,
  })

  return {
    ...job,
    status: "completed",
    imageUrl,
    imageBase64: result.imageBase64,
    imageMimeType: result.mimeType,
    promptUsed: prompt,
    generatedImageId: generatedImageId ?? undefined,
  }
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineJob[]> {
  const {
    product,
    sourceImageUrl,
    imageTypes,
    aspectRatio,
    imageSize,
    organizationId,
    sourceImageId,
    onEvent,
  } = options

  const allTypes = [...imageTypes]

  const jobs: PipelineJob[] = allTypes.map((type, i) => ({
    id: `job-${i}-${type}`,
    imageType: type,
    status: "pending",
  }))

  onEvent({ type: "batch-start", totalJobs: jobs.length })

  // Create generation job record in database
  const generationJobId = await createGenerationJob({
    organizationId,
    productId: product.id,
    imageTypes: allTypes,
  })

  // Fetch source image as base64
  const { base64: sourceBase64, mimeType: sourceMimeType } =
    await imageUrlToBase64(sourceImageUrl)

  let successCount = 0
  let failedCount = 0

  // --- Phase 1: Generate white-background first (dependency for others) ---
  const whiteJob = jobs.find((j) => j.imageType === "white-background")
  let whiteBase64: string | null = null
  let whiteMimeType: string | null = null
  let whiteGeneratedImageId: string | undefined

  if (whiteJob) {
    onEvent({ type: "job-start", jobId: whiteJob.id, imageType: whiteJob.imageType })

    try {
      const whiteResult = await runJob(
        whiteJob,
        product,
        sourceBase64,
        sourceMimeType,
        organizationId,
        sourceImageId,
        undefined,
        aspectRatio,
        imageSize
      )
      Object.assign(whiteJob, whiteResult)

      if (whiteResult.status === "completed") {
        successCount++
        whiteBase64 = whiteResult.imageBase64 || null
        whiteMimeType = whiteResult.imageMimeType || null
        whiteGeneratedImageId = whiteResult.generatedImageId
        onEvent({
          type: "job-complete",
          jobId: whiteJob.id,
          imageType: whiteJob.imageType,
          imageUrl: whiteResult.imageUrl!,
        })
      } else {
        failedCount++
        onEvent({
          type: "job-error",
          jobId: whiteJob.id,
          imageType: whiteJob.imageType,
          error: whiteResult.error || "Unknown error",
        })
      }
    } catch (err) {
      failedCount++
      whiteJob.status = "failed"
      whiteJob.error = err instanceof Error ? err.message : "Unknown error"
      onEvent({
        type: "job-error",
        jobId: whiteJob.id,
        imageType: whiteJob.imageType,
        error: whiteJob.error,
      })
    }
  }

  // --- Phase 2: Generate remaining types sequentially (rate limit friendly) ---
  const phase2Jobs = jobs.filter(
    (j) => j.imageType !== "white-background"
  )

  for (const job of phase2Jobs) {
    onEvent({ type: "job-start", jobId: job.id, imageType: job.imageType })

    // For dependent types, use white-background output as source if available
    let jobSourceBase64 = sourceBase64
    let jobSourceMimeType = sourceMimeType
    let parentImageId: string | undefined

    if (WHITE_BG_DEPENDENT_TYPES.includes(job.imageType) && whiteBase64 && whiteMimeType) {
      jobSourceBase64 = whiteBase64
      jobSourceMimeType = whiteMimeType
      parentImageId = whiteGeneratedImageId
    }

    try {
      const result = await runJob(
        job,
        product,
        jobSourceBase64,
        jobSourceMimeType,
        organizationId,
        sourceImageId,
        parentImageId,
        aspectRatio,
        imageSize
      )
      Object.assign(job, result)

      if (result.status === "completed") {
        successCount++
        onEvent({
          type: "job-complete",
          jobId: job.id,
          imageType: job.imageType,
          imageUrl: result.imageUrl!,
        })
      } else {
        failedCount++
        onEvent({
          type: "job-error",
          jobId: job.id,
          imageType: job.imageType,
          error: result.error || "Unknown error",
        })
      }
    } catch (err) {
      failedCount++
      job.status = "failed"
      job.error = err instanceof Error ? err.message : "Unknown error"
      onEvent({
        type: "job-error",
        jobId: job.id,
        imageType: job.imageType,
        error: job.error,
      })
    }
  }

  // Clean up base64 data from jobs to free memory
  for (const job of jobs) {
    delete job.imageBase64
    delete job.imageMimeType
  }

  // Update generation job in database
  if (generationJobId) {
    await updateGenerationJob(generationJobId, {
      completedImages: successCount,
      failedImages: failedCount,
      status: failedCount === jobs.length ? 'failed' : 'completed',
    })
  }

  // Track usage for billing
  await trackGenerationUsage(organizationId, successCount, failedCount)

  onEvent({ type: "batch-complete", successCount, failedCount })

  return jobs
}
