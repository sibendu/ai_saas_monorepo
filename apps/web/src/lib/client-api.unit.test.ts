import { describe, expect, it } from 'vitest'
import { readApiResponse } from '@/lib/client-api'

describe('client-api', () => {
  it('returns a useful error when an admin API responds with HTML', async () => {
    const response = new Response('<!DOCTYPE html><html></html>', {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    })

    await expect(readApiResponse(response, 'Failed to load role module access')).resolves.toEqual({
      success: false,
      error: 'Failed to load role module access. The server returned an unexpected response.',
    })
  })

  it('returns a session message for unauthorized non-JSON responses', async () => {
    const response = new Response('<!DOCTYPE html><html></html>', {
      status: 401,
      headers: {
        'Content-Type': 'text/html',
      },
    })

    await expect(readApiResponse(response, 'Failed to load role module access')).resolves.toEqual({
      success: false,
      error: 'Your admin session is no longer active. Please sign in again.',
    })
  })
})
