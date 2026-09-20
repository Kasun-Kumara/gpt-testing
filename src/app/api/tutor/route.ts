import { NextResponse } from 'next/server'
import { generateTutorResponse, isTutorProviderConfigured, TutorProviderError } from '@/lib/ai/provider'
import { tutorRequestSchema } from '@/lib/tutor/actions'
import { trimContextForRequest } from '@/lib/tutor/context'
import { hasEnglishContent, normalizeEnglishCommand } from '@/lib/speech/english-only'

export async function GET() {
  return NextResponse.json({ configured: isTutorProviderConfigured() })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const parsedRequest = tutorRequestSchema.safeParse(body)
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: 'Invalid tutor request. Check message and context fields.' },
      { status: 400 }
    )
  }

  const { message, context } = parsedRequest.data
  const englishMessage = normalizeEnglishCommand(message)

  if (!englishMessage || !hasEnglishContent(englishMessage)) {
    return NextResponse.json(
      { error: 'Please speak in English only. Non-English words were ignored.' },
      { status: 400 }
    )
  }

  try {
    const response = await generateTutorResponse(englishMessage, trimContextForRequest(context))
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof TutorProviderError) {
      const status = error.code === 'CONFIG' ? 503 : error.code === 'VALIDATION' ? 502 : 502
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ error: 'Unexpected tutor server error.' }, { status: 500 })
  }
}
