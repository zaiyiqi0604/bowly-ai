# Final Demo Runbook

Use this when recording the submission video or presenting Bowly live.

## Primary Flow

1. Open `/demo`.
2. Briefly explain the six-step narrated flow.
3. Open `/practice`.
4. Start practice and grant camera/microphone permissions.
5. Play or hum one short phrase.
6. Pause and show that Bowly waits before giving one calm suggestion.
7. End practice and open `/report`.
8. Show the child recap, parent report, Qwen status, Hackathon proof panel, and
   anonymous edge evidence.

## Stable Report Fallback

If the room, instrument, camera, microphone, or network is unreliable, open:

```txt
/demo?seed=report
```

This seeds a stable local practice history and redirects to `/report`. It does
not fake live Qwen status; it only guarantees that the report page has realistic
practice data to show.

## What To Say If Live Qwen Fails

"Bowly exposes provider failure instead of hiding it. The local practice flow,
camera/audio summaries, and report contract still work through mock fallback.
That is intentional for weak networks and demos with children."

## What To Say If Asked What Qwen Does

"The browser handles low-latency perception. It sends structured practice
events, such as phrase count, longest phrase, pitch data quality, and reliable
posture observations. Qwen turns those signals into child-safe coaching and a
parent-readable reflection."

## Last-Minute Checks

- `/health` is reachable.
- `/report` does not stay stuck on loading when the backend is unavailable.
- The model name displayed in the app is the one mentioned in narration.
- Raw video and raw audio are never described as being uploaded.
- Mock mode or mock fallback is explained plainly if it appears.
