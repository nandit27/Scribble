# Scribble --- Product Requirements & Technical Specification

**Version:** 2.0 · **Updated:** 19 October 2026 · **Buildathon:** Bolna
AI × Y Combinator Symphony Buildathon\
**Product:** Full-stack Next.js website · **Deployment:** Vercel

> **Non-negotiable architecture:** Scribble is one Next.js application.
> All UI, application APIs, authorization, data access, agent
> orchestration, and provider integrations live in the same Next.js
> codebase. Do not create a Chrome extension, FastAPI/Python service,
> Express server, or a separately deployed Scribble backend. Managed
> services and external APIs for authentication, storage, voice, and
> model inference are dependencies, not additional application servers.

## 1. Executive Summary

Scribble is a browser-based study workspace combining a freeform digital
whiteboard, an in-browser PDF reader, and an agentic tutor that
understands the student's current work and helps through voice or text.

A student opens Scribble, starts with a blank board or opens a PDF,
writes or annotates in the workspace, and asks questions such as "Why
does this step follow?", "Check my derivative," or "Give me just a
hint." The tutor uses the active document, selected region, visible
notes, and recent conversation as context. It responds conversationally
and can create artifacts on the board: explanatory steps, equations,
highlights, graph data, or a clearly marked suspected mistake.

**Product promise:** *Your notebook. Your PDFs. A tutor built in.*

### Core loop

1.  Create a session or open a PDF.
2.  Read, write, draw, and annotate in one workspace.
3.  Ask a question by voice or text.
4.  The agent uses the active page, selection, board state, and
    conversation context.
5.  The answer appears as a spoken response plus a structured artifact.
6.  Insert or dismiss the artifact; continue with contextual follow-ups.
7.  Save and reopen the study session.

### Differentiation

Scribble is not a chatbot with a microphone or a PDF viewer with a chat
sidebar. The tutor can reason over the student's current study surface
and return visible actions to that same surface.

## 2. Product and Architecture Decisions

  ---------------------------------------------------------------------
  Area                               Decision
  ---------------------------------- ----------------------------------
  Product surface                    Responsive website

  Framework                          Next.js App Router, React,
                                     TypeScript

  Backend                            Next.js Route Handlers and Server
                                     Actions

  Deployment                         Vercel

  Authentication                     Firebase Authentication

  Database                           Cloud Firestore

  File storage                       Firebase Storage, private and
                                     access-controlled

  Whiteboard                         React canvas implementation;
                                     focused drawing library where
                                     useful

  PDF                                PDF.js via `react-pdf` or a
                                     compatible maintained wrapper

  Voice                              Bolna Web Call SDK; session
                                     creation server-side

  Vision/document understanding      Gemini or selected vision-capable
                                     model via server-side adapter

  Tutor reasoning                    One selected model provider behind
                                     a server-side adapter

  Equations                          KaTeX

  Graphs                             Recharts or a small SVG/Canvas
                                     plot component

  Validation                         Zod

  Tests                              Vitest, React Testing Library,
                                     Playwright

  Styling                            Tailwind CSS and a small component
                                     system
  ---------------------------------------------------------------------

### Hard constraints

-   All application code lives in one Next.js repository.
-   No Python runtime, FastAPI, Express API server, or extension
    deliverable.
-   No provider secret in client bundles, `NEXT_PUBLIC_*`, local
    storage, or source control.
-   No arbitrary execution of model-generated code.
-   No claim that a formula is verified unless a real check ran.
-   No always-on microphone in the MVP; voice starts only after explicit
    user action.

Firebase, Bolna, and model APIs remain managed dependencies. They do not
justify creating another application server.

## 3. Problem Statement

A student stuck on a PDF or handwritten problem often has to stop, take
a screenshot, switch apps, upload the image, explain the context, read
the answer elsewhere, and manually copy useful parts back into their
notes. Each follow-up repeats the process and loses context about the
student's work.

**User problem:** "I want to keep working on the page in front of me and
ask for help without switching tools or rebuilding context."

Scribble makes the PDF, whiteboard, annotations, and tutor conversation
one continuous workspace.

## 4. Users and Jobs to Be Done

### Primary users

-   High-school and university students studying mathematics or STEM.
-   Self-directed learners using lecture notes, papers, textbooks, and
    problem sets.
-   Learners who think by writing and benefit from spoken explanations.

### Jobs

-   Open and read a PDF inside the app.
-   Annotate a PDF or work beside it on a whiteboard.
-   Write equations and diagrams by hand.
-   Ask why a step is valid.
-   Get a hint without seeing the entire solution.
-   Check a derivation or identify a likely mistake.
-   Ask follow-up questions without repeating context.
-   Generate equations, graphs, or explanations on the board.
-   Save and revisit a study session.

### Scenarios

-   **Explain a step:** select a line in a PDF and ask why a theorem
    applies.
-   **Check work:** circle a derivative and ask whether it is correct;
    the tutor asks for confirmation if handwriting is ambiguous.
-   **Give a hint:** ask what to try next without revealing the
    solution.
-   **Work across surfaces:** read the problem in the PDF, solve it on
    the board, and ask the tutor to compare the attempt with the
    problem.
-   **Visualize:** ask for a graph of a supported function and receive a
    graph artifact.

## 5. Goals, Non-Goals, Principles

### MVP goals

1.  Deliver a polished Next.js website with an interactive whiteboard.
2.  Open, navigate, and annotate PDFs in-browser.
3.  Let users ask contextual tutor questions by voice and text.
4.  Ground answers in active PDF content, selected regions, board notes,
    and recent turns.
5.  Render structured answers, equations, highlights, and at least one
    graphing/checking workflow.
6.  Save and reopen sessions.
7.  Demo the complete loop without manual database edits.
8.  Keep all Scribble application logic in one Next.js codebase.

### Non-goals

-   Chrome extension, separate Python/FastAPI backend, or Express
    server.
-   LMS, teacher dashboard, or classroom administration.
-   Perfect OCR for all handwriting and scans.
-   Native mobile apps or real-time collaboration.
-   Unrestricted PDF source editing.
-   Custom handwriting-generation model.
-   Always-on ambient recording or wake-word detection.
-   Autonomous execution of arbitrary LLM-generated code.
-   Multi-agent orchestration without a measured need.

### Principles

-   **One workspace:** reading, writing, asking, and reviewing happen
    together.
-   **Context once, questions many:** no repeated uploads for
    follow-ups.
-   **Teach before telling:** default to hints and reasoning.
-   **Visible agency:** show what the agent is doing and changing.
-   **User control:** suggested artifacts can be inserted, moved, or
    dismissed.
-   **Visible uncertainty:** ambiguous handwriting triggers
    clarification.
-   **Math must be checked:** otherwise label the result unverified.
-   **Voice with consent:** visible microphone state, mute, and end
    controls.
-   **No fake capabilities:** never claim a save, read, selection, or
    check succeeded unless it did.

## 6. MVP Feature Priorities

### P0 --- Must ship

#### F-01: Session and workspace

-   Landing page actions: New whiteboard, Open PDF, Continue studying.
-   Stable session ID, title, save state, empty/loading/error states.
-   Reload restores the last successfully saved session.

#### F-02: Whiteboard

-   Large scrollable canvas with optional grid/paper background.
-   Pen, eraser, selection, undo, redo, pan, zoom.
-   Pen color and stroke width.
-   Text notes and tutor-generated equation/note/graph artifacts.
-   Distinguish user content from agent-created artifacts.
-   Move/delete AI artifacts without altering user strokes.

**Acceptance:** pointer/touch input works in supported browsers;
undo/redo is predictable; board state persists.

#### F-03: PDF viewer

-   Upload PDF and render it using PDF.js.
-   Page navigation, zoom, fit-width, fit-page.
-   Text selection when the PDF has a text layer.
-   Loading, password-protected, unsupported, and rendering-error
    states.
-   Reasonable multi-page support.

**Acceptance:** navigation does not leave the workspace; rendering does
not freeze the entire app; invalid files fail safely.

#### F-04: PDF annotations and focus selection

-   Freehand ink and highlights over the displayed PDF.
-   Store annotation geometry relative to the page, not viewport pixels.
-   Select text/regions and ask about them.
-   Annotations are overlays; do not claim to alter original PDF bytes.
-   Persist annotations by document and page.

**Acceptance:** annotations stay aligned after zoom/reload; the tutor
receives page and selection metadata; ambiguous selections trigger
clarification.

#### F-05: Voice and text tutor

-   `Start voice`, `Mute`, `End session`.
-   Bolna Web Call for live voice.
-   Typed question fallback in the same workspace.
-   Connection states: idle, connecting, active, reconnecting/error,
    ended.
-   Visible microphone-active indicator and cleanup on end/unmount.
-   Voice starts only after an explicit user gesture.

**Acceptance:** spoken question gets an audible response;
microphone/network failures have recovery actions; typed fallback always
remains available.

#### F-06: Agentic tools

Initial allowlisted tools: - `get_active_context` -
`explain_selection` - `give_hint` - `check_work` -
`create_board_artifact` - `plot_expression` - `highlight_region` -
`save_session`

Tools execute only in Next.js server code. Model arguments are
schema-validated; the model cannot invent endpoints or call arbitrary
URLs.

**Acceptance:** at least three useful actions work end-to-end; tool
execution is visible; failures do not masquerade as success.

#### F-07: Structured answer artifacts

-   Explanation cards, ordered steps, hints, equations, graph results,
    and clarification prompts.
-   KaTeX equation rendering.
-   Insert answers onto the board.
-   Short spoken answer, detailed visual artifact.
-   Verification labels: `verified`, `unverified`, `failed`,
    `not_applicable`.

**Acceptance:** equations render without overflow; voice and visual
artifact derive from one structured result.

#### F-08: Document understanding

-   Extract text from text-based PDFs.
-   For scans/handwriting, optionally call a vision model from a Next.js
    server route.
-   Start with the active page or selected region, not full-document
    ingestion.
-   Allow correction before ambiguous content becomes confirmed context.
-   Keep extracted text separate from generated answers.

#### F-09: Persistence

-   Save session metadata, board elements, PDF metadata, annotations,
    and turns.
-   Debounced autosave with saving/saved/error state.
-   Keep PDFs in private storage.
-   Check ownership on every read/write.
-   Retry failed saves visibly.

#### F-10: Demo fallbacks

-   Sample PDF and pre-populated example board.
-   Typed fallback for voice failure.
-   Prompt chips: Explain this step, Give me a hint, Check my work, Plot
    this function.
-   Demo reset must not destroy a user's real session.

### P1 --- If P0 is stable

-   Export board as PNG/PDF.
-   Search text-based PDFs.
-   Drag a PDF excerpt onto the board.
-   Highlight likely mistakes.
-   Session history, rename, keyboard shortcuts.
-   Multiple board backgrounds, image import, page thumbnails.
-   Hint/explain/solve mode selector.

### P2 --- Stretch

-   Handwriting-to-LaTeX for board regions.
-   Generated handwriting that mimics a student's style.
-   Wake phrase while a voice session is active.
-   Cross-document references, multiple specialist agents,
    collaboration.
