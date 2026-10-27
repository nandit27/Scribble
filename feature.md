# Scribble feature backlog

This file captures product requests as they arise and tracks their delivery.

## In progress — contextual document tutoring

- [x] Replace the browser PDF iframe with a PDF.js document surface.
- [x] Extract the visible page's text and capture a student's text selection.
- [x] Attach the selected text (falling back to visible-page text) to typed tutor context.
- [x] Include the current document/selection and an opt-in board summary in the voice-session context.

## Planned — decision-led tutor actions

- [ ] Add a server-side Jev decision adapter that chooses `complete_handwriting`, `draw_graph`, `explain`, or `roast`, with a confidence threshold and deterministic fallback.
- [ ] For handwriting completion, generate vector strokes on the board using an explicit student-confirmed target—not a raster image and never a forged submission.
- [ ] For graph requests, use the existing validated SymPy graph endpoint and render the points directly on the board.
- [x] Add an opt-in local roast mode with a playful, constructive tone and an immediate off switch.

## Planned — service integration

- [x] Use the FastAPI session/context/tutor-turn flow for typed questions when configured; retain a local fallback when the service is unavailable.
- [x] Persist the opaque FastAPI session and active worksheet IDs with the browser workspace, restore them after reload, and pass both the ID and current context to Bolna. The in-memory demo service automatically recreates the API session after a service restart.
