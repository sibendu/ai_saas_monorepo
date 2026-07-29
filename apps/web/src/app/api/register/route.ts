import { NextResponse } from 'next/server'
import { startEmailActivationRegistration } from '@/lib/activation-registration'

export async function POST(req: Request) {
    try {
        const { name, email } = await req.json()

        const result = await startEmailActivationRegistration({
            name,
            email
        })

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Registration failed' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { message: 'Check your email for an activation link.' },
            { status: 201 }
        )
    } catch (error) {
        console.error('Registration API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