-   Advanced proof checking and tablet stylus optimization.

**Scope warning:** A reliable PDF + board + one useful voice/agent loop
beats ten incomplete features. Do not build wake-word detection,
multi-agent orchestration, or handwriting imitation before the core loop
works.

## 7. Information Architecture and UX

### Screens

1.  Landing --- value proposition, New whiteboard, Open PDF, Continue.
2.  Workspace --- PDF, whiteboard, tools, tutor panel.
3.  Session history --- reopen, rename, delete.
4.  Settings --- account, privacy, voice preferences, data deletion.

### Workspace layout

``` text
┌────────────────────────────────────────────────────────────────────────────┐
│ Scribble  [Session title]  Saved ✓                  [Voice: Idle] [Settings]│
├────────────────────────────────────────────────────────────────────────────┤
│ PDF controls             Whiteboard tools                 Tutor / Context  │
│ ┌─────────────────────┐ ┌──────────────────────────┐ ┌───────────────────┐ │
│ │ PDF page             │ │ Whiteboard               │ │ Ask Scribble      │ │
│ │ text / highlights    │ │ pen / equations / notes  │ │ explanation       │ │
│ │ annotations          │ │ tutor artifacts / graphs │ │ steps / history   │ │
│ └─────────────────────┘ └──────────────────────────┘ │ [Type a question] │ │
│                                                       │ [Start voice]     │ │
│                                                       └───────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Use resizable panels on desktop. On narrow screens, use tabs or
collapsible panels instead of compressing all surfaces.

### Controls

-   **Top bar:** logo, session title, save state, file/page, voice
    state, settings.
-   **PDF toolbar:** open/replace, page navigation, zoom, fit, select,
    pen, highlighter, eraser.
-   **Board toolbar:** pen, eraser, selection, text, undo/redo,
    color/width, zoom/pan, grid, insert artifact, export.
-   **Tutor panel:** conversation, prompt chips, typed input, voice
    controls, active-context indicator, agent status, artifact preview.

### States

Empty session; upload progress; PDF ready; board ready; extraction in
progress; extraction needs confirmation; tutor idle; voice
connecting/active; tool running; artifact ready; saving/saved/save
failed; recoverable provider/network error.

### UX rules

-   Keep the user's board visible while the tutor responds.
-   Selection visibly updates the tutor's context indicator.
-   Never automatically perform destructive edits; ask before
    replacing/clearing content.
-   New artifacts are previewable and undoable.
-   Preserve PDF page and board viewport during follow-ups.
-   Use concise status messages; avoid onboarding tours.

## 8. Functional Design

### 8.1 Board state model

Store structured elements, not a screenshot.

Element types: `stroke`, `text`, `equation`, `graph`, `image`,
`tutor_note`, `highlight`.

Common fields: - `id`, `type`, `x`, `y`, optional `width`, `height`,
`zIndex` - `createdAt`, `updatedAt` - `source: user | agent` -
type-specific content/metadata

Store strokes in board-space coordinates. Zoom/pan changes the viewport
transform, not the underlying stroke coordinates.

### 8.2 PDF rendering and annotations

-   PDF.js renders pages in the browser.
-   Annotation overlay is a separate layer aligned to each page.
-   Store coordinates normalized to page dimensions or in a documented
    PDF coordinate system.
-   Track page number and document version.
-   Do not modify the original PDF in place.
-   If export is implemented, create a new annotated copy and label it
    as an export.

For scans: render the active page/region, call the vision provider,
request structured text/LaTeX plus uncertainty notes, allow correction,
then use confirmed content for tutor turns.

### 8.3 Context assembly

Send bounded, relevant context, not the entire session every time: 1.
Current question. 2. Explicitly selected PDF text/region. 3. Active page
text and page number. 4. Relevant board elements and selected strokes.
5. Confirmed problem statement/equations. 6. Recent turns. 7. Tutor
mode/preferences.

If freehand strokes are not transcribed, do not pretend the tutor
understands them. Ask the user to select the region and confirm the
recognized expression.

### 8.4 Agent turn pipeline

1.  User submits text or speaks in an active Bolna call.
2.  Next.js creates a turn with a stable `turnId` and idempotency key.
3.  Server loads authorized session and active context.
4.  Model chooses an intent and, if needed, an allowlisted tool.
5.  Zod validates arguments.
6.  The tool executes with session-scoped authorization.
7.  Tool result is added to context.
8.  Tutor generates structured response and concise spoken text.
9.  Supported math checks run.
10. Turn and proposed artifact are persisted.
11. UI receives result and shows a preview.
12. User inserts, moves, or dismisses the artifact.
13. Bolna speaks the concise answer for voice-originated turns.

### 8.5 Example response schema

``` json
{
  "turnId": "uuid",
  "intent": "explain_selection",
  "spokenResponse": "The chain rule applies because one function is inside another.",
  "artifact": {
    "type": "steps",
    "title": "Why the chain rule applies",
    "steps": [
      {"text": "Identify the outer function.", "latex": "f(u)=u^2"},
      {"text": "Identify the inner function.", "latex": "u=3x+1"},
      {"text": "Multiply the derivatives.", "latex": "\\frac{d}{dx}(3x+1)^2=2(3x+1)\\cdot3"}
    ]
  },
  "verification": {"status": "not_applicable", "notes": []},
  "clarificationRequired": false
}
```

This is a schema example, not a guaranteed model response. Validate
before rendering or saving.

## 9. Technical Architecture

### 9.1 Architecture overview

``` mermaid
flowchart TD
    U[Student Browser] --> NEXT[Next.js App Router]
    NEXT --> UI[React Workspace UI]
    NEXT --> API[Route Handlers / Server Actions]
    UI --> BOARD[Whiteboard Canvas]
    UI --> PDF[PDF.js Viewer + Annotation Overlay]
    UI --> VOICE[Bolna Web Call SDK]
    API --> AUTH[Firebase Auth Verification]
    API --> DB[(Firestore)]
    API --> STORE[Firebase Storage]
    API --> AGENT[Agent Orchestrator in Next.js]
    AGENT --> MODEL[Vision / Tutor Model API]
    AGENT --> TOOLS[Allowlisted Server Tools]
    TOOLS --> DB
    TOOLS --> MATH[Safe Math Validation / Plot Data]
    API --> BOLNA[Bolna Session API]
    VOICE <-->|Live audio| BOLNA
    AGENT --> DB
    DB --> UI
