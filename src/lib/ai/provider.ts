import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"

import { getFoundryConfig, normalizeFoundryBaseUrl } from "@/lib/azure-foundry"
import { buildUserPrompt, TUTOR_SYSTEM_PROMPT } from "@/lib/ai/prompt"
import {
  normalizeTutorResponse,
  tutorActionSchema,
  tutorResponseProviderSchema,
  tutorResponseSchema,
} from "@/lib/tutor/actions"
import { normalizeEnglishCommand } from "@/lib/speech/english-only"
import { applyFillColorIntent } from "@/lib/tutor/fill-intent"
import { buildIconShortcutResponse } from "@/lib/tutor/icon-intent"
import {
  assessDrawingQuality,
  buildQualityRetryPrompt,
  sanitizeIllustrationActions,
} from "@/lib/tutor/quality"
import type { TutorCanvasContext, TutorResponse } from "@/types/tutor"

export class TutorProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "CONFIG" | "PROVIDER" | "VALIDATION"
  ) {
    super(message)
    this.name = "TutorProviderError"
  }
}

export function getTutorProviderConfig() {
  const foundry = getFoundryConfig()
  const apiKey = process.env.AI_API_KEY?.trim() || foundry.apiKey
  const endpoint = process.env.AI_BASE_URL?.trim() || foundry.endpoint
  const model =
    process.env.AI_MODEL?.trim() ||
    process.env.AZURE_FOUNDRY_TUTOR_MODEL?.trim()

  if (!apiKey || !endpoint || !model) {
    throw new TutorProviderError(
      "Whiteboard drawing needs a chat model. Set AZURE_FOUNDRY_TUTOR_MODEL to a chat-completions deployment such as gpt-4o, plus your Foundry endpoint and API key.",
      "CONFIG"
    )
  }

  return {
    apiKey,
    baseURL: normalizeFoundryBaseUrl(endpoint),
    model,
  }
}

export function isTutorProviderConfigured(): boolean {
  try {
    getTutorProviderConfig()
    return true
  } catch {
    return false
  }
}

async function requestTutorCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  try {
    return await client.chat.completions.create({
      model,
      messages,
      response_format: zodResponseFormat(
        tutorResponseProviderSchema,
        "tutor_response"
      ),
    })
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unknown provider error"
    throw new TutorProviderError(
      `Whiteboard model request failed: ${messageText}`,
      "PROVIDER"
    )
  }
}

function parseTutorCompletionContent(content: string | null | undefined): TutorResponse {
  if (!content) {
    throw new TutorProviderError(
      "Whiteboard model returned an empty response.",
      "PROVIDER"
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(content)
  } catch {
    throw new TutorProviderError(
      "Whiteboard model returned invalid JSON.",
      "VALIDATION"
    )
  }

  const parsedProvider = tutorResponseProviderSchema.safeParse(parsedJson)
  if (!parsedProvider.success) {
    throw new TutorProviderError(
      "Whiteboard model returned an invalid tutor response.",
      "VALIDATION"
    )
  }

  const normalized = normalizeTutorResponse(parsedProvider.data)

  for (const action of normalized.actions) {
    const parsedAction = tutorActionSchema.safeParse(action)
    if (!parsedAction.success) {
      throw new TutorProviderError(
        "Whiteboard model returned an invalid canvas action.",
        "VALIDATION"
      )
    }
  }

  const parsed = tutorResponseSchema.safeParse(normalized)
  if (!parsed.success) {
    throw new TutorProviderError(
      "Whiteboard model returned an invalid tutor response.",
      "VALIDATION"
    )
  }

  return parsed.data
}

export async function generateTutorResponse(
  message: string,
  context: TutorCanvasContext
): Promise<TutorResponse> {
  const englishMessage = normalizeEnglishCommand(message)
  const shortcut = buildIconShortcutResponse(englishMessage, context)
  if (shortcut) {
    return shortcut
  }

  const { apiKey, baseURL, model } = getTutorProviderConfig()

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      "api-key": apiKey,
    },
  })

  const initialMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: TUTOR_SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(englishMessage, context) },
  ]

  const initialCompletion = await requestTutorCompletion(
    client,
    model,
    initialMessages
  )
  let response = parseTutorCompletionContent(
    initialCompletion.choices[0]?.message?.content
  )
  response = {
    ...response,
    actions: applyFillColorIntent(englishMessage, response.actions),
  }

  const initialQuality = assessDrawingQuality(englishMessage, response.actions)
  if (!initialQuality.ok && initialQuality.feedback) {
    const retryCompletion = await requestTutorCompletion(client, model, [
      { role: "system", content: TUTOR_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(englishMessage, context) },
      {
        role: "user",
        content: buildQualityRetryPrompt(englishMessage, initialQuality.feedback),
      },
    ])

    response = parseTutorCompletionContent(
      retryCompletion.choices[0]?.message?.content
    )
    response = {
      ...response,
      actions: applyFillColorIntent(englishMessage, response.actions),
    }

    const retryQuality = assessDrawingQuality(message, response.actions)
    if (!retryQuality.ok) {
      throw new TutorProviderError(
        retryQuality.feedback ??
          "Whiteboard model returned an under-detailed drawing plan.",
        "VALIDATION"
      )
    }
  }

  return {
    ...response,
    actions: sanitizeIllustrationActions(englishMessage, response.actions),
  }
}
