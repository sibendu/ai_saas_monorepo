import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('*/api/auth/forgot-password', async () => {
    return HttpResponse.json({
      message: 'If your account is eligible, a password reset link has been sent.',
    })
  }),
  http.post('*/api/auth/reset-password', async () => {
    return HttpResponse.json({
      message: 'Password reset successful',
      email: 'user@example.com',
    })
  }),
  http.get('*/api/user/roles', async () => {
    return HttpResponse.json({
      success: true,
      roles: [],
      modules: [],
    })
  }),
]