```

### 9.2 What lives in Next.js

-   Pages, layouts, loading states, and error boundaries.
-   Whiteboard and PDF workspace components.
-   Authentication-aware server components.
-   Route Handlers for uploads, sessions, tutor turns, voice-session
    creation, and provider callbacks.
-   Server Actions for suitable authenticated mutations.
-   Provider adapters for Bolna and model APIs.
-   Agent orchestration and tool dispatch.
-   Schema validation, authorization, rate limits, and error
    normalization.
-   Firestore and Firebase Storage access.
-   Persistence and autosave coordination.

External providers supply managed capabilities only. There is no
separately deployed Scribble backend.

### 9.3 Suggested repository structure

``` text
scribble/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (app)/layout.tsx
│   ├── (app)/sessions/page.tsx
│   ├── (app)/sessions/[sessionId]/page.tsx
│   ├── (app)/settings/page.tsx
│   └── api/v1/
│       ├── sessions/route.ts
│       ├── sessions/[sessionId]/route.ts
│       ├── sessions/[sessionId]/board/route.ts
│       ├── sessions/[sessionId]/turns/route.ts
│       ├── documents/route.ts
│       ├── documents/[documentId]/route.ts
│       ├── documents/[documentId]/extract/route.ts
│       ├── tutor/turn/route.ts
│       ├── voice/session/route.ts
│       └── webhooks/bolna/route.ts
├── components/workspace/
│   ├── workspace-shell.tsx
│   ├── workspace-header.tsx
│   ├── resizable-panels.tsx
│   ├── whiteboard/whiteboard.tsx
│   ├── whiteboard/board-toolbar.tsx
│   ├── whiteboard/board-element.tsx
│   ├── pdf/pdf-viewer.tsx
│   ├── pdf/pdf-toolbar.tsx
│   ├── pdf/annotation-layer.tsx
│   ├── tutor/tutor-panel.tsx
│   ├── tutor/question-input.tsx
│   ├── tutor/voice-controls.tsx
│   └── tutor/artifact-preview.tsx
├── lib/
│   ├── auth/firebase-client.ts
│   ├── auth/firebase-admin.ts
│   ├── db/sessions.ts
│   ├── db/documents.ts
│   ├── db/turns.ts
│   ├── providers/bolna.ts
│   ├── providers/tutor-model.ts
│   ├── providers/vision-model.ts
│   ├── agent/orchestrator.ts
│   ├── agent/context-builder.ts
│   ├── agent/tool-registry.ts
│   ├── agent/tools/
│   ├── math/safe-expression.ts
│   ├── math/graph-data.ts
│   ├── schemas/
│   ├── storage.ts
│   ├── rate-limit.ts
│   └── errors.ts
├── types/
├── tests/{unit,integration,e2e}/
├── public/demo/
├── .env.example
├── package.json
└── README.md
```

This is a target structure, not a requirement to create every file on
day one. Implement only the pieces needed for the first vertical slice.

### 9.4 Server/client boundaries

**Client components:** canvas pointer events, PDF rendering and
annotation overlays, voice SDK lifecycle, panel resizing, local viewport
state, optimistic board edits.

**Server components / Route Handlers:** session authorization, Firebase
Admin operations, provider API calls, tool dispatch, document extraction
requests, file access control, tutor-turn persistence.

Keep Firebase Admin and provider secrets out of client components. Load
browser-only PDF/canvas libraries through client components and dynamic
imports where needed.

## 10. Next.js API Contracts

Every endpoint below is implemented in `app/api/**/route.ts`. Use
consistent JSON errors and authenticated session checks.

### `POST /api/v1/sessions`

Create a study session.

``` json
{
  "sessionId": "uuid",
  "title": "Untitled study session",
  "status": "active"
}
```

### `GET /api/v1/sessions/:sessionId`

Return session metadata, active document/page, save state, and board
metadata after checking ownership.

### `PATCH /api/v1/sessions/:sessionId`

Update title, active page, active document, or tutor preferences.

### `POST /api/v1/documents`

Accept a PDF using multipart form data. Validate MIME type, file
signature, size, and page count. Store it privately and create a
document record.

``` json
{"documentId":"uuid","status":"ready","pageCount":12}
```

### `GET /api/v1/documents/:documentId`

Return authorized document metadata and an access-controlled
preview/download URL.

### `POST /api/v1/documents/:documentId/extract`

Extract text from the selected page/region. Return status, text,
expressions, and ambiguity notes. Keep scope bounded.

### `PUT /api/v1/sessions/:sessionId/board`

Persist a versioned board state. Use version checks so stale writes
cannot silently overwrite newer work.

``` json
{
  "version": 8,
  "elements": [],
  "viewport": {"x": 0, "y": 0, "zoom": 1}
}
```

### `POST /api/v1/tutor/turn`

Start a turn from typed input or a browser voice event.

``` json
{
  "sessionId": "uuid",
  "question": "Can you explain the selected step?",
  "inputMode": "text",
  "focus": {
    "documentId": "uuid",
    "pageNumber": 3,
    "selectedText": "..."
  },
  "tutorMode": "hint"
}
```

The endpoint may return a completed result or `202 Accepted` with a
`turnId` for a long-running turn. The client can poll
`GET /api/v1/sessions/:sessionId/turns?after=...`.

### `POST /api/v1/voice/session`

Create a Bolna web-call session server-side. Require authentication and
rate limiting. Never return a long-lived provider API key.

### `POST /api/v1/webhooks/bolna`

Optional callback endpoint if required by the selected Bolna
integration. Confirm the current provider's signature/authentication
contract and reject untrusted callbacks; do not assume signing is
available.

### API rules

-   Validate requests and responses with Zod.
-   Verify ownership of every session, document, board, and turn.
-   Bound file size, PDF pages, context size, graph points, and request
    frequency.
-   Use request IDs and turn IDs for tracing.
-   Standardize errors as
    `{ "error": { "code": "...", "message": "...", "retryable": false } }`.
-   Never return stack traces, private storage keys, secrets, or raw
    provider error payloads.
-   Use idempotency keys for tutor turns and callbacks where applicable.

## 11. Data Model

Use a small Firestore model. Keep data-access functions isolated under
`lib/db` so the database can be changed without rewriting UI code.

### `users/{userId}`

-   `createdAt`
-   `displayName`
-   `preferences` (voice, theme, default tutor mode)

### `sessions/{sessionId}`

-   `ownerId`, `title`, `status: active | archived`
-   `activeDocumentId`, `activePage`
-   `tutorMode: hint | explain | solve`
-   `boardVersion`, `createdAt`, `updatedAt`

### `sessions/{sessionId}/boardVersions/{versionId}`

-   `version`, `elements`, `viewport`, `createdAt`, `createdBy`

If board state becomes too large for a Firestore document, store
versioned JSON blobs in Firebase Storage and keep references in
Firestore.

### `documents/{documentId}`

-   `ownerId`, `sessionId`, `storagePath`, `originalFileName`
-   `mimeType`, `sizeBytes`, `pageCount`
-   `parseStatus: uploaded | processing | ready | needs_confirmation | failed`
-   `extractedPages` or references to page extraction records
-   `createdAt`, `updatedAt`

### `documents/{documentId}/annotations/{annotationId}`

-   `ownerId`, `sessionId`, `pageNumber`
-   `type: ink | highlight | text`
-   `geometry`, `content`, `createdAt`, `updatedAt`

### `sessions/{sessionId}/turns/{turnId}`

-   `ownerId`, `question`, `inputMode`, `intent`, `focus`
-   `status: queued | running | completed | failed`
-   `spokenResponse`, `artifact`, `toolCalls`, `verificationStatus`
-   `createdAt`, `completedAt`

### Persistence rules

-   Do not store PDFs, large image blobs, or base64 strings in
    Firestore.
-   Keep files in private object storage.
-   Keep board data versioned and bounded.
-   Define retention and deletion behavior explicitly.
-   Do not persist raw audio by default.
-   Do not log private worksheets or full transcripts unless necessary
    and disclosed.

## 12. Voice and Bolna Integration

### Voice flow

1.  User clicks **Start voice**.
2.  Client requests `/api/v1/voice/session`.
3.  Next.js calls Bolna's current session API using a server-side
    secret.
4.  Client starts the Bolna Web Call SDK with short-lived session
    details.
5.  User asks about the active page/board.
6.  Agent calls Scribble's allowlisted tutor tool when context or an
    action is needed.
7.  The Next.js tool handler returns concise spoken text and structured
    artifact metadata.
8.  UI shows the artifact and offers to insert it on the board.
9.  User can mute or end the session.

### Required states

`idle`, `requesting_permission`, `connecting`, `active`, `muted`,
`reconnecting`, `error`, `ended`.

### Security

-   `BOLNA_API_KEY` is server-only.
-   Confirm the current Bolna session-mint API contract; do not blindly
    copy old examples.
-   Authenticate and rate-limit session creation.
-   End the call and release microphone resources on exit.
-   Scope voice session IDs to the authorized Scribble session.
-   Validate every tool call server-side.

### Agent behavior

-   Act as a patient tutor, not a generic assistant.
-   Use active context when relevant.
-   Speak briefly; put long equations in the UI.
-   Ask for clarification when the selection is unclear.
-   Respect `hint`, `explain`, and `solve` modes.
-   Use tools for checks, artifacts, and graphs.
-   Never claim verification unless the server reports a successful
    check.
-   Never shame the learner.

The typed question box must use the same tutor orchestrator and context
builder as voice; do not maintain separate tutor logic.

## 13. Agent Orchestration and Tool Contracts

### Principle

"Agentic" means the tutor chooses and executes constrained actions based
on the student's goal, observes the result, and responds. It does not
mean adding a complicated multi-agent framework.

Use one tutor model, a small tool registry, bounded calls per turn, and
server-enforced permissions.

### Tool registry

-   **`get_active_context`** --- returns active document/page, selected
    region, confirmed extracted text, compact board summary, and recent
    turns.
-   **`explain_selection`** --- explains selected text/equation in
    context; asks for clarification if selection is empty or ambiguous.
-   **`give_hint`** --- returns one next-step hint and withholds the
    full solution unless asked.
-   **`check_work`** --- compares supplied/confirmed work to the target
    problem; returns likely issue and verification status. It must not
    pretend handwriting was identified when it was not.
-   **`create_board_artifact`** --- validates and saves a proposed
    note/equation/graph; returns an element ID; user can insert, move,
    or dismiss it.
-   **`plot_expression`** --- validates a constrained expression and
    bounded range, then returns numeric points.
-   **`highlight_region`** --- validates authorized document, page, and
    normalized geometry; creates a proposed annotation.
-   **`save_session`** --- persists the current state on explicit
    save/autosave events.

### Example tool payload

``` json
{
  "sessionId": "uuid",
  "artifact": {
    "type": "tutor_note",
    "title": "Chain rule",
    "body": "Differentiate the outer function, then multiply by the derivative of the inner function."
  }
}
```

### Tool execution policy

-   Model may choose only registered tools.
-   Validate all inputs with Zod.
-   Check resource ownership and permissions for every tool.
-   Limit tool calls per turn and set timeouts.
-   Make writes idempotent where possible.
-   Log tool name, duration, status, and turn ID---not sensitive
    payloads by default.
-   Never let tools fetch arbitrary URLs or execute arbitrary code.
-   Return structured errors to the model and UI.

## 14. Math, Equations, and Graphing

### Equation rendering

-   Use KaTeX for LaTeX rendering.
-   Treat LaTeX as content, not executable HTML.
-   Separate inline and display equations.
-   Allow copying equation source where useful.
-   Rendering does not prove mathematical correctness.

### Math checking

Implement constrained symbolic/numeric checks in TypeScript or a vetted
library compatible with the chosen Next.js runtime. **Do not add a
Python microservice to use SymPy.**

MVP checks may include: - Numeric arithmetic. - Equivalence for a
constrained expression grammar. - Derivatives for supported elementary
functions if the selected library handles them reliably. - Numeric spot
checks for symbolic transformations. - Graphing of supported
single-variable functions.

If no deterministic check exists, mark the result `unverified`. Do not
pretend to have a proof checker.

### Graph generation

-   Parse expressions with a strict allowlist.
-   Support only documented operators/functions, such as `+`, `-`, `*`,
    `/`, powers, `sin`, `cos`, `exp`, `log`, and `sqrt`, subject to
    actual parser support.
-   Bound x-range and point count.
-   Reject `NaN`, infinity, invalid domains, and oversized requests.
-   Render axes, grid, labels, and expression.
-   Never use `eval`, `new Function`, or unrestricted expression
    execution.

## 15. Authentication, Security, and Privacy

### Authentication

-   Use Firebase Authentication.
-   Verify ID tokens in Next.js server code for protected routes.
-   Never trust a request-body user ID as proof of identity.
-   Enforce ownership at the data-access layer.
-   Use secure HTTP-only cookies where appropriate for the selected auth
    flow.

### File security

-   Accept PDFs only for the initial document flow.
-   Check MIME type and file signature.
-   Apply size and page-count limits.
-   Keep files private; use short-lived URLs or authorized streaming
    routes.
-   Prevent path traversal and arbitrary object-key access.
-   Never expose Firebase service account credentials to the browser.

### Voice/model security

-   Keep Bolna and model keys server-side.
-   Rate-limit voice-session creation and tutor turns.
-   Bound prompts, context, tool calls, and output size.
-   Treat PDF text, OCR output, notes, and retrieved content as
    untrusted data. Instructions embedded in documents cannot override
    system policy or tool authorization.
-   Authorize tool calls independently of model intent.
-   Do not store raw voice recordings by default.
-   Explain external-provider data processing in the privacy notice.

### Data deletion

-   Allow deletion of a session and its board state, annotations, turns,
    and uploaded files.
-   Delete child records and storage objects consistently.
-   Make deletion failures visible and retryable.
-   Define log retention and provider-side retention according to the
    selected services' terms.

### Security checklist

-   [ ] No secrets in `NEXT_PUBLIC_*`.
-   [ ] Firebase Admin code is server-only.
-   [ ] Protected routes verify identity.
-   [ ] Every resource read/write verifies ownership.
-   [ ] Upload size/type/page limits are enforced.
-   [ ] Provider calls have timeouts and rate limits.
-   [ ] Agent tools use an allowlist and schema validation.
-   [ ] No model-generated code is executed.
-   [ ] No raw PDFs/tokens are logged.
-   [ ] Session deletion covers database and storage.

## 16. Error Handling and Reliability

  -----------------------------------------------------------------------
  Failure                             Required behavior
  ----------------------------------- -----------------------------------
  PDF upload fails                    Keep session; show retry and
                                      limits.

  PDF cannot render                   Explain and offer another
                                      file/page.

  OCR/vision call fails               Keep PDF open; allow manual
                                      question entry.

  Handwriting ambiguous               Ask user to confirm expression.

  Voice fails                         Show retry; keep typed input
                                      available.

  Tutor model times out               Mark turn failed/retryable; never
                                      fabricate an answer.

  Tool call fails                     Show failed action and allow retry.

  Autosave fails                      Show unsaved state and retry.

  Graph syntax invalid                Explain supported syntax; do not
                                      execute it.

  Auth expires                        Preserve local unsaved state where
                                      feasible and request sign-in.
  -----------------------------------------------------------------------

Reliability rules: - Keep workspace interactive while model calls run. -
Use optimistic UI only when rollback is possible. - Store a turn ID and
idempotency key to deduplicate retries. - Do not duplicate board
artifacts on network retries. - Never discard board state after an
unrelated provider error.

## 17. Testing and Evaluation

### Unit tests

-   Zod schemas and tool argument validation.
-   Board serialization and coordinate transforms.
-   PDF annotation normalization.
-   Safe expression parser and graph bounds.
-   Context assembly and truncation.
-   Tool registry rejects unknown tools.
-   Authorization rejects cross-user access.
-   Idempotency prevents duplicate artifacts.

### Integration tests

-   Create session and persist board.
-   Upload PDF and retrieve authorized preview.
-   Extract text from a text-based PDF.
-   Create tutor turn and persist structured artifact.
-   Mock provider success and failure.
-   Create voice session without exposing server secrets.
-   Save/reload PDF annotations.
-   Delete session and associated files.

### End-to-end tests

1.  Create session.
2.  Open sample PDF.
3.  Navigate to page and select text.
4.  Ask "Explain this step" using typed input.
5.  Confirm answer uses the selected region.
6.  Insert explanation onto board.
7.  Draw a stroke and test undo/redo.
8.  Reload and verify persistence.
9.  Start/end voice session in a browser with microphone access.
10. Simulate provider failure and verify workspace remains usable.

### Tutor evaluation set

Prepare 20--30 cases: correct selection, ambiguous selection, contextual
follow-up, hint-only request, full-solution request, correct/incorrect
derivation, unsupported syntax, scanned PDF with low confidence, prompt
injection inside a PDF, provider timeout, duplicate retry, and
cross-user access attempt.

Grade grounding, math correctness, mode adherence, tool appropriateness,
artifact/speech consistency, and honest uncertainty.

## 18. Observability

Record request ID, turn ID, route, provider/model identifier, latency,
status, tool name/duration, upload/parse status, save failures, and
voice session status.

Do not log API keys, auth tokens, full PDF content by default, raw
audio, full board snapshots without a protected debugging need, or
private signed URLs.

Useful metrics: - Time from PDF open to first tutor response. - Tutor
turns that produce a useful artifact. - Tool-call success rate. - PDF
rendering success rate. - Autosave failure rate. - Voice connection
success rate. - Clarification rate caused by ambiguous extraction.

## 19. Environment Variables

Example `.env.example`:

``` dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase client identifiers (not authorization by themselves)
NEXT_PUBLIC_FIREBASE_API_KEY=replace_me
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=replace_me
NEXT_PUBLIC_FIREBASE_PROJECT_ID=replace_me
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=replace_me
NEXT_PUBLIC_FIREBASE_APP_ID=replace_me

