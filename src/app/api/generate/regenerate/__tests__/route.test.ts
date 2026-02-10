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
  releaseUsage: vi.fn(),
}))
vi.mock('@/lib/storage/images', () => ({
  isAllowedImageUrl: vi.fn(),
  generateStoragePath: vi.fn(() => 'org/prod/type-123.png'),
  uploadImage: vi.fn(() => 'https://example.com/image.png'),
}))
vi.mock('@/lib/data/generation', () => ({
  createGeneratedImage: vi.fn(() => 'gen-img-123'),
}))
vi.mock('@/lib/gemini/client', () => ({
  generateImage: vi.fn(),
  imageUrlToBase64: vi.fn(),
}))
vi.mock('@/lib/gemini/prompts', () => ({
  buildPrompt: vi.fn(() => 'test prompt'),
  getPromptConfig: vi.fn(() => ({ temperature: 0.7 })),
  getSeed: vi.fn(() => 42),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { POST } = await import('../route')
const { requireAuth } = await import('@/lib/data/auth')
const { getProductById } = await import('@/lib/data/products')
const { reserveUsage, releaseUsage } = await import('@/lib/data/billing')
const { isAllowedImageUrl } = await import('@/lib/storage/images')
const { generateImage, imageUrlToBase64 } = await import('@/lib/gemini/client')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/generate/regenerate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_BODY = {
  productId: 'prod-123',
  sourceImageUrl:
    'https://jezipswnfifwxqsmpzwr.supabase.co/storage/v1/object/public/source-images/test.jpg',
  imageType: 'white-background',
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
  vi.mocked(reserveUsage).mockResolvedValue({
    allowed: true,
    used: 5,
    limit: 100,
    remaining: 95,
  })
  vi.mocked(imageUrlToBase64).mockResolvedValue({
    base64: 'abc',
    mimeType: 'image/png',
  })
  vi.mocked(generateImage).mockResolvedValue({
    success: true,
    imageBase64: 'xyz',
    mimeType: 'image/png',
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/generate/regenerate', () => {
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

  it('returns 400 when validation fails (missing imageType)', async () => {
    const body = { productId: 'prod-123', sourceImageUrl: VALID_BODY.sourceImageUrl }

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

  it('returns 500 and releases usage when image generation fails', async () => {
    vi.mocked(generateImage).mockResolvedValue({
      success: false,
      error: 'AI error',
    } as any)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.code).toBe('GENERATION_FAILED')
    expect(json.error).toBe('AI error')

    // Verify usage was released after failure
    expect(releaseUsage).toHaveBeenCalledWith('org-123', 1)
  })

  it('returns 200 with imageUrl on success', async () => {
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.imageUrl).toBe('https://example.com/image.png')
    expect(json.imageType).toBe('white-background')
    expect(json.generatedImageId).toBe('gen-img-123')

    // Verify usage was NOT released on success
    expect(releaseUsage).not.toHaveBeenCalled()
  })
})
