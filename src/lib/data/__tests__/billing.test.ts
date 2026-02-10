import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase server module (dynamic import target for reserveUsage/releaseUsage)
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ rpc: mockRpc }),
  createClient: vi.fn(),
}))

// Import AFTER mock setup
const { reserveUsage, releaseUsage } = await import('../billing')

describe('reserveUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the RPC result when usage is allowed', async () => {
    const rpcResult = { allowed: true, used: 5, limit: 100, remaining: 95 }
    mockRpc.mockResolvedValue({ data: rpcResult, error: null })

    const result = await reserveUsage('org-123', 3)

    expect(mockRpc).toHaveBeenCalledWith('reserve_generation_usage', {
      p_organization_id: 'org-123',
      p_requested_count: 3,
    })
    expect(result).toEqual(rpcResult)
  })

  it('returns the RPC result when usage is denied (limit reached)', async () => {
    const rpcResult = { allowed: false, used: 100, limit: 100, remaining: 0 }
    mockRpc.mockResolvedValue({ data: rpcResult, error: null })

    const result = await reserveUsage('org-456', 1)

    expect(result).toEqual(rpcResult)
    expect(result.allowed).toBe(false)
  })

  it('returns a permissive fallback when the RPC call errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection timeout' } })

    const result = await reserveUsage('org-789', 2)

    expect(result).toEqual({
      allowed: true,
      used: 0,
      limit: null,
      remaining: null,
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      '[reserveUsage] RPC error:',
      'connection timeout'
    )

    consoleSpy.mockRestore()
  })
})

describe('releaseUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the RPC to release usage without throwing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await expect(releaseUsage('org-123', 5)).resolves.toBeUndefined()

    expect(mockRpc).toHaveBeenCalledWith('release_generation_usage', {
      p_organization_id: 'org-123',
      p_release_count: 5,
    })
  })

  it('logs an error but does not throw when the RPC fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc unavailable' } })

    await expect(releaseUsage('org-123', 2)).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith(
      '[releaseUsage] RPC error:',
      'rpc unavailable'
    )

    consoleSpy.mockRestore()
  })
})
