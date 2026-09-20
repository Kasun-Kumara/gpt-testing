# GPT Live Whiteboard

A Next.js app that turns **spoken commands** into a live **tldraw whiteboard**, using **GPT-Live** (`gpt-live-1`) on **Microsoft Foundry**.

Tap the microphone, say something like *"draw a green circle and an arrow to a rectangle"*, and the board draws while the tutor talks back.

```text
You speak  →  GPT-Live (voice)  →  transcript pause
                                 →  chat model (drawing actions)
                                 →  tldraw canvas + spoken commentary
```

## Quick start

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), tap the microphone, allow the mic, then talk.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `AZURE_FOUNDRY_ENDPOINT` | Yes | Foundry endpoint URL |
| `AZURE_FOUNDRY_API_KEY` | Yes | Foundry API key |
| `AZURE_FOUNDRY_MODEL` | Yes | Voice deployment (`gpt-live-1`) |
| `AZURE_FOUNDRY_TUTOR_MODEL` | Yes | Chat deployment for drawing (`gpt-4o`) |

## Project layout

```text
src/
  app/
    page.tsx                      # Speech + whiteboard screen
    api/live/session/route.ts     # GPT-Live WebRTC session
    api/tutor/route.ts            # Speech → drawing actions
  components/
    speech-whiteboard.tsx         # Mic, transcripts, tldraw stage
    TutorCanvas.tsx
  lib/
    azure-foundry.ts
    tutor/                        # Action schema + tldraw executor
    ai/provider.ts                # Chat model for drawing plans
Whiteboard/                       # Original standalone tutor app
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |
