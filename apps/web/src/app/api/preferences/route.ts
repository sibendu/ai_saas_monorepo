import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { validateProfilePayload } from '@/lib/profile'

function formatDateForInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findFirst({
      where: {
        email: session.user.email || '',
      },
      include: {
        addresses: {
          orderBy: { id: 'asc' },
        },
        contacts: {
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      firstName: customer.firstName,
      middleName: customer.middleName,
      lastName: customer.lastName,
      dob: formatDateForInput(customer.dob),
      company: customer.company,
      email: customer.email,
      addresses: customer.addresses.map((address) => ({
        type: address.type,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        addressLine3: address.addressLine3,
        city: address.city,
        district: address.district,
        state: address.state,
        country: address.country,
        pin: address.pin,
      })),
      contacts: customer.contacts.map((contact) => ({
        type: contact.type,
        countryCode: contact.countryCode,
        contact: contact.contact,
      })),
    })
  } catch (error) {
    console.error('Preferences fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = validateProfilePayload(await req.json())

    if (!validation.data) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid profile payload' },
        { status: 400 }
      )
    }

    const profile = validation.data
    const customer = await prisma.customer.findFirst({
      where: {
        email: session.user.email || '',
      },
      select: { id: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          firstName: profile.firstName,
          middleName: profile.middleName,
          lastName: profile.lastName,
          dob: profile.dobDate,
          name: profile.displayName,
          company: profile.company,
        },
      })

      await tx.userAddress.deleteMany({
        where: {
          customerId: customer.id,
        },
      })
      await tx.userContact.deleteMany({
        where: {
          customerId: customer.id,
        },
      })

      if (profile.addresses.length > 0) {
        await tx.userAddress.createMany({
          data: profile.addresses.map((address) => ({
            customerId: customer.id,
            type: address.type,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            addressLine3: address.addressLine3,
            city: address.city,
            district: address.district,
            state: address.state,
            country: address.country,
            pin: address.pin,
          })),
        })
      }

      if (profile.contacts.length > 0) {
        await tx.userContact.createMany({
          data: profile.contacts.map((contact) => ({
            customerId: customer.id,
            type: contact.type,
            countryCode: contact.countryCode,
            contact: contact.contact,
          })),
        })
      }
    })

    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 })
  } catch (error) {
    console.error('Preferences update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
