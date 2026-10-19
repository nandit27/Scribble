# Scribble

Scribble is a worksheet-aware, voice-first math tutor. The current MVP provides a polished notebook workspace, worksheet upload and review, a confirmed worksheet context, structured tutoring notes, safe single-variable graphing, typed fallback, and a server-side Bolna session mint endpoint.

## Run locally

1. Copy `.env.example` to `.env` and set the values you have available.
2. Install the web dependencies: `npm install`.
3. Install API dependencies: `python -m pip install -r services/requirements.txt`.
4. In one terminal run `npm run api`; in another run `npm run dev`.
5. Open `http://localhost:3000` and choose **Try the sample worksheet**.

The API uses in-memory data for the demo. Restarting it clears sessions and uploaded worksheets. `BOLNA_API_KEY` stays in the Next.js server route and is never sent to the client. The current API relies on opaque, unguessable session IDs for the demo; add authenticated ownership checks before production.

## Bolna setup

Set `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, and `BOLNA_TOOL_SHARED_SECRET`. Configure Bolna's `tutor_turn` custom function to call `POST /api/v1/tools/tutor-turn`, pass `X-Scribble-Tool-Secret`, and supply `scribble_session_id` as a context variable. Typed fallback calls its separately scoped session endpoint. The web route mints a short-lived voice session. Connect its returned payload to the currently installed `@bolna/web-call` SDK version during deployment.

## Chrome overlay

The extension in `apps/extension` is the intended "Scribble beside any page" experience. Start the API, then in Chrome open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select `R:\Projects\Scribble\apps\extension`.

Click the Scribble toolbar icon on a lesson, PDF, or web notebook. It opens a draggable overlay. Click **Use this page** to attach the page's visible text as the current tutoring context, then ask questions without uploading a file. The manifest currently permits only the local API; replace `http://localhost:8000/*` in `host_permissions` with the deployed HTTPS API origin before distribution.

## Intentional demo limits

OCR is represented by a visible, editable fallback until a vision provider is configured. Uploaded binary files are only validated and processed in memory; production needs private object storage and a database. Graphing accepts only `x`, numbers, arithmetic, powers, `sin`, `cos`, `tan`, and `exp`.
