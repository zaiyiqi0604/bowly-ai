# Hackathon Readiness Checklist

Use this before recording the final video or presenting Bowly live.

## Demo Path

- Open `/demo` and confirm the narrated flow matches `docs/demo-script.md`.
- Open `/demo?seed=report` and confirm it creates a stable local report.
- Open `/practice`, start a session, and confirm camera and microphone prompts
  appear only after user action.
- Play or hum a short phrase, pause naturally, and confirm Bowly waits before
  showing one short coaching message.
- End the session and open `/report`.
- Confirm the child recap, parent report, Qwen status, Hackathon proof panel,
  and fallback state are understandable in under 30 seconds.

## Qwen And Fallback

- For live Qwen demo, set `USE_MOCK_AI=false`.
- Confirm `QWEN_API_KEY` is configured before presenting live mode.
- Confirm the model name shown in the app matches the model you mention in the
  video or live narration.
- Confirm `/health` shows `ai.provider = "qwen"` after a successful live
  request.
- If live Qwen fails, confirm the app visibly reports `Mock fallback` and the
  practice/report flow still completes.
- If using mock mode intentionally, say that it preserves the same report
  contract for a stable demo.

## Frontend And Device

- Run `npm.cmd run typecheck`.
- Run `npm.cmd run build`.
- Check `/` on desktop and mobile width for no horizontal overflow.
- Check `/practice` on a real phone or tablet before claiming mobile tracking
  accuracy.
- Confirm camera and microphone stop after ending practice or navigating away.
- Confirm the report page does not remain stuck on loading if the backend is
  unavailable.

## Privacy Story

- Say clearly: raw camera images and raw audio are not uploaded to Qwen.
- Show that the report uses structured practice metrics and anonymous posture
  snapshots instead of stored video.
- Keep camera setup issues separate from posture or technique correction.

## Submission Materials

- README has the Judge Demo Path.
- Devpost text explains Qwen's role with local signal input and structured
  output.
- Architecture diagram matches the live product flow.
- Demo video stays under three minutes.
- Public backend `/health` endpoint is reachable before submission.
