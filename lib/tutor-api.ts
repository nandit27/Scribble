import type { Artifact, Turn } from "./types";
import type { TutorContext } from "./tutor";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiTurn = { turn_id: string; question_text: string; spoken_response: string; created_at: string; artifact: { type: string; title: string; steps?: { text: string }[]; graph?: Artifact["graph"] }; verification: { status: string } };
type GraphPayload = NonNullable<Artifact["graph"]>;

export function graphExpression(question: string, context: TutorContext): string | null {
  const explicit = question.match(/(?:plot|graph|sketch)\s+(?:(?:the|a)\s+)?(?:(?:of|for)\s+)?(?:function\s+)?(?:y\s*=\s*|f\s*\(\s*x\s*\)\s*=\s*)?([^?.!]+)/i)?.[1]?.trim();
  const source = context.selectedText || context.visiblePageText || "";
  const fromSource = source.match(/(?:f\s*\(\s*x\s*\)|y)\s*=\s*([^\n,;]+)/i)?.[1]?.trim();
  const candidate = explicit && /[x\d]|sin|cos|tan|exp/i.test(explicit) ? explicit : fromSource;
  return candidate?.replace(/\s+(?:and|then)\s+(?:explain|tell|show|describe|check)\b.*$/i, "").replace(/\u00b2/g, "**2").replace(/\u00b3/g, "**3").replace(/\bx\s+squared\b/gi, "x**2").replace(/\bx\s+cubed\b/gi, "x**3").replace(/\bplease\b/gi, "").trim() || null;
}

class TutorApiError extends Error { constructor(message: string, public status: number) { super(message); } }

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/tutor-proxy${path.replace(/^\/api\/v1/, "")}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new Error("Cannot reach the tutor service. Start the API and check NEXT_PUBLIC_API_URL.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new TutorApiError(typeof body?.error === "string" ? body.error : "Tutor service unavailable", response.status);
  }
  return response.json();
}

function toTurn(result: ApiTurn): Turn {
  const artifact: Artifact = {
    type: result.artifact.type === "graph" ? "graph" : result.artifact.type === "mistake" ? "check" : "steps",
    title: result.artifact.title,
    body: result.spoken_response,
    steps: result.artifact.steps?.map((step) => step.text),
    graph: result.artifact.graph,
    status: result.verification.status,
  };
  return { id: result.turn_id, question: result.question_text, response: result.spoken_response, artifact, createdAt: result.created_at };
}

export async function askTutorService(sessionId: string | null, question: string, context: TutorContext, forceGraph = false): Promise<{ sessionId: string; worksheetId: string; turn: Turn } | null> {
  const wantsGraph = forceGraph || /\b(plot|graph|sketch)\b/i.test(question);
  const expression = wantsGraph ? graphExpression(question, context) : null;
  const contextForRequest = wantsGraph && expression && !(context.selectedText || context.visiblePageText || context.boardSummary)
    ? { ...context, visiblePageText: `Graph the function f(x) = ${expression}.` }
    : context;
  const attached = await ensureTutorContext(sessionId, contextForRequest);
  if (!attached?.worksheetId) return null;
  const id = attached.sessionId;
  if (wantsGraph) {
    if (!expression) throw new Error("Tell Scribble which expression to graph, or select it in the document.");
    const graph = await request(`/api/v1/worksheets/${attached.worksheetId}/graph`, { method: "POST", body: JSON.stringify({ expression }) }) as GraphPayload;
    const artifact: Artifact = { type: "graph", title: `Graph of ${graph.expression}`, body: `Validated and plotted ${graph.expression} with Scribble's safe math engine.`, graph, status: "verified" };
    return { sessionId: id, worksheetId: attached.worksheetId, turn: { id: crypto.randomUUID(), question, response: artifact.body, artifact, createdAt: new Date().toISOString() } };
  }
  await request(`/api/v1/sessions/${id}/tutor-turn`, { method: "POST", body: JSON.stringify({ scribble_session_id: id, question, focus_text: context.selectedText ?? context.boardSummary }) });
  const data = await request(`/api/v1/sessions/${id}/turns`);
  const result = data.turns.at(-1) as ApiTurn | undefined;
  if (!result) throw new Error("Tutor service returned no turn");
  return { sessionId: id, worksheetId: attached.worksheetId, turn: toTurn(result) };
}

/** Render a graph requested in a voice turn against the existing voice worksheet. */
export async function graphVoiceTurn(worksheetId: string, turn: Turn, context: TutorContext): Promise<Turn | null> {
  const expression = graphExpression(turn.question, context);
  if (!expression) return null;
  let graph: GraphPayload;
  try {
    graph = await request(`/api/v1/worksheets/${worksheetId}/graph`, { method: "POST", body: JSON.stringify({ expression }) }) as GraphPayload;
  } catch (error) {
    if (error instanceof TutorApiError && error.status >= 400 && error.status < 500) return null;
    throw error;
  }
  const artifact: Artifact = { type: "graph", title: `Graph of ${graph.expression}`, body: `Plotted ${graph.expression}.`, graph, status: "verified" };
  return { ...turn, artifact, response: artifact.body };
}

/** Reads visual artifacts created by Bolna's tutor_turn tool during a live voice session. */
export async function getTutorTurns(sessionId: string, after?: string): Promise<Turn[]> {
  if (!API_URL) return [];
  const suffix = after ? `?after=${encodeURIComponent(after)}` : "";
  const data = await request(`/api/v1/sessions/${sessionId}/turns${suffix}`) as { turns?: ApiTurn[] };
  return (data.turns ?? []).map(toTurn);
}

/** Creates/restores an opaque API session and attaches the current study context as its active worksheet. */
export async function ensureTutorContext(sessionId: string | null, context: TutorContext, restoreMissing = true): Promise<{ sessionId: string; worksheetId?: string } | null> {
  if (!API_URL) throw new Error("Tutor service is not configured. Set NEXT_PUBLIC_API_URL and restart the app.");
  const source = [context.selectedText && `Selected text: ${context.selectedText}`, context.visiblePageText && `Document: ${context.visiblePageText}`, context.boardSummary && `Board: ${context.boardSummary}`].filter(Boolean).join("\n\n").slice(0, 12000);
  const create = async () => (await request("/api/v1/sessions", { method: "POST" })).session_id as string;
  let id = sessionId ?? await create();
  if (!source) return { sessionId: id };
  const attach = async (targetId: string) => request(`/api/v1/sessions/${targetId}/context`, {
      method: "POST",
      body: JSON.stringify({ problem_text: source, source_title: context.selectedText ? "Selected PDF text" : "Visible study context" }),
    });
  try {
    const worksheet = await attach(id);
    return { sessionId: id, worksheetId: worksheet.worksheet_id as string };
  } catch (error) {
    // Only restore a session that the service explicitly reports as missing.
    if (!restoreMissing || !sessionId || !(error instanceof TutorApiError) || error.status !== 404) throw error;
    id = await create();
    const worksheet = await attach(id);
    return { sessionId: id, worksheetId: worksheet.worksheet_id as string };
  }
}
