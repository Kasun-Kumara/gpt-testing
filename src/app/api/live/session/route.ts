import { NextResponse } from "next/server"

import { getFoundryClient, getFoundryConfig } from "@/lib/azure-foundry"

export async function GET() {
  const config = getFoundryConfig()

  return NextResponse.json({
    configured: config.configured,
    model: config.defaultModel ?? "gpt-live-1",
  })
}

export async function POST(request: Request) {
  const config = getFoundryConfig()

  if (!config.configured) {
    return NextResponse.json(
      {
        error:
          "Azure Foundry is not configured. Add AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY to .env.local.",
      },
      { status: 500 }
    )
  }

  const model = config.defaultModel ?? "gpt-live-1"
  let body: { sdp?: unknown }

  try {
    body = (await request.json()) as { sdp?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (typeof body.sdp !== "string" || !body.sdp.trim()) {
    return NextResponse.json({ error: "An SDP offer is required." }, { status: 400 })
  }

  try {
    const client = getFoundryClient()
    const result = await client.live.create(
      {
        session: {
          model,
          instructions:
            "You are a helpful voice assistant on a live call. The user speaks English only. Ignore any Hindi or other non-English words in the transcript and respond only in English. The browser owns the whiteboard. Talk normally for greetings, questions, and explanations. Create a client delegation only when the user explicitly asks to draw, sketch, show, diagram, write, connect, highlight, move, recolor, delete, or otherwise edit something on the whiteboard. Do not delegate for casual chat. When delegated, wait quietly while the browser draws. Do not describe shapes or claim you drew them. Speak only when commentary is appended about drawing results, in one or two short natural sentences.",
          audio: {
            output: {
              voice: "marin",
            },
          },
          delegation: {
            type: "client",
          },
        },
        transport: {
          type: "webrtc",
          sdp: body.sdp,
        },
      },
      { maxRetries: 0 }
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start GPT Live session."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
