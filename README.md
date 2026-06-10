# Bowly AI

Practice with confidence.

Bowly AI is a gentle AI music practice companion for young musicians.

Using camera observation, audio intelligence, emotional coaching, and long-term progress memory, Bowly helps children practice violin with more confidence, consistency, and motivation.

## Project Structure

```txt
bowly-ai/
  frontend/
  backend/
  docs/
  README.md
```

## Quick Start

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Install dependencies:
   - `npm install`
   - `npm install --prefix frontend`
   - `npm install --prefix backend`
3. Start both apps:
   - `npm run dev`

Frontend defaults to `http://localhost:5173`, backend to `http://localhost:8787`.

## Environment

Use mock-first mode for stable hackathon demos:

```txt
USE_MOCK_AI=true
```

To try live Qwen mode, set:

```txt
USE_MOCK_AI=false
QWEN_API_KEY=...
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

If Qwen requests fail, backend falls back to mock responses automatically.

## Core MVP Pages

- `/` Home Page
- `/practice` Practice Session
- `/report` Parent Report
- `/demo` Demo Mode
