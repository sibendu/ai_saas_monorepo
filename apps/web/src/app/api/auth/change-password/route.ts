import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { caseInsensitiveEquals, prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json()
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({ where: { email: caseInsensitiveEquals(email) } })
    if (!customer || customer.registrationType !== 'DIRECT') {
      return NextResponse.json({ error: 'Password changes are unavailable for this account' }, { status: 400 })
    }
    if (!(await bcrypt.compare(currentPassword, customer.password))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        forcePasswordChange: false,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    })

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Unable to change password' }, { status: 500 })
  }
}
