# Multi-Agent Operating Model

Use this model when a change spans more than one product surface, needs an
independent review, or prepares Bowly for a demo or deployment. Keep one owner
for each code change and use the other agents for focused review, research, and
verification.

## Default Rule

Do not run multiple agents against the same files at the same time. The main
agent owns the working tree and asks specialist agents for findings, patches, or
checklists only when their scope is clear.

Use a specialist agent when any of these are true:

- The work touches both `frontend/` and `backend/`.
- The change affects the practice session, reports, camera, microphone, or AI
  output shown to a child or parent.
- A release, public demo, Devpost submission, or cloud deployment is coming up.
- The main agent has made a non-trivial UI, API, prompt, or deployment change
  and needs an independent review.

## Agent Roles

### Product and UX Agent

Focus:

- Child practice flow, parent report clarity, demo story, and product language.
- Whether feedback is calm, age-appropriate, and action-oriented.
- Whether the MVP still supports the Qwen Cloud EdgeAgent narrative.

Primary files:

- `frontend/src/pages/PracticePage.vue`
- `frontend/src/pages/ParentReportPage.vue`
- `frontend/src/components/`
- `docs/demo-script.md`
- `docs/devpost-submission.md`
- `docs/practice-experience-direction.md`

Checks:

- The child can understand the next action without explanation.
- Parent-facing summaries are specific but not alarming.
- Camera setup messages do not sound like technique corrections.
- Demo flow can be completed without exposing internal implementation details.

### Frontend Agent

Focus:

- Vue, Pinia, routing, camera, microphone, pose rendering, responsive layout, and
  browser behavior.
- Runtime stability on phones and tablets.
- UI implementation consistency.

Primary files:

- `frontend/src/`
- `frontend/public/models/`
- `frontend/public/icons.svg`
- `design-qa.md`
- `docs/device-testing-checklist.md`

Checks:

- `npm run typecheck --prefix frontend`
- `npm run build --prefix frontend`
- No horizontal overflow on mobile layouts.
- Camera and microphone start only after user action and are released after
  stopping or navigation.
- Practice controls remain reachable on small screens.

### Backend and AI Agent

Focus:

- Express routes, request validation, Qwen integration, mock fallback, prompt
  quality, and shared session/report contracts.
- Stable JSON responses for frontend rendering.

Primary files:

- `backend/src/routes/`
- `backend/src/services/`
- `backend/src/prompts/`
- `backend/src/types/`
- `backend/test/`

Checks:

- `npm run typecheck --prefix backend`
- `npm test --prefix backend`
- API responses do not expose keys, stack traces, or raw private media.
- Live Qwen failures produce a visible mock fallback state.
- Shared types stay aligned with `frontend/src/types/`.

### DevOps and Release Agent

Focus:

- Docker, Alibaba Cloud deployment, Hostinger deployment, environment variables,
  health checks, and runbooks.

Primary files:

- `backend/Dockerfile`
- `deploy/`
- `docs/alibaba-cloud-operations-checklist.md`
- `docs/hostinger-git-deployment.md`
- `.env.example`
- `README.md`

Checks:

- Required environment variables are documented.
- `USE_MOCK_AI=true` remains available for stable demos.
- `/health` works after deployment.
- Deployment docs match the current build output and ports.
- Cost and operations checklist are reviewed before public demos.

### QA and Review Agent

Focus:

- Independent review after changes.
- Regression risk, missing tests, broken flows, and release readiness.
- This agent should usually report findings before suggesting broad rewrites.

Primary files:

- Files changed in the current branch.
- `design-qa.md`
- `docs/device-testing-checklist.md`
- `docs/alibaba-cloud-operations-checklist.md`

Checks:

- `npm run typecheck`
- `npm run build`
- `npm test --prefix backend`
- Manual review against the affected checklist.
- Findings include file paths, line numbers, severity, and the user-visible
  consequence.

## Recommended Workflows

### Feature Work

1. Main agent reads the affected product and code context.
2. Main agent implements the change in one ownership area where possible.
3. Frontend or Backend and AI Agent reviews the implementation if the feature
   touches their area.
4. QA and Review Agent checks the final diff and required commands.

### UI or Practice Flow Work

1. Product and UX Agent reviews the intended child or parent experience.
2. Frontend Agent implements the interface and browser behavior.
3. QA and Review Agent verifies responsive layout, camera/microphone behavior,
   and build/typecheck results.

### AI Behavior Work

1. Backend and AI Agent changes prompts, service logic, validation, or fallback.
2. Product and UX Agent reviews child-facing and parent-facing language.
3. QA and Review Agent verifies tests, mock mode, and fallback behavior.

### Deployment or Demo Prep

1. DevOps and Release Agent checks environment, deployment docs, and health
   endpoints.
2. Product and UX Agent checks demo script and submission narrative.
3. QA and Review Agent runs the release verification commands and reviews the
   relevant checklist.

## Handoff Format

Use this short format when handing work between agents:

```txt
Goal:
Changed files:
Constraints:
Commands run:
Known risks:
Requested review:
```

Example:

```txt
Goal: Add a calmer pause-state message on the practice page.
Changed files: frontend/src/pages/PracticePage.vue
Constraints: Keep camera setup messages separate from technique feedback.
Commands run: npm run typecheck --prefix frontend
Known risks: Not yet checked on Safari.
Requested review: Product wording and mobile layout.
```

## When Not to Use Multi-Agent

Keep the work single-agent when the task is a small copy edit, a narrow bug fix
inside one file, a dependency-free documentation update, or a simple local
command. The overhead is not worth it unless an independent review would
materially reduce risk.