# Firebase Admin — server only
FIREBASE_CLIENT_EMAIL=replace_me
FIREBASE_PRIVATE_KEY=replace_me

# Bolna — server only
BOLNA_API_KEY=replace_me
BOLNA_AGENT_ID=replace_me
BOLNA_TOOL_SHARED_SECRET=replace_me

# Tutor / vision provider — server only
TUTOR_MODEL_PROVIDER=replace_me
TUTOR_MODEL_API_KEY=replace_me
TUTOR_MODEL_NAME=replace_me
VISION_MODEL_NAME=replace_me

MAX_UPLOAD_MB=15
MAX_PDF_PAGES=30
MAX_TOOL_CALLS_PER_TURN=4
GRAPH_MAX_POINTS=1000
```

Never prefix provider secrets or Firebase Admin credentials with
`NEXT_PUBLIC_`. Keep `.env.local` out of Git and verify variable names
against the actual SDK setup.

## 20. Deployment

Deploy the Next.js application to Vercel. Configure Firebase and
provider accounts separately, but deploy no additional Scribble server.

Checklist: - \[ \] Next.js build passes in CI. - \[ \] Vercel
environment variables are configured. - \[ \] Firebase Auth authorized
domains include the deployed domain. - \[ \] Firestore and Storage rules
enforce ownership. - \[ \] Provider credentials remain server-side. - \[
\] Bolna session creation works on deployed HTTPS. - \[ \] Browser
microphone permission works. - \[ \] PDF upload/rendering works in
production. - \[ \] Save/reload works after refresh. - \[ \] Provider
timeouts and recovery paths are tested. - \[ \] Demo session is
available. - \[ \] README accurately documents setup, limitations, and
demo. - \[ \] Re-check the official buildathon page for submission
deadline changes.

## 21. Build Plan

### Milestone 1 --- Workspace shell

-   Scaffold Next.js App Router + TypeScript.
-   Create landing page and workspace layout.
-   Build resizable PDF/board/tutor panels.
-   Add loading, empty, and error states.
-   Deploy to Vercel early.

**Exit:** user can open a blank session on the deployed app.

### Milestone 2 --- PDF and whiteboard

-   Implement PDF upload and PDF.js rendering.
-   Add page navigation and zoom.
-   Implement strokes, eraser, undo/redo, pan, zoom.
-   Add PDF annotation overlay.
-   Persist board and annotations.

**Exit:** user can open a PDF, annotate it, draw, reload, and recover
saved work.

### Milestone 3 --- Text tutor

-   Implement authenticated Next.js tutor route.
-   Integrate one model provider.
-   Build bounded context assembly and structured responses.
-   Render explanations and equations.
-   Insert a tutor artifact onto the board.

**Exit:** a typed question about the active PDF produces a grounded
artifact.

### Milestone 4 --- Agent tools and math

-   Add tool registry and validation.
-   Implement context, hint, check-work, artifact, and plot tools.
-   Add graph rendering and verification labels.
-   Add idempotency and error handling.

**Exit:** at least two useful tools work with visible results.

### Milestone 5 --- Bolna voice

-   Configure Bolna agent.
-   Implement server-side voice-session creation.
-   Integrate Web Call SDK lifecycle.
-   Add mic state, mute/end, reconnect, and typed fallback.
-   Connect voice to the same tutor orchestrator.

**Exit:** spoken question about the open document yields a spoken answer
and visible artifact.

### Milestone 6 --- Polish and submission

-   Fix responsive behavior.
-   Test in a clean browser profile.
-   Test provider failure and recovery.
-   Prepare sample PDF and demo script.
-   Record and submit.

**Exit:** full loop works from a fresh deployed session without manual
steps.

## 22. Demo Script

Target 90--120 seconds: 1. Open Scribble and create a session. 2. Open a
sample PDF containing a math problem. 3. Highlight an equation or
statement. 4. Ask aloud: "Explain why this step is valid. Don't solve
the rest." 5. Show the tutor using the selection and active page. 6.
Show the spoken response and structured explanation. 7. Insert the
explanation onto the whiteboard. 8. Draw a small attempt or add a note.
9. Ask "Can you check this step?" 10. Request a graph of a supported
expression. 11. Refresh to demonstrate persistence.

Prove three things: Scribble understands current work; voice is
connected to real tools; outputs become part of the same workspace. Show
the product, not infrastructure diagrams.

## 23. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Severity                Mitigation
  ----------------------- ----------------------- -----------------------
  PDF/canvas coordinates  High                    Normalize coordinates
  drift                                           and test
                                                  zoom/resize/reload.

  Voice integration takes High                    Prove a minimal Bolna
  too long                                        call early; retain
                                                  typed fallback.

  OCR misreads            High                    Confirmation and manual
  handwriting                                     correction.

  Incorrect math answer   High                    Constrain supported
                                                  operations and label
                                                  unverified output.

  Tutor feels generic     High                    Require active-context
                                                  retrieval and visible
                                                  artifact/tool action.

  Unsafe tool call        High                    Allowlist, Zod
                                                  validation, ownership
                                                  checks, bounded calls.

  Scope expands into      High                    One orchestrator and a
  multi-agent systems                             small tool registry.

  Autosave overwrites     High                    Version board states
  newer work                                      and reject stale
                                                  writes.

  Firestore document      Medium/High             Keep files in Storage;
  grows too large                                 version/chunk large
                                                  board data.

  Provider outage during  High                    Sample content, typed
  demo                                            fallback, retries,
                                                  preflight.

  Private data leaks      High                    Private storage,
                                                  short-lived URLs, owner
                                                  checks, minimal logs.

  Runtime incompatibility Medium                  Keep browser-only
                                                  libraries client-side;
                                                  verify SDK requirements
                                                  early.
  -----------------------------------------------------------------------

## 24. Definition of Done

-   [ ] Website is one full-stack Next.js application.
-   [ ] No separate FastAPI, Python, Express, or extension codebase is
    required.
-   [ ] User can create a study session.
-   [ ] PDF opens and navigates in-browser.
-   [ ] User can annotate PDF and draw on board.
-   [ ] Board and annotations survive reload.
-   [ ] Tutor can reference active page/selection.
-   [ ] Tutor returns structured explanations, not only generic chat.
-   [ ] At least one agent tool creates a visible artifact.
-   [ ] One math/graph workflow works with honest verification limits.
-   [ ] Bolna voice starts/ends reliably on deployed site.
-   [ ] Typed fallback works when voice fails.
-   [ ] Secrets stay server-side and cross-user access is rejected.
-   [ ] Provider, OCR, and save failures have recovery paths.
-   [ ] Demo works from a fresh deployed session without manual edits.

## 25. Instructions for Coding Agents

1.  Do not change architecture: Next.js App Router is the only
    application framework and server runtime.
2.  Do not create `backend/`, `services/api/`, Python requirements,
    FastAPI, Express, or a second deployment target.
3.  Put provider integrations and agent tools in `lib/` and `app/api/`.
4.  Keep Firebase Admin and provider credentials out of client
    components.
5.  Use TypeScript throughout.
6.  Validate external requests and model-generated tool arguments with
    Zod.
7.  Build one end-to-end vertical slice before expanding scope.
8.  Never stub a feature and describe it as implemented.
9.  Avoid extra frameworks unless they solve a concrete requirement.
10. AI changes should be previewable, undoable, and non-destructive.
11. Add tests for authorization, annotation coordinates, board
    serialization, and tool validation.
12. Verify current Bolna API/SDK contracts from official docs before
    integration.
13. Keep README instructions accurate to the actual code and deployment.

## 26. Final Product Definition

**Scribble is a full-stack Next.js study workspace combining a digital
whiteboard, an in-browser PDF viewer and annotation layer, and an
agentic voice tutor. The tutor uses the active page and board context,
calls constrained tools, and returns explanations, checks, highlights,
and graphs to the same workspace---without forcing the student to switch
apps or re-explain their work.**

The MVP succeeds when a student opens a math PDF, annotates it, asks a
contextual question aloud, sees the tutor respond, places the
explanation on the board, and later returns to find the work saved.



What changed
- Product: Interactive whiteboard + in-browser PDF viewer + agentic tutor.
- Architecture: One Next.js App Router application using TypeScript, React and server-side Route Handlers.
- Whiteboard: Drawing, erasing, annotations, equations, graphs and AI-generated artifacts.
- PDF workspace: In-browser rendering, page navigation, highlighting and annotations.
- Agent: Context-aware tutoring, tool calling, checking work, generating hints and inserting explanations onto the board.
- Voice: Bolna integration with explicit microphone controls and typed fallback.
- Infrastructure: Firebase Auth, Firestore and Storage, with external AI and voice APIs. No separate FastAPI, Python or Express application.
- Delivery: Prioritized MVP, acceptance criteria, API schemas, security requirements, tests and buildathon demo plan.