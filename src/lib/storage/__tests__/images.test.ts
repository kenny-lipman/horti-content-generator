import { isAllowedImageUrl, generateStoragePath } from '../images'

describe('isAllowedImageUrl', () => {
  it('accepts a valid .co Supabase URL', () => {
    const url = 'https://jezipswnfifwxqsmpzwr.supabase.co/storage/v1/object/public/generated-images/test.png'
    expect(isAllowedImageUrl(url)).toBe(true)
  })

  it('accepts a valid .in Supabase URL', () => {
    const url = 'https://jezipswnfifwxqsmpzwr.supabase.in/storage/v1/object/public/source-images/photo.jpg'
    expect(isAllowedImageUrl(url)).toBe(true)
  })

  it('rejects HTTP (non-HTTPS) URLs', () => {
    const url = 'http://jezipswnfifwxqsmpzwr.supabase.co/storage/v1/object/public/test.png'
    expect(isAllowedImageUrl(url)).toBe(false)
  })

  it('rejects a URL with a wrong hostname', () => {
    const url = 'https://evil-attacker.com/storage/v1/object/public/test.png'
    expect(isAllowedImageUrl(url)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isAllowedImageUrl('')).toBe(false)
  })

  it('rejects a non-URL string', () => {
    expect(isAllowedImageUrl('not-a-url-at-all')).toBe(false)
  })

  it('rejects a relative path', () => {
    expect(isAllowedImageUrl('/storage/v1/object/public/test.png')).toBe(false)
  })
})

describe('generateStoragePath', () => {
  it('uses .png as the default extension', () => {
    const path = generateStoragePath('org-1', 'prod-1', 'white-bg')
    expect(path).toMatch(/\.png$/)
  })

  it('uses a custom extension when provided', () => {
    const path = generateStoragePath('org-1', 'prod-1', 'lifestyle', 'webp')
    expect(path).toMatch(/\.webp$/)
  })

  it('contains the organizationId, productId, and imageType', () => {
    const path = generateStoragePath('org-abc', 'prod-xyz', 'catalog')
    expect(path).toContain('org-abc')
    expect(path).toContain('prod-xyz')
    expect(path).toContain('catalog')
  })

  it('includes a numeric timestamp between imageType and extension', () => {
    const path = generateStoragePath('org-1', 'prod-1', 'social')
    // Expected format: org-1/prod-1/social-1234567890123.png
    const match = path.match(/social-(\d+)\.png$/)
    expect(match).not.toBeNull()
    // Timestamp should be a reasonable epoch millisecond value
    const timestamp = Number(match![1])
    expect(timestamp).toBeGreaterThan(1_000_000_000_000)
  })

  it('produces the correct path format: {orgId}/{productId}/{imageType}-{timestamp}.{ext}', () => {
    const before = Date.now()
    const path = generateStoragePath('org-42', 'prod-99', 'banner', 'jpg')
    const after = Date.now()

    const regex = /^org-42\/prod-99\/banner-(\d+)\.jpg$/
    const match = path.match(regex)
    expect(match).not.toBeNull()

    const timestamp = Number(match![1])
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})
