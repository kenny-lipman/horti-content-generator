import type { Product, ImageType } from "@/lib/types"
import { generateImage, imageUrlToBase64 } from "@/lib/gemini/client"
import { buildPrompt, getPromptConfig, getSeed } from "@/lib/gemini/prompts"
import { uploadImage, generateFilename } from "@/lib/blob/storage"

export interface PipelineJob {
  id: string
  imageType: ImageType
  status: "pending" | "generating" | "completed" | "failed"
  imageUrl?: string
  error?: string
  promptUsed?: string
  imageBase64?: string    // Keep in memory for chaining
  imageMimeType?: string
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
  onEvent: (event: PipelineEvent) => void
}

// Types that benefit from the clean white-background as source
const WHITE_BG_DEPENDENT_TYPES: ImageType[] = ["measuring-tape", "tray", "danish-cart"]

async function runJob(
  job: PipelineJob,
  product: Product,
  sourceBase64: string,
  sourceMimeType: string,
  aspectRatio?: string,
  imageSize?: string
): Promise<PipelineJob> {
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

  if (!result.success || !result.imageBase64 || !result.mimeType) {
    return {
      ...job,
      status: "failed",
      error: result.error || "Unknown generation error",
      promptUsed: prompt,
    }
  }

  // Upload to Vercel Blob
  const ext = result.mimeType.includes("png") ? "png" : "webp"
  const filename = generateFilename(product.id, job.imageType, ext)
  const imageUrl = await uploadImage(result.imageBase64, result.mimeType, filename)

  return {
    ...job,
    status: "completed",
    imageUrl,
    imageBase64: result.imageBase64,
    imageMimeType: result.mimeType,
    promptUsed: prompt,
  }
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineJob[]> {
  const { product, sourceImageUrl, imageTypes, aspectRatio, imageSize, onEvent } = options

  // No special composite dependency logic — all types are treated equally
  const allTypes = [...imageTypes]

  const jobs: PipelineJob[] = allTypes.map((type, i) => ({
    id: `job-${i}-${type}`,
    imageType: type,
    status: "pending",
  }))

  onEvent({ type: "batch-start", totalJobs: jobs.length })

  // Fetch source image as base64
  const { base64: sourceBase64, mimeType: sourceMimeType } =
    await imageUrlToBase64(sourceImageUrl)

  let successCount = 0
  let failedCount = 0

  // --- Phase 1: Generate white-background first (dependency for others) ---
  const whiteJob = jobs.find((j) => j.imageType === "white-background")
  let whiteBase64: string | null = null
  let whiteMimeType: string | null = null

  if (whiteJob) {
    onEvent({ type: "job-start", jobId: whiteJob.id, imageType: whiteJob.imageType })

    try {
      const whiteResult = await runJob(
        whiteJob,
        product,
        sourceBase64,
        sourceMimeType,
        aspectRatio,
        imageSize
      )
      Object.assign(whiteJob, whiteResult)

      if (whiteResult.status === "completed") {
        successCount++
        // Store white-background output for chaining to dependent types
        whiteBase64 = whiteResult.imageBase64 || null
        whiteMimeType = whiteResult.imageMimeType || null
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

    if (WHITE_BG_DEPENDENT_TYPES.includes(job.imageType) && whiteBase64 && whiteMimeType) {
      jobSourceBase64 = whiteBase64
      jobSourceMimeType = whiteMimeType
    }

    try {
      const result = await runJob(
        job,
        product,
        jobSourceBase64,
        jobSourceMimeType,
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

  // Clean up base64 data from jobs to free memory (no longer needed after upload)
  for (const job of jobs) {
    delete job.imageBase64
    delete job.imageMimeType
  }

  onEvent({ type: "batch-complete", successCount, failedCount })

  return jobs
}
