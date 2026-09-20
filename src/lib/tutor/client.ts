import type { TutorInput, TutorResult } from '@/types/tutor'
import type { TutorResponse } from '@/types/tutor'
import { tutorResponseSchema } from '@/lib/tutor/actions'

export async function submitTutorInput(input: TutorInput): Promise<TutorResult> {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as TutorResponse & { error?: string }

  if (!response.ok) {
    return {
      actions: [],
      assistantMessage: '',
      actionLog: [],
      error: payload.error ?? 'The tutor request failed.',
    }
  }

  const parsed = tutorResponseSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      actions: [],
      assistantMessage: '',
      actionLog: [],
      error: 'The AI returned an invalid canvas action. Nothing was changed.',
    }
  }

  return {
    actions: parsed.data.actions,
    assistantMessage: parsed.data.assistantMessage,
    actionLog: [],
  }
}
