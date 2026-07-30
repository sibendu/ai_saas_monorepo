import type { ApiResponse } from '@saas/shared-types'

function isJsonResponse(response: Response): boolean {
  return response.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false
}

export async function readApiResponse<T>(
  response: Response,
  fallbackError: string
): Promise<ApiResponse<T>> {
  if (!isJsonResponse(response)) {
    return {
      success: false,
      error:
        response.status === 401 || response.status === 403
          ? 'Your admin session is no longer active. Please sign in again.'
          : `${fallbackError}. The server returned an unexpected response.`,
    }
  }

  try {
    return (await response.json()) as ApiResponse<T>
  } catch {
    return {
      success: false,
      error: `${fallbackError}. The server returned malformed JSON.`,
    }
  }
}
