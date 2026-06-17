# Bowly Future Improvement Memo

Last updated: 2026-06-17

## Product Direction

Bowly should stay focused on one direction:

```text
privacy-first local practice signals -> child-friendly practice support -> AI parent report
```

Do not split the roadmap into unrelated features. New ideas should strengthen this core loop.

## Near-Term Priority

### 1. Mobile/tablet camera signal quality

Reason:
Most real users will use phones or tablets. The camera may be close to the child, so wrists, elbows, bow area, or shoulders may leave the frame. Better setup quality makes local motion signals more trustworthy.

Goal:

```text
Before practice, Bowly helps the family get a usable camera view.
During practice, Bowly gives low-distraction status.
After practice, the parent report explains evidence quality honestly.
```

Recommended UX:

- Evidence states: `Strong`, `Usable`, `Limited`, `Not enough evidence`.
- Setup guidance: `Turn phone sideways`, `Move farther back`, `Keep both hands visible`.
- Practice feedback: large color/status cues, not small text.
- Report language: separate `Camera setup affected signal quality` from `Local movement signal`.

Implementation note:
This is not a separate onboarding branch. It is the quality gate for local movement signals.

Design required before implementation:
Yes. Generate a mobile/tablet setup flow design first.

Likely files:

- `frontend/src/components/CameraPanel.vue`
- `frontend/src/pages/PracticePage.vue`
- `frontend/src/pages/ParentReportPage.vue`

## Child Engagement Idea

### 2. Low-distraction practice pet

Concept:
A small pet/mascot appears near the edge of the practice screen and reacts to practice signals.

Correct framing:

```text
The pet is a gentle companion, not a judge.
```

Recommended v1 states:

- `Listening`
- `Playing with you`
- `Steady sound`
- `Nice phrase`
- `Need wider view`
- `Report ready`

Rules:

- Do not cover the child, bow, hands, or controls.
- Do not constantly animate during playing.
- React mostly during pauses or state changes.
- Do not say the child is wrong.
- Use simple visual reactions before text.
- Keep parent report professional; mascot belongs mainly in child practice.

Why it may be valuable:

- Makes the child experience warmer and more memorable.
- Reinforces that Bowly is a practice companion, not surveillance.
- Connects local practice signals to child-friendly feedback.

Risk:
If overdone, it can distract from music practice and weaken the serious privacy/report story.

Design required before implementation:
Yes. Generate a practice-screen mascot concept first.

Likely files:

- `frontend/src/components/CameraPanel.vue`
- `frontend/src/pages/PracticePage.vue`
- New component if implemented cleanly, for example `frontend/src/components/PracticePet.vue`

## Motion Signal Improvements

### 3. Continue refining current PoseNet-based evidence

Current decision:
Do not switch engines immediately. First make current local pose signals clearer and more honest.

Already improved:

- Live overlay shows local pose signals, wrist angle, and bow path signal.
- Parent report evidence snapshots show labels, confidence-aware rendering, and before/after local pose samples.
- Copy avoids professional diagnosis claims.

Next possible refinements:

- Add evidence quality into reports more explicitly.
- Distinguish `camera view note` from `movement signal` more visually.
- Add mobile/tablet fit mode so the camera feed does not visually crop the child.
- Improve overlay alignment for portrait devices.

Design required before implementation:
Only if changing layout or visual hierarchy. Small technical fixes can be implemented directly.

## Later Product Work

### 4. Upgrade tracking engine

Possible direction:

- MediaPipe Pose Landmarker for richer body landmarks.
- MediaPipe Hand Landmarker for hand detail.
- Later, bow/violin object detection.

Do not do this before hackathon polish unless current tracking becomes a blocker.

Difficulty:

- Pose/hand engine replacement: medium.
- Bow/violin detection: high.
- Violin-specific model: product-level research and data work.

Design required before implementation:
No for engine experiments. Yes if the user-facing overlay changes.

## Suggested Execution Order

1. Deploy and verify current motion evidence improvements.
2. Generate design for mobile/tablet camera setup quality gate.
3. Implement setup quality gate if approved.
4. Generate design for low-distraction practice pet.
5. Implement mascot v1 only if it stays small, edge-positioned, and signal-driven.
6. Revisit MediaPipe only after the demo and current product story are stable.

## Decision Rules

Use these rules before adding any new feature:

- Does it strengthen local practice signal quality?
- Does it make the parent report more trustworthy?
- Does it preserve privacy-first positioning?
- Does it avoid distracting the child during active playing?
- Does it avoid overclaiming professional motion capture accuracy?

If the answer is no, defer it.
