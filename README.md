# Scribble

### Your voice-powered AI math tutor, right inside your notebook.

Scribble is a voice-first math tutoring workspace built for the **Bolna AI × Y Combinator Symphony Buildathon**. A student uploads a worksheet once, confirms the extracted problem, asks a question out loud, and receives both a spoken explanation and a structured visual note beside the original work.

<img width="1775" height="866" alt="image" src="https://github.com/user-attachments/assets/f58f7103-fdf6-415a-940a-6a5c5290f832" />


> **Upload once → ask naturally → understand the step → see it appear beside the work.**

Scribble is not a generic chatbot with a microphone. Voice is the primary interaction, and each tutor turn can produce an inspectable artifact: a hint, concept explanation, work-check note, equation step, or graph.

## Hackathon demo

1. Open the web app and choose **Try the sample worksheet** (or upload a PNG, JPG, or PDF under 10 MB).
2. Review and confirm the extracted problem.
3. Click **Start voice** and ask, “Can you explain the next step?”
4. Ask a follow-up without re-uploading the worksheet.
5. Watch the structured explanation or graph appear in **Scribble’s Notes**.

The typed question field is an intentional fallback for microphone or network issues. Seeded prompts include **Explain this step**, **Give me a hint**, and **Plot this function**.

## Current MVP

- Worksheet upload and editable extraction confirmation.
- Persistent worksheet context for the current browser session.
- Bolna Web Call with start, mute, unmute, and end controls.
- Typed fallback using the same tutoring endpoint.
- Structured tutor artifacts for explanations, hints, work checks, and graphs.
- Safe single-variable graphing for `x`, arithmetic, powers, `sin`, `cos`, `tan`, and `exp`.
- Verification labels distinguishing graph output from unverified handwriting checks.
- A **Clear** action that ends voice and removes the current in-memory workspace.

## Architecture

```text
Browser (Next.js) → Bolna Web Call
        │                  │
        └── FastAPI tutoring service
            ├─ session + worksheet context
            ├─ structured tutor turns
            └─ validated SymPy graph generation
```

Bolna receives the opaque `scribble_session_id` as context. Its `tutor_turn` custom function calls the authenticated FastAPI tool endpoint, which resolves the active worksheet server-side and persists the structured result. The browser polls for that same result so spoken and visual responses stay aligned.

## Run locally

Requirements: Node.js 18+, Python 3.11+, and a Bolna agent/API key for live voice (optional; typed tutoring works without them).

```bash
npm install
python -m pip install -r services/requirements.txt
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead.

In one terminal run `npm run api`; in another run `npm run dev`. Open [http://localhost:3000](http://localhost:3000). The API runs on [http://localhost:8000](http://localhost:8000).

The API uses in-memory data for the demo. Restarting it clears sessions and uploaded worksheets; the app's **Clear** control also removes the current demo workspace. `BOLNA_API_KEY` stays in the Next.js server route and is never sent to the client. The current API relies on opaque, unguessable session IDs for the demo; add authenticated ownership checks before production.

## Bolna setup

Set `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, and `BOLNA_TOOL_SHARED_SECRET`. Configure Bolna's `tutor_turn` custom function to call `POST /api/v1/tools/tutor-turn`, pass `X-Scribble-Tool-Secret`, and supply `scribble_session_id` as a context variable. Typed fallback calls its separately scoped session endpoint. The web route mints a short-lived voice session. Connect its returned payload to the currently installed `@bolna/web-call` SDK version during deployment.

## Bolna configuration

Set `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, and `BOLNA_TOOL_SHARED_SECRET` in `.env`. Configure the agent custom function with `POST /api/v1/tools/tutor-turn`, the `X-Scribble-Tool-Secret` header, `scribble_session_id` context, and the student request as `question`. Never expose Bolna credentials through `NEXT_PUBLIC_` variables.

## Useful API routes


| Route                                   | Purpose                          |
| --------------------------------------- | -------------------------------- |
| `POST /api/v1/sessions`                 | Create a tutoring session        |
| `POST /api/v1/sessions/{id}/worksheets` | Upload a worksheet               |
| `POST /api/v1/worksheets/{id}/confirm`  | Confirm extracted problem text   |
| `POST /api/v1/sessions/{id}/tutor-turn` | Typed fallback tutor request     |
| `POST /api/v1/tools/tutor-turn`         | Bolna custom-tool request        |
| `GET /api/v1/sessions/{id}/turns`       | Retrieve notebook artifacts      |
| `POST /api/v1/worksheets/{id}/graph`    | Validate and graph an expression |


## Honest limitations

This is a hackathon demo, not a production education platform yet. Sessions, worksheets, and turns are held in memory; uploaded binaries are validated in memory; and extraction uses a transparent sample fallback until a vision/OCR provider is configured. Handwritten work is not automatically verified, and graphing is allowlisted to prevent arbitrary code execution.

## Verification

```bash
npm run build
python -m py_compile services/main.py
```

Recommended smoke test: load the sample, confirm it, ask for a hint, ask a follow-up, request a graph, then mute and end the session.

## Buildathon links

- [Bolna AI × Symphony Buildathon](https://www.bolna.ai/symphony/buildathon)
- [Bolna Web Call SDK](https://github.com/bolna-ai/web-call)
- [Bolna API documentation](https://www.bolna.ai/docs/api-reference/introduction)
- [Bolna custom function calls](https://www.bolna.ai/docs/tool-calling/custom-function-calls)

