import OpenAI from "openai"

export type FoundryConfig = {
  endpoint?: string
  apiKey?: string
  defaultModel?: string
  extraModels: string[]
  configured: boolean
}

export function getFoundryConfig(): FoundryConfig {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT?.trim()
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY?.trim()
  const defaultModel = process.env.AZURE_FOUNDRY_MODEL?.trim()
  const extraModels = (process.env.AZURE_FOUNDRY_MODELS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    endpoint,
    apiKey,
    defaultModel,
    extraModels,
    configured: Boolean(endpoint && apiKey),
  }
}

export function normalizeFoundryBaseUrl(endpoint: string): string {
  let url = endpoint.trim().replace(/\/+$/, "")
  url = url.replace(/\/(chat\/completions|responses|models)$/i, "")

  if (/\/openai\/v1$/i.test(url)) {
    return url
  }

  if (/\/openai$/i.test(url)) {
    return `${url}/v1`
  }

  return `${url}/openai/v1`
}

export function getFoundryHost(endpoint?: string): string | null {
  if (!endpoint) {
    return null
  }

  try {
    return new URL(endpoint).host
  } catch {
    return null
  }
}

export function getFoundryClient() {
  const { endpoint, apiKey } = getFoundryConfig()

  if (!endpoint || !apiKey) {
    throw new Error("Azure Foundry is not configured. Add AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY to .env.local.")
  }

  return new OpenAI({
    apiKey,
    baseURL: normalizeFoundryBaseUrl(endpoint),
    defaultHeaders: {
      "api-key": apiKey,
    },
  })
}
