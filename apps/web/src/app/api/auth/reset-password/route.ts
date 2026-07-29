import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { hashPasswordResetToken } from '@/lib/password-reset'

export async function POST(req: Request) {
  try {
    const { code, token, password, confirmPassword } = await req.json()
    const resetToken = token ?? code

    if (!resetToken || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Token, password and confirm password are required' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    const hashedCode = hashPasswordResetToken(resetToken)

    const customer = await prisma.customer.findFirst({
      where: {
        passwordResetToken: hashedCode,
      },
    })

    if (!customer || customer.registrationType !== 'DIRECT') {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 })
    }

    if (!customer.passwordResetExpiresAt || customer.passwordResetExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    })

    return NextResponse.json(
      {
        message: 'Password reset successful',
        email: customer.email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
