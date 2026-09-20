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
cp .env.example .env.local   # Windows: copy .env.example .env.local
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
| `AZURE_FOUNDRY_MODELS` | No | Comma-separated extra model names |
| `AI_API_KEY` | No | Override tutor API key (defaults to Foundry key) |
| `AI_BASE_URL` | No | Override tutor endpoint (defaults to Foundry endpoint) |
| `AI_MODEL` | No | Override tutor model (defaults to `AZURE_FOUNDRY_TUTOR_MODEL`) |

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

## VM deployment (Docker + Caddy)

Production runs as a Docker container behind Caddy with automatic HTTPS at `https://whiteboard.knurdz.org`.

### First-time VM setup

1. **Make the GitHub repository public** (or configure a deploy key if you keep it private).
2. **Install Docker and the Compose plugin** on the VM.
3. **Point DNS** — create an `A` record for `whiteboard.knurdz.org` to the VM's public IP.
4. **Open firewall ports** — allow inbound TCP 80 and 443 (and optionally UDP 443 for HTTP/3).
5. **Allow outbound access** to GitHub, npm, Google Fonts, Azure Foundry, and Let's Encrypt (ACME).
6. **Bootstrap the VM checkout and secrets (one time):**

```bash
git clone https://github.com/Kasun-Kumara/gpt-testing.git ~/gpt-whiteboard
cd ~/gpt-whiteboard
cp .env.example .env.production
chmod 600 .env.production
# Edit .env.production with your Azure Foundry credentials
```

7. **Deploy on the VM:**

```bash
cd ~/gpt-whiteboard
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script will:

- Pull the latest `main` branch from GitHub
- Build a SHA-tagged Docker image and restart the stack
- Verify the app container health and `https://whiteboard.knurdz.org/api/health`
- Roll back to the previous image if the new release fails

Skip `git pull` if you already updated the checkout manually:

```bash
SKIP_GIT_PULL=1 ./scripts/deploy.sh
```

### Operations on the VM

```bash
cd ~/gpt-whiteboard

# Service status
docker compose ps

# Follow logs
docker compose logs -f app
docker compose logs -f caddy

# Restart without rebuilding
docker compose up -d --remove-orphans

# Manual rollback to a previous image tag
export APP_IMAGE_TAG=<previous-sha-short>
docker compose up -d --no-build --remove-orphans
```

### Security note

The `/api/live/session` and `/api/tutor` endpoints are publicly accessible and call Azure Foundry on every request. Anyone who discovers the URL can consume your Azure quota. Monitor usage and add authentication or rate limiting if needed.
