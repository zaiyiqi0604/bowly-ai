# Design QA

Source visual truth: Steve Jobs direction, concept 3 generated in this thread.
Target: `http://127.0.0.1:5173/practice`
Viewport: mobile portrait
State: remembered task and first-use empty state

**Implemented**

- Removed the visible Teacher Task / Free Practice mode selection.
- Added one primary Start Practice action.
- Added a remembered-task state with optional score thumbnail.
- Added Change today's practice and Just play secondary actions.
- Added a compact task editor with text and camera/photo input.
- Persisted the task and compressed score image in local browser storage.
- Preserved the internal assignment/free state required by reports and AI requests.

**Verification**

- TypeScript and production build: passed.
- Diff whitespace validation: passed.
- Browser visual and interaction comparison: blocked because the installed in-app Browser plugin is missing its required `scripts/browser-client.mjs` runtime.

**Required Fidelity Surfaces**

- Typography: implemented with the existing Bowly type scale and tokens.
- Spacing and hierarchy: implemented around one primary action and two quiet secondary actions.
- Colors: existing Bowly violet, stage surfaces, and muted text tokens retained.
- Assets: existing Heroicons and an uploaded score thumbnail are used; no placeholder artwork was introduced.
- Copy: mode terminology is removed from the child-facing start state.

**Remaining Blocker**

- A rendered browser capture is required to compare the implementation against concept 3 at the same mobile viewport.

final result: blocked
