# Scribble feature backlog

This file captures product requests as they arise and tracks their delivery.

## In progress — contextual document tutoring

- [x] Replace the browser PDF iframe with a PDF.js document surface.
- [x] Extract the visible page's text and capture a student's text selection.
- [x] Attach the selected text (falling back to visible-page text) to typed tutor context.
- [x] Include the current document/selection and an opt-in board summary in the voice-session context.

## Planned — decision-led tutor actions

- [x] Add a server-side Jev decision adapter that chooses `complete_handwriting`, `draw_graph`, `explain`, or `roast`, with a confidence threshold and deterministic fallback.
- [x] For handwriting completion, generate visibly labeled vector practice strokes only from an explicit student-confirmed target—never a raster image or a forged submission.
- [x] Route graph requests through the validated SymPy graph endpoint and render returned points directly on the board (never as an image).
- [x] Add an opt-in local roast mode with a playful, constructive tone and an immediate off switch.

## Planned — service integration

- [x] Use the FastAPI session/context/tutor-turn flow for typed questions when configured; retain a local fallback when the service is unavailable.
- [x] Persist the opaque FastAPI session and active worksheet IDs with the browser workspace, restore them after reload, and pass both the ID and current context to Bolna. The in-memory demo service automatically recreates the API session after a service restart.
