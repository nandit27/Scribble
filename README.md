# Scribble

### The math workspace that can see the page, your notes, and the next step.

Scribble brings a selectable PDF reader, an expressive whiteboard, and a voice-ready tutor into one calm study surface. Highlight the exact line that is confusing, ask naturally, then keep the answer as an artifact beside your work.

> **Read the problem → work it out → ask at the stuck point → keep the explanation.**

<img width="1775" height="866" alt="Scribble workspace with a source document and whiteboard" src="https://github.com/user-attachments/assets/f58f7103-fdf6-415a-940a-6a5c5290f832" />

## Why Scribble

Most tutor chats lose the thing you are looking at. Scribble keeps it in view.

- **Document-aware:** PDF pages render inside Scribble, with selectable text. The selection is the tutor's first source of context; otherwise it uses visible-page text.
- **Board-native:** Draw, erase, add notes, undo, redo, zoom, pan, and keep tutor artifacts directly on the board.
- **Inspectable help:** Explanations, hints, work checks, and graphs become durable notes—not disappearing chat bubbles.
- **Voice when it helps:** Bolna voice sessions receive the same worksheet, selection, and opted-in board context as typed questions.
- **Safe graphing:** Graph requests go through an allowlisted SymPy endpoint and return numeric points rendered on the board—not a generated image.
- **Your work stays yours:** Practice completion creates visibly labeled vector strokes only from a student-confirmed target. It never imitates handwriting or fabricates a submission.

## The study loop

```text
Open a PDF or blank board
        ↓
Select the exact line (or use the visible page)
        ↓
Ask, speak, graph, or enable playful roast mode
        ↓
Keep a visual artifact beside your working
```

### Try these prompts

| Goal | Try asking |
| --- | --- |
| Understand a line | “Why can I divide by this term?” |
| Get unstuck | “Give me a hint, not the answer.” |
| Plot safely | “Graph `sin(x) + x/3`.” |
| Check work | “Check this substitution.” |
| Practice notation | Confirm a writing target, then ask “Complete this practice writing.” |
| Add levity | Toggle **Roast**, then ask about your work. |

## Architecture

```text
                  ┌──────────────────┐
                  │  Next.js browser │
                  │ PDF.js + board   │
                  └───────┬──────────┘
              selection / │ \ strokes + notes
                        context
                        │   \──────────────┐
                        ▼                  ▼
             ┌─────────────────┐   ┌─────────────────┐
             │ FastAPI tutor   │   │ Bolna Web Call  │
             │ session/context │   │ voice session   │
             │ SymPy graphs    │   └─────────────────┘
             └─────────────────┘
                        │
                        ▼
             ┌─────────────────┐
             │ Jev decision    │
             │ router (server) │
             └─────────────────┘
```

The browser persists an opaque FastAPI session and active worksheet ID with the workspace. Before a Bolna call begins, Scribble refreshes the server-side worksheet from selected text, the visible PDF page, and an opted-in board summary, then supplies the real session and worksheet IDs to voice.

Jev is an optional server-side router. It chooses one typed next action—`complete_handwriting`, `draw_graph`, `explain`, or `roast`—only when confident enough. Low-confidence, unavailable, or unconfigured Jev calls fall back to the same deterministic local policy.

## Run it locally

**Requirements:** Node.js 18+ and Python 3.11+. Bolna, Jev, and Supabase are optional; the local board and typed fallback still run without their credentials.

```bash
npm install
python -m pip install -r services/requirements.txt
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Start both services:

```bash
# terminal 1 — FastAPI tutor + graph service
npm run api

# terminal 2 — web workspace
npm run dev
```

Open [localhost:3000](http://localhost:3000). The tutor service runs at [localhost:8000](http://localhost:8000).

## Configuration

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Contextual typed tutoring and validated graphs | Defaults to `http://localhost:8000` in the example. |
| `BOLNA_API_KEY`, `BOLNA_AGENT_ID` | Voice sessions | Kept in the Next.js server route. |
| `BOLNA_TOOL_SHARED_SECRET` | Bolna custom tutor tool | Used to authenticate calls to FastAPI. |
| `JEV_API_KEY` | Jev decision routing | Server-only; never use a `NEXT_PUBLIC_` prefix. |
| `JEV_CONFIDENCE_THRESHOLD` | Automatic Jev actions | Defaults to `0.8`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional account sync | Enables magic-link auth and private PDF syncing. |

## Voice + Bolna setup

Set `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, and `BOLNA_TOOL_SHARED_SECRET`. Configure the Bolna `tutor_turn` custom function to call:

```text
POST /api/v1/tools/tutor-turn
X-Scribble-Tool-Secret: <BOLNA_TOOL_SHARED_SECRET>
```

Pass `scribble_session_id` as a context variable and the student's request as `question`. Scribble supplies the active opaque session ID when it opens a voice session.

## Optional account sync

Signed-out students work locally with browser storage. With Supabase configured, the latest workspace state (strokes, notes, tutor turns, layout, and API-session metadata) syncs per user; PDFs live in a private Storage bucket.

1. Create a Supabase project.
2. Run [docs/supabase-schema.sql](docs/supabase-schema.sql) in the SQL editor.
3. Enable email OTP in **Authentication → Providers**.
4. Add the public Supabase URL and anon key to `.env` or `.env.local`.

When local and remote copies differ, the newest `updated_at` wins.

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/v1/sessions` | Create an opaque tutoring session |
| `POST /api/v1/sessions/{id}/context` | Attach visible/selected study context as the active worksheet |
| `POST /api/v1/sessions/{id}/tutor-turn` | Typed tutor turn |
| `POST /api/v1/tools/tutor-turn` | Authenticated Bolna custom-tool turn |
| `GET /api/v1/sessions/{id}/turns` | Read persisted tutor artifacts |
| `POST /api/v1/worksheets/{id}/graph` | Validate and plot a supported expression |
| `POST /api/jev-decision` | Server-side Jev action decision |

## Safety boundaries

- Graph expressions are allowlisted to a small single-variable math surface: `x`, arithmetic, powers, `sin`, `cos`, `tan`, and `exp`.
- Handwriting completion is practice-only: it needs an exact, reconfirmed student target and draws generic vector practice glyphs in blue.
- Roast mode is opt-in and intentionally playful and constructive.
- The FastAPI demo store is in memory. A service restart invalidates its sessions; Scribble recreates and reattaches context on the next request.
- The current API uses opaque IDs for the demo. Production should add authenticated ownership checks and durable storage.

## Verification

```bash
npm run build
python -m py_compile services/main.py
```

## Built with

- [Next.js](https://nextjs.org/) + React
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [FastAPI](https://fastapi.tiangolo.com/) + SymPy
- [Bolna Web Call](https://github.com/bolna-ai/web-call)
- [Jev](https://www.getjevai.com/docs)
- [Supabase](https://supabase.com/)
