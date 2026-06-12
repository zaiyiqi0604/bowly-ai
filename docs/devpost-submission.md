# Bowly AI Devpost Submission Draft

## Track

**Track 5: EdgeAgent**

## One-line Pitch

Bowly is a privacy-aware Qwen Cloud EdgeAgent that observes violin practice
locally, protects a child's musical flow, and turns compact posture and audio
signals into calm coaching and useful parent reflection.

## The Problem

Children often practice between lessons without timely guidance. Conventional
real-time correction tools can overload them with warnings, require constant
screen attention, and interrupt the concentration needed for music.

## What Bowly Does

- Runs low-latency posture and movement perception in the browser.
- Uses ambient guidance while a child is actively playing.
- Delays short coaching until a natural pause.
- Uses Qwen Cloud to generate child-appropriate coaching and parent reports.
- Saves anonymous joint diagrams instead of camera images.
- Continues the practice session if cloud connectivity fails.

## Why Qwen Is Essential

Qwen is the reflection and communication layer, not a frame-by-frame pose
detector. It receives structured session context and decides how to express the
next useful idea without harsh correction. The same Qwen integration generates
parent reports and multi-session trend summaries.

Live integration:

- Model: `qwen3.7-plus`
- API implementation:
  [`backend/src/services/qwenService.ts`](../backend/src/services/qwenService.ts)
- Runtime provider and fallback:
  [`backend/src/services/aiOrchestrator.ts`](../backend/src/services/aiOrchestrator.ts)

## Innovation & AI Creativity

- Hybrid edge-cloud design separates latency-sensitive perception from
  language reasoning.
- Flow-aware interruption logic decides when to stay quiet.
- Qwen responses are schema-validated before entering the child-facing UI.
- The system exposes Live, Mock, and Mock fallback states instead of hiding
  provider failures.

## Technical Depth

- Pose stabilization, confidence filtering, arm identity tracking, and
  overlap reduction for readable live guides.
- Local audio activity detection and pitch visualization.
- Anonymous normalized skeleton snapshots for before/after review.
- Structured Qwen JSON generation with deterministic fallback.
- Responsive Vue frontend and modular Express API.

## Impact

Bowly addresses the gap between weekly lessons and daily practice while
avoiding surveillance-style storage. The architecture can extend to other
instruments, physical therapy, dance, and sports coaching.

## Architecture

See [`docs/architecture.md`](architecture.md).

## Alibaba Cloud Deployment Proof

- Public health endpoint: <https://api.bowly.io/health>
- Runtime: Alibaba Cloud Function Compute, Singapore (`ap-southeast-1`)
- Deployment platform signal:
  `deployment.platform = "alibaba-cloud-function-compute"`
- Live model signal: `ai.provider = "qwen"` after a successful request
- Deployment guide:
  [`deploy/alibaba-cloud/README.md`](../deploy/alibaba-cloud/README.md)
- Function Compute ZIP build script:
  [`deploy/alibaba-cloud/build-function-compute-package.ps1`](../deploy/alibaba-cloud/build-function-compute-package.ps1)
- HTTPS: custom `api.bowly.io` domain with a Let's Encrypt RSA certificate

## Significant Work During The Submission Period

- Added local real-time posture tracking and guide stabilization.
- Added heuristic violin and bow estimation.
- Implemented flow-aware three-layer feedback.
- Added anonymous before/after practice reflection.
- Integrated live Qwen Cloud coaching and report generation.
- Added explicit cloud fallback and provider status.

## Required Submission Assets

- Public repository with MIT license visible.
- Working public demo or test build.
- Alibaba Cloud backend deployment proof.
- Architecture diagram.
- English project description and testing instructions.
- Public video under three minutes.
- Track selection: EdgeAgent.
- Optional public build-journey post for the Blog Post Prize.
