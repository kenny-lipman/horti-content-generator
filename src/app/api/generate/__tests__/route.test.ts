import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all dependencies BEFORE import
vi.mock('@/lib/data/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/data/products', () => ({
  getProductById: vi.fn(),
  toLegacyProduct: vi.fn((p: any) => ({ id: p.id, name: p.name })),
}))
vi.mock('@/lib/data/billing', () => ({
  reserveUsage: vi.fn(),
}))
vi.mock('@/lib/storage/images', () => ({
  isAllowedImageUrl: vi.fn(),
}))
vi.mock('@/lib/data/generation', () => ({
  createGenerationJob: vi.fn(),
}))
vi.mock('@/lib/generation/pipeline', () => ({
  runPipeline: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { POST } = await import('../route')
const { requireAuth } = await import('@/lib/data/auth')
const { getProductById } = await import('@/lib/data/products')
const { reserveUsage } = await import('@/lib/data/billing')
const { isAllowedImageUrl } = await import('@/lib/storage/images')
const { createGenerationJob } = await import('@/lib/data/generation')
const { runPipeline } = await import('@/lib/generation/pipeline')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_BODY = {
  productId: 'prod-123',
  sourceImageUrl:
    'https://jezipswnfifwxqsmpzwr.supabase.co/storage/v1/object/public/source-images/test.jpg',
  imageTypes: ['white-background'],
  settings: { aspectRatio: '1:1', resolution: '1024' },
}

const MOCK_DB_PRODUCT = {
  id: 'prod-123',
  name: 'Test Plant',
  organization_id: 'org-123',
}

// ---------------------------------------------------------------------------
// Setup happy-path defaults
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ userId: 'user-1', orgId: 'org-123' })
  vi.mocked(getProductById).mockResolvedValue(MOCK_DB_PRODUCT as any)
  vi.mocked(isAllowedImageUrl).mockReturnValue(true)
  vi.mocked(createGenerationJob).mockResolvedValue('job-123')
  vi.mocked(reserveUsage).mockResolvedValue({
    allowed: true,
    used: 5,
    limit: 100,
    remaining: 95,
  })
  vi.mocked(runPipeline).mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/generate', () => {
  it('returns 401 when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new Response(
        JSON.stringify({ error: 'Niet ingelogd' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('Niet ingelogd')
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.code).toBe('INVALID_INPUT')
  })

  it('returns 400 when validation fails (missing productId)', async () => {
    const body = { ...VALID_BODY, productId: undefined }

    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.code).toBe('INVALID_INPUT')
    expect(json.details).toBeDefined()
  })

  it('returns 404 when product is not found', async () => {
    vi.mocked(getProductById).mockResolvedValue(null as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.code).toBe('PRODUCT_NOT_FOUND')
  })

  it('returns 403 when product belongs to a different organization', async () => {
    vi.mocked(getProductById).mockResolvedValue({
      ...MOCK_DB_PRODUCT,
      organization_id: 'other-org',
    } as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('returns 400 when the source image URL is not allowed', async () => {
    vi.mocked(isAllowedImageUrl).mockReturnValue(false)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.code).toBe('INVALID_SOURCE_URL')
  })

  it('returns 429 when an active generation job already exists', async () => {
    vi.mocked(createGenerationJob).mockResolvedValue(null as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.code).toBe('GENERATION_IN_PROGRESS')
  })

  it('returns 429 when usage limit is reached', async () => {
    vi.mocked(reserveUsage).mockResolvedValue({
      allowed: false,
      used: 100,
      limit: 100,
      remaining: 0,
    })

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.code).toBe('USAGE_LIMIT_REACHED')
  })

  it('returns 200 SSE stream on success', async () => {
    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')

    // Verify the pipeline was called with the expected arguments
    expect(runPipeline).toHaveBeenCalledOnce()
    expect(runPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceImageUrl: VALID_BODY.sourceImageUrl,
        imageTypes: VALID_BODY.imageTypes,
        aspectRatio: '1:1',
        imageSize: '1024',
        organizationId: 'org-123',
        generationJobId: 'job-123',
      }),
    )
  })
})
