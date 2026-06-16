# Bowly AI

Practice with confidence.

Bowly AI is a gentle AI music practice companion for young musicians.

Using camera observation, audio intelligence, emotional coaching, and long-term progress memory, Bowly helps children practice violin with more confidence, consistency, and motivation.

## Judge Demo Path

1. Open `/demo` for the stable narrated flow.
2. Open `/practice`, start a session, and play or hum a short phrase.
3. Pause naturally: Bowly waits, then gives one calm suggestion.
4. End practice and open `/report` to see the child recap, parent report, Qwen
   status, and fallback state.

What to look for: Bowly does not stream raw camera or audio to Qwen. The browser
turns local posture and audio signals into structured practice events; Qwen
turns those events into age-appropriate coaching and parent reflection.

Before submitting or presenting, run through the
[hackathon readiness checklist](docs/hackathon-readiness-checklist.md) and
[final demo runbook](docs/final-demo-runbook.md).

Stable report fallback: open `/demo?seed=report` to create a local seeded
practice history and jump straight to `/report`.

## Qwen Cloud Hackathon

Bowly targets **Track 5: EdgeAgent**.

- The browser provides low-latency edge perception from camera and microphone.
- Qwen Cloud turns structured practice metrics into coaching and reflection.
- Raw camera frames and audio recordings are not sent to Qwen.
- Local analysis remains available during cloud failure or weak connectivity.

See the [architecture](docs/architecture.md) and
[Devpost submission draft](docs/devpost-submission.md).

For larger changes, use the lightweight
[multi-agent operating model](docs/agent-roles.md) to split product, frontend,
backend, deployment, and QA review responsibilities.

Alibaba Cloud deployment instructions:
[deploy/alibaba-cloud/README.md](deploy/alibaba-cloud/README.md).

Hostinger frontend Git deployment:
[docs/hostinger-git-deployment.md](docs/hostinger-git-deployment.md).

## Project Structure

```txt
bowly-ai/
  frontend/
  backend/
  docs/
  README.md
```

## Quick Start

1. Copy `backend/.env.example` to `backend/.env` and adjust values if needed.
2. Install dependencies:
   - `npm install`
   - `npm install --prefix frontend`
   - `npm install --prefix backend`
3. Start both apps:
   - `npm run dev`

Frontend defaults to `http://localhost:5173`, backend to `http://localhost:8787`.

Production API: <https://api.bowly.io>

Deployment proof: <https://api.bowly.io/health>

## Environment

Use mock-first mode for stable hackathon demos:

```txt
USE_MOCK_AI=true
```

To try live Qwen mode, set:

```txt
USE_MOCK_AI=false
QWEN_API_KEY=...
QWEN_BASE_URL=https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
```

Restart the backend after changing `backend/.env`. The report page displays
`Qwen Live`, `Mock mode`, or `Mock fallback`, so the active provider is visible.
If a live Qwen request fails, the backend falls back to mock responses and exposes
the fallback state without exposing the API key.

## Core MVP Pages

- `/` Home Page
- `/practice` Practice Session
- `/report` Parent Report
- `/demo` Demo Mode
