"""Scribble's demo backend.

It deliberately keeps data in process for the buildathon demo. Replace Store with
Postgres/private object storage before serving more than a single browser session.
"""
from __future__ import annotations

import ast
import math
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sympy import E, Symbol, cos, exp, lambdify, sin, sympify, tan

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
TOOL_SECRET = os.getenv("BOLNA_TOOL_SHARED_SECRET")
ALLOWED_TYPES = {"image/png", "image/jpeg", "application/pdf"}
SAFE_NAMES = {"x", "sin", "cos", "tan", "exp", "pi", "E"}

app = FastAPI(title="Scribble API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def error(status: int, code: str, message: str, retryable: bool = False) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message, "retryable": retryable})


class Store:
    sessions: dict[str, dict[str, Any]] = {}
    worksheets: dict[str, dict[str, Any]] = {}
    turns: dict[str, list[dict[str, Any]]] = {}


class ConfirmWorksheet(BaseModel):
    problem_text: str = Field(min_length=3, max_length=12000)
    expressions: list[str] = Field(default_factory=list, max_length=20)
    active_page: int = Field(default=1, ge=1, le=5)


class TutorRequest(BaseModel):
    scribble_session_id: str
    question: str = Field(min_length=2, max_length=3000)
    intent: Literal["explain_concept", "give_hint", "check_work", "graph_expression", "solve_problem"] | None = None
    focus_text: str | None = Field(default=None, max_length=2000)
    expression: str | None = Field(default=None, max_length=250)


class GraphRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=250)
    variable: Literal["x"] = "x"
    x_min: float = Field(default=-6.28, ge=-100, le=100)
    x_max: float = Field(default=6.28, ge=-100, le=100)


class PageContext(BaseModel):
    problem_text: str = Field(min_length=3, max_length=12000)
    source_url: str | None = Field(default=None, max_length=2048)
    source_title: str | None = Field(default=None, max_length=500)


def session_or_404(session_id: str) -> dict[str, Any]:
    item = Store.sessions.get(session_id)
    if not item: raise error(404, "session_not_found", "This Scribble session no longer exists.")
    return item


def infer_parse(filename: str) -> dict[str, Any]:
    # A transparent fallback: it never pretends generic image OCR succeeded.
    return {
        "problem_text": "Determine and sketch the function f(x) = sin(x) + x/3.",
        "expressions": ["sin(x) + x/3"],
        "latex": [r"f(x)=\sin(x)+\frac{x}{3}"],
        "variables": ["x"],
        "ambiguities": [{"text": "Upload text", "reason": "Demo parsing uses a sample until an OCR provider is configured."}],
        "confidence": 0.35,
        "source_name": filename,
    }


def safe_expression(expression: str):
    normalized = expression.strip().replace("^", "**")
    if len(normalized) > 250 or re.search(r"[^0-9a-zA-Z_+*/().,\-\s*]", normalized):
        raise error(422, "unsupported_expression", "Use x, numbers, +, -, *, /, powers, sin, cos, tan, or exp.")
    try:
        tree = ast.parse(normalized, mode="eval")
    except SyntaxError:
        raise error(422, "invalid_expression", "That expression is not valid math syntax.")
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id not in SAFE_NAMES:
            raise error(422, "unsupported_expression", f"'{node.id}' is not supported. Try x, sin, cos, tan, or exp.")
        if isinstance(node, (ast.Attribute, ast.Subscript, ast.Dict, ast.List, ast.Set, ast.Lambda, ast.IfExp)):
            raise error(422, "unsupported_expression", "That expression is not supported for graphing.")
    try:
        return normalized, sympify(normalized, locals={"x": Symbol("x"), "sin": sin, "cos": cos, "tan": tan, "exp": exp, "E": E})
    except Exception:
        raise error(422, "invalid_expression", "Scribble could not understand that expression.")


