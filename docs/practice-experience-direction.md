# Bowly Practice Experience Direction

## Product role

Bowly is a quiet practice companion. It does not replace the teacher, grade a
performance, or require the child to watch the screen while playing.

The child experience is primary. Parent reports are a secondary reflection
tool, not a surveillance or error list.

## Two practice modes

### Teacher task

- The child or parent enters a short description of the assigned work.
- Bowly helps the child complete a small, concrete intention such as two
  attempts of a passage.
- Progress is confirmed by the child at a natural pause. It is never generated
  from a timer.
- Score-aware guidance can be added later when reliable sheet music input and
  alignment exist.

### Free practice

- The child may choose just play, warm up, scales and long bows, or teacher's
  music without a score.
- There is no pass/fail state and no required target.
- Bowly records duration, playing and pause structure, pitch stability, and
  only persistent observations with adequate confidence.
- Without a score, Bowly must not claim that a specific note or passage is
  wrong.

## Feedback rules

1. While playing, stay quiet and use only subtle ambient status.
2. At a natural pause, give at most one short sentence.
3. Prefer no feedback when evidence is weak or the issue is minor.
4. Do not use red warnings, harsh language, or rapidly changing instructions.
5. Detailed observations belong in the end-of-session reflection.

## Session preparation

- The child chooses the practice intention and presses one Start Practice button.
- Camera permission, microphone permission, and room calibration run
  automatically after that action.
- Preparation steps are not shown unless something needs attention.
- Microphone failure blocks audio analysis and shows one retry action.
- Camera failure allows an explicit audio-only practice option.
- Imperfect framing shows one correction, but the child may start anyway.
- Qwen availability never blocks local practice.

## Audio data quality

- Playing requires both a signal above the calibrated room level and a
  repeatable detected pitch.
- Speech, brief impacts, and background sound should not create playing
  sections when no reliable pitch is present.
- Pitch percentages require at least 12 seconds of clear pitch samples.
- Reports show "not enough data" instead of interpreting a small sample.
- Early-to-late continuity comparisons require at least four playing sections.

## Tracking and guides

- Guides first communicate framing and tracking confidence.
- Full skeleton overlays should not be presented as proof of correct technique.
- During playing, show only the minimum useful markers.
- Highlight one relevant region only when a persistent, reliable observation
  exists.
- Instrument and bow position must remain labelled as estimated until a
  dedicated detector or calibration flow is implemented.
- The current live overlay uses only hand and elbow visibility markers. It does
  not draw a full skeleton or an estimated bow line.

## AI role

Local browser processing detects pitch, pose, pauses, and structured events.
Qwen receives only useful structured observations and decides:

- whether to stay quiet;
- which single observation matters most;
- how to phrase one calm, child-friendly suggestion;
- how to summarize concrete progress for the parent report.

Qwen does not perform body tracking and must not turn unknown or placeholder
metrics into authoritative coaching.

## Success measures

- The child completes the intended practice.
- The child voluntarily starts another round or returns another day.
- Interruptions per session remain low.
- Feedback is based on recorded evidence.
- Parent language becomes more supportive and specific.
