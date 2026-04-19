/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Set environment variables before mocking
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock @supabase/ssr createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'

// We test the middleware logic by mocking getUser() return value
// and asserting the correct redirect behavior

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

describe('Middleware — unauthenticated redirect (AUTH-01, AUTH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated user from / to /login', async () => {
    // Mock: getClaims returns error (no auth token), getUser returns no user
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('No session') }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      cookies: {},
    } as any)

    const { updateSession } = await import('@/utils/supabase/middleware')
    const req = makeRequest('/')
    const response = await updateSession(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/login')
  })

  it('preserves ?redirect= query param pointing to original path', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('No session') }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      cookies: {},
    } as any)

    const { updateSession } = await import('@/utils/supabase/middleware')
    const req = makeRequest('/dashboard')
    const response = await updateSession(req)

    const location = response.headers.get('location') ?? ''
    expect(location).toContain('redirect=%2Fdashboard')
  })

  it('allows authenticated user through without redirect', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user-123' } }, error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
        }),
      },
      cookies: {},
    } as any)

    const { updateSession } = await import('@/utils/supabase/middleware')
    const req = makeRequest('/')
    const response = await updateSession(req)

    expect(response.status).not.toBe(307)
  })

  it('allows unauthenticated user to access /login without redirect', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('No session') }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      cookies: {},
    } as any)

    const { updateSession } = await import('@/utils/supabase/middleware')
    const req = makeRequest('/login')
    const response = await updateSession(req)

    expect(response.status).not.toBe(307)
  })
})