def graph(expression: str, x_min: float = -6.28, x_max: float = 6.28) -> dict[str, Any]:
    if x_min >= x_max: raise error(422, "invalid_range", "The graph start must be less than the graph end.")
    normalized, symbolic = safe_expression(expression)
    fn = lambdify(Symbol("x"), symbolic, modules=["math"])
    points = []
    for index in range(401):
        x_value = x_min + (x_max - x_min) * index / 400
        try:
            y_value = float(fn(x_value))
            if math.isfinite(y_value) and abs(y_value) < 1_000_000:
                points.append({"x": round(x_value, 5), "y": round(y_value, 5)})
        except (ArithmeticError, ValueError, TypeError):
            continue
    if len(points) < 2: raise error(422, "empty_graph", "This expression has no plottable values in that range.")
    return {"expression": normalized, "variable": "x", "points": points, "status": "ok"}


def intent_for(question: str) -> str:
    q = question.lower()
    if any(word in q for word in ["plot", "graph", "sketch"]): return "graph_expression"
    if any(word in q for word in ["hint", "next step", "don't solve"]): return "give_hint"
    if any(word in q for word in ["check", "wrong", "mistake"]): return "check_work"
    if "solve" in q: return "solve_problem"
    return "explain_concept"


def build_turn(request: TutorRequest, worksheet: dict[str, Any]) -> dict[str, Any]:
    intent = request.intent or intent_for(request.question)
    problem = worksheet.get("confirmed_problem_text")
    if not problem:
        return make_turn(request, intent, "Please confirm the extracted problem before I explain it.", "clarification", "Confirm the worksheet", [], "not_applicable")
    if intent == "check_work" and not request.focus_text:
        return make_turn(request, intent, "I can check it, but I need the line you want me to inspect. Type or select that step first.", "clarification", "Which step should I check?", [], "not_applicable")
    expression = request.expression or next(iter(worksheet.get("expressions", [])), None)
    if intent == "graph_expression":
        expression = request.expression or expression
        if not expression:
            return make_turn(request, intent, "Tell me the expression you want to plot, for example sin(x) or x**2.", "clarification", "Which expression should I plot?", [], "not_applicable")
        payload = graph(expression)
        return make_turn(request, intent, f"I plotted {payload['expression']}. Notice how the curve changes as x moves across the axis.", "graph", f"Graph of {payload['expression']}", [{"text": "Use the grid to compare values on either side of zero."}], "verified", payload)
    if intent == "give_hint":
        return make_turn(request, intent, "Start by naming the function and checking what happens at a simple value such as x equals zero. Then tell me what you notice.", "hint", "A next-step hint", [{"text": "Substitute x = 0 before expanding or simplifying."}], "not_applicable")
    if intent == "check_work":
        return make_turn(request, intent, "I can compare that line with the worksheet, but this demo cannot verify handwritten steps automatically. I have kept your selected step visible for a careful check.", "mistake", "Check this step", [{"text": request.focus_text or ""}], "unverified")
    return make_turn(request, intent, "I have the page context. Start by identifying what each term contributes, then test a simple input to see the structure.", "concept", "Why this step works", [{"text": "Read the expression as a combination of simpler pieces."}, {"text": "Try x = 0, then compare how each piece changes as x moves away from zero."}], "not_applicable")


def make_turn(request: TutorRequest, intent: str, spoken: str, artifact_type: str, title: str, steps: list[dict[str, str]], verification: str, graph_data: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"turn_id": str(uuid.uuid4()), "intent": intent, "spoken_response": spoken, "artifact": {"type": artifact_type, "title": title, "steps": steps, "graph": graph_data, "annotations": []}, "verification": {"status": verification, "notes": []}, "clarification_required": artifact_type == "clarification", "created_at": now(), "question_text": request.question}


@app.post("/api/v1/sessions", status_code=201)
def create_session():
    session_id = str(uuid.uuid4())
    Store.sessions[session_id] = {"id": session_id, "status": "active", "active_worksheet_id": None, "created_at": now()}
    Store.turns[session_id] = []
    return {"session_id": session_id, "status": "created"}


@app.delete("/api/v1/sessions/{session_id}", status_code=204)
def delete_session(session_id: str):
    """Clear one demo workspace, including its worksheet context and notes."""
    session_or_404(session_id)
    for worksheet_id in [key for key, item in Store.worksheets.items() if item["session_id"] == session_id]:
        del Store.worksheets[worksheet_id]
    del Store.sessions[session_id]
    Store.turns.pop(session_id, None)


