# Scribble

### A voice-first math workspace that turns "I'm stuck" into the next visible step.

[**Open the live app**](https://scribble-teal.vercel.app) · [**Built for the Bolna x YC Symphony Buildathon**](https://www.bolna.ai/symphony/buildathon/)

<img width="1775" height="866" alt="Scribble's document-and-whiteboard workspace" src="https://github.com/user-attachments/assets/f58f7103-fdf6-415a-940a-6a5c5290f832" />

> **Read the problem. Circle the stuck point. Ask out loud. See the next step land beside your work.**

Scribble is not a chatbot with a microphone taped on. It is a voice-native study surface for students working through math: a selectable PDF, an expressive whiteboard, and a tutor that turns a spoken question into an inspectable visual artifact.

## The problem

When a student gets stuck on a worksheet, the hard part is rarely asking a question. It is carrying the relevant line, their in-progress working, and their intent into a conversation without breaking focus.

Scribble keeps all three in one place. Select the exact phrase in a PDF, sketch your attempt, then ask: *"Why can I divide by this term?"* The answer is not lost in a transcript; it arrives on the board where the student is working.

## The 90-second demo

1. Open the live app and choose **Document** or **Split** view.
2. Upload a PDF and select the line that is confusing.
3. Click **Ask tutor** to speak, or **Type** and enter: *"Give me a hint, not the answer."*
4. Watch the explanation become a board artifact beside the source.
5. Ask: *"Graph sin(x) + x/3."* Scribble validates the expression server-side and draws the returned points on the board.
6. Click **Ask tutor** or **Start voice** to start the Bolna-powered in-browser voice experience once the Bolna environment variables and tutor API are configured.

## Why voice matters here

Voice lets students stay in the problem. No tab-switching, no reconstructing a question in a chat box, no losing the line they were reading. Bolna is the conversational layer; Scribble supplies the active worksheet and renders a visual result that the student can inspect, edit around, and learn from.

```text
Student speaks in the browser
            |
            v
   Bolna Web Call voice agent
            |
            v
  contextual tutor tool call
            |
            v
selected PDF text + opted-in board context
            |
            v
FastAPI tutor + safe graph engine
            |
            v
an explanation, check, or graph on the board
```

## What is live

| Capability | What Scribble does |
| --- | --- |
| **Study surface** | Split PDF/whiteboard layout, board focus, resizing, pan/zoom, drawing, text notes, erasing, undo and redo. |
| **PDF context** | Renders PDFs with PDF.js; selected text is preferred tutor context, with visible-page text as fallback. |
| **Voice handoff** | Mints a Bolna Web Call session and supplies the opaque tutoring session, active worksheet, selection, and opted-in board context. |
| **Typed fallback** | Uses the same contextual FastAPI tutoring flow when the service is configured, and stays usable locally if it is not. |
| **Safe graphing** | Sends graph requests to a validated SymPy endpoint; numeric points are rendered directly on the board, never generated as an image. |
| **Decision routing** | An optional server-side Jev adapter chooses `explain`, `draw_graph`, `roast`, or a consent-gated practice completion with a confidence threshold and deterministic fallback. |
| **Continuity** | Browser persistence by default; optional Supabase magic-link sign-in syncs a workspace and private PDFs across devices. |

## A few deliberate product choices

### The tutor sees context, not magic

The active PDF selection is passed first. If there is no selection, Scribble uses visible-page text. Board context is explicitly controlled by the student. If a needed line is absent, the tutor asks for it rather than pretending it can read handwriting perfectly.

### Graphs are math, not pictures

Scribble's graph path is intentionally narrow: one variable (`x`), arithmetic, powers, `sin`, `cos`, `tan`, and `exp`. The FastAPI service parses and samples it with SymPy, then returns points for the board renderer. That means the student can reason about the curve rather than trust a generated image.

### Practice completion is not forgery

Students may enter an exact practice target and reconfirm it. Only then can Scribble add clearly labeled, blue vector practice strokes. The strokes are generic vector glyphs, never a raster image, never an imitation of handwriting, and never presented as student-authored work.

### Roast mode is opt-in

The **Roast** control is deliberately playful and constructive: more "your algebra is doing parkour around the equals sign" than personal criticism. Turn it off instantly.

## Architecture

```text
                         Vercel deployment
  +--------------------------------------------------------------+
  | Next.js + React                                               |
  | PDF.js reader | canvas board | local persistence | Supabase  |
  |       |                         |                             |
  |       +---- Bolna session ------+---- Jev decision route      |
  |       |                                                       |
  | FastAPI service: sessions | worksheet context | SymPy graphs  |
  +--------------------------------------------------------------+
```

The browser persists an opaque API session ID and active worksheet ID with the workspace. On a fresh voice turn, it refreshes the worksheet context before starting Bolna. The FastAPI demo store is in-memory, so Scribble transparently creates a new session and reattaches current context after a service restart.

## Run it locally

**Requirements:** Node.js 18+ and Python 3.11+.

```bash
npm install
python -m pip install -r services/requirements.txt
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`.

```bash
# terminal 1 - contextual tutor and graph API
npm run api

# terminal 2 - workspace
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the Next.js server after changing `.env`. Voice also requires the tutor API to be running and reachable at `NEXT_PUBLIC_API_URL`; deployed apps need these variables configured in their hosting environment.

## Configure the integrations

All integrations are optional for local UI development. Put secrets in `.env` locally or your deployment provider's environment-variable settings--never in `NEXT_PUBLIC_*` variables.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Tutor service URL, for example `http://localhost:8000` locally or the production app URL on Vercel. |
| `BOLNA_API_KEY` / `BOLNA_AGENT_ID` | Creates browser voice-call sessions. |
| `BOLNA_TOOL_SHARED_SECRET` | Shared secret between Bolna's custom tool and FastAPI. |
| `JEV_API_KEY` | Optional server-side typed-action routing. |
| `JEV_CONFIDENCE_THRESHOLD` | Confidence required before accepting a Jev action; defaults to `0.8`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional account sync. |

### Bolna custom tool

Configure a `tutor_turn` custom function that calls:

```text
POST https://scribble-teal.vercel.app/api/v1/tools/tutor-turn
X-Scribble-Tool-Secret: <BOLNA_TOOL_SHARED_SECRET>
```

Pass the current `scribble_session_id` and the student's `question`; for a graph, also pass `intent: graph_expression` and an `expression` in math syntax when known. The agent should use the returned context to answer naturally and ask for clarification when required. The endpoint persists the artifact for Scribble. The tool must reach the same running API instance used by the browser: the demo store is in memory, so a public deployment and a local API do not share sessions. For local development, expose the local API through a public HTTPS tunnel and configure the Bolna tool to use that address and the matching shared secret.

Voice receives selected or extracted PDF text and typed board notes captured when the call starts. It does not currently read handwritten strokes, screenshots, or changes made after the call starts. Restart the call to refresh the text context. The built-in tutor tool uses demonstration responses; the Bolna agent must generate a contextual answer instead of reading those templates verbatim.

## API map

| Route | Purpose |
| --- | --- |
| `POST /api/v1/sessions` | Create an opaque tutoring session. |
| `POST /api/v1/sessions/{id}/context` | Attach selected or visible study context as the active worksheet. |
| `POST /api/v1/sessions/{id}/tutor-turn` | Handle a contextual typed tutor request. |
| `POST /api/v1/tools/tutor-turn` | Authenticate and handle a Bolna tool request. |
| `POST /api/v1/worksheets/{id}/graph` | Validate an expression and return graph points. |
| `POST /api/bolna-session` | Mint a browser voice session without exposing Bolna credentials. |
| `POST /api/jev-decision` | Make a server-side typed tutor-action decision. |

## Verification

```bash
npm run build
python -m py_compile services/main.py
```

## Stack

[Next.js](https://nextjs.org/) · [React](https://react.dev/) · [PDF.js](https://mozilla.github.io/pdf.js/) · [FastAPI](https://fastapi.tiangolo.com/) · [SymPy](https://www.sympy.org/) · [Bolna Web Call](https://github.com/bolna-ai/web-call) · [Jev](https://www.getjevai.com/docs) · [Supabase](https://supabase.com/)

---

Built for the [Bolna x YC Symphony Buildathon](https://www.bolna.ai/symphony/buildathon/): bring any idea, give it a voice.
