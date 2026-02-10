import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helper: create a chainable Supabase query-builder mock.
// Every method returns `this` (the chain), and the chain is thenable so it
// resolves to `result` when awaited — just like the real Supabase client.
// ---------------------------------------------------------------------------
function createChainMock(result: Record<string, unknown>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & { then: (resolve: (v: unknown) => void) => void } = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    rpc: vi.fn(),
    then: (resolve) => resolve(result),
  }

  // Every chainable method returns the chain itself
  for (const key of Object.keys(chain)) {
    if (key === 'then') continue
    ;(chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  }

  return chain
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------
let chain: ReturnType<typeof createChainMock>

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => chain,
  createClient: vi.fn(),
}))

vi.mock('@/lib/data/generation-utils', () => ({
  toDbImageType: (t: string) => t.replace(/-/g, '_'),
  toLegacyImageType: (t: string) => t.replace(/_/g, '-'),
}))

// Import AFTER mocks are registered
const { hasActiveGenerationJob } = await import('../generation')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('hasActiveGenerationJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when no active jobs exist (count = 0)', async () => {
    chain = createChainMock({ count: 0, error: null })

    const result = await hasActiveGenerationJob('org-123')

    expect(result).toBe(false)
    expect(chain.from).toHaveBeenCalledWith('generation_jobs')
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    expect(chain.eq).toHaveBeenCalledWith('status', 'processing')
  })

  it('returns true when active jobs exist (count > 0)', async () => {
    chain = createChainMock({ count: 3, error: null })

    const result = await hasActiveGenerationJob('org-456')

    expect(result).toBe(true)
  })

  it('returns false (fail open) when a database error occurs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    chain = createChainMock({ count: null, error: { message: 'connection refused' } })

    const result = await hasActiveGenerationJob('org-789')

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[hasActiveGenerationJob] Error:',
      'connection refused'
    )

    consoleSpy.mockRestore()
  })

  it('returns false when count is null and no error (defensive)', async () => {
    chain = createChainMock({ count: null, error: null })

    const result = await hasActiveGenerationJob('org-000')

    expect(result).toBe(false)
  })
})