@app.post("/api/v1/sessions/{session_id}/worksheets", status_code=201)
async def upload_worksheet(session_id: str, file: UploadFile = File(...)):
    session_or_404(session_id)
    if file.content_type not in ALLOWED_TYPES: raise error(415, "unsupported_file", "Upload a PNG, JPG, JPEG, or PDF under 10 MB.")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES: raise error(413, "file_too_large", "That file is larger than the 10 MB upload limit.")
    worksheet_id = str(uuid.uuid4())
    Store.worksheets[worksheet_id] = {"id": worksheet_id, "session_id": session_id, "mime_type": file.content_type, "parse_status": "needs_confirmation", **infer_parse(file.filename or "worksheet")}
    return {"worksheet_id": worksheet_id, "status": "needs_confirmation", "preview_url": None}


@app.post("/api/v1/sessions/{session_id}/context", status_code=201)
def attach_page_context(session_id: str, payload: PageContext):
    """Attach extracted visible page text from the extension as confirmed context."""
    session_or_404(session_id)
    worksheet_id = str(uuid.uuid4())
    Store.worksheets[worksheet_id] = {
        "id": worksheet_id, "session_id": session_id, "mime_type": "text/plain",
        "parse_status": "ready", "problem_text": payload.problem_text,
        "confirmed_problem_text": payload.problem_text, "expressions": [], "latex": [],
        "variables": [], "ambiguities": [], "confidence": 1.0,
        "source_url": payload.source_url, "source_title": payload.source_title,
        "confirmed_at": now(),
    }
    Store.sessions[session_id]["active_worksheet_id"] = worksheet_id
    return {"worksheet_id": worksheet_id, "status": "ready"}


@app.get("/api/v1/worksheets/{worksheet_id}")
def get_worksheet(worksheet_id: str):
    item = Store.worksheets.get(worksheet_id)
    if not item: raise error(404, "worksheet_not_found", "That worksheet was not found.")
    return item


@app.post("/api/v1/worksheets/{worksheet_id}/confirm")
def confirm_worksheet(worksheet_id: str, payload: ConfirmWorksheet):
    item = Store.worksheets.get(worksheet_id)
    if not item: raise error(404, "worksheet_not_found", "That worksheet was not found.")
    item.update({"confirmed_problem_text": payload.problem_text, "expressions": payload.expressions, "parse_status": "ready", "confirmed_at": now()})
    Store.sessions[item["session_id"]]["active_worksheet_id"] = worksheet_id
    return item


@app.post("/api/v1/tools/tutor-turn")
def tutor_turn(payload: TutorRequest, x_scribble_tool_secret: str | None = Header(default=None)):
    if TOOL_SECRET and not secrets.compare_digest(x_scribble_tool_secret or "", TOOL_SECRET): raise error(401, "unauthorized_tool", "Invalid tutor tool credentials.")
    return persist_turn(payload)


@app.post("/api/v1/sessions/{session_id}/tutor-turn")
def typed_tutor_turn(session_id: str, payload: TutorRequest):
    if payload.scribble_session_id != session_id:
        raise error(403, "session_mismatch", "The question does not belong to this session.")
    return persist_turn(payload)


def persist_turn(payload: TutorRequest):
    session = session_or_404(payload.scribble_session_id)
    worksheet_id = session.get("active_worksheet_id")
    if not worksheet_id: raise error(409, "worksheet_not_confirmed", "Confirm a worksheet before asking Scribble.")
    turn = build_turn(payload, Store.worksheets[worksheet_id])
    Store.turns[payload.scribble_session_id].append(turn)
    return {"turn_id": turn["turn_id"], "spoken_response": turn["spoken_response"], "artifact_summary": f"Added {turn['artifact']['title']} to the notebook.", "status": "ok"}


@app.get("/api/v1/sessions/{session_id}/turns")
def get_turns(session_id: str, after: str | None = None):
    session_or_404(session_id)
    turns = Store.turns[session_id]
    if after:
        turns = [turn for turn in turns if turn["created_at"] > after]
    return {"turns": turns}


@app.post("/api/v1/worksheets/{worksheet_id}/graph")
def make_graph(worksheet_id: str, payload: GraphRequest):
    if worksheet_id not in Store.worksheets: raise error(404, "worksheet_not_found", "That worksheet was not found.")
    return graph(payload.expression, payload.x_min, payload.x_max)
