import type { Artifact, Turn } from "./types";
import type { TutorContext } from "./tutor";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiTurn = { turn_id: string; question_text: string; spoken_response: string; created_at: string; artifact: { type: string; title: string; steps?: { text: string }[]; graph?: Artifact["graph"] }; verification: { status: string } };
type GraphPayload = NonNullable<Artifact["graph"]>;

function graphExpression(question: string, context: TutorContext): string | null {
  const explicit = question.match(/(?:plot|graph|sketch)\s+(?:the\s+)?(?:function\s+)?(?:y\s*=\s*|f\s*\(\s*x\s*\)\s*=\s*)?([^?.!]+)/i)?.[1]?.trim();
  const source = context.selectedText || context.visiblePageText || "";
  const fromSource = source.match(/(?:f\s*\(\s*x\s*\)|y)\s*=\s*([^\n,;]+)/i)?.[1]?.trim();
  const candidate = explicit && /[x\d]|sin|cos|tan|exp/i.test(explicit) ? explicit : fromSource;
  return candidate?.replace(/\bplease\b/gi, "").trim() || null;
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/tutor-proxy${path.replace(/^\/api\/v1/, "")}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new Error("Cannot reach the tutor service. Start the API and check NEXT_PUBLIC_API_URL.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : "Tutor service unavailable");
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

/** Reads visual artifacts created by Bolna's tutor_turn tool during a live voice session. */
export async function getTutorTurns(sessionId: string, after?: string): Promise<Turn[]> {
  if (!API_URL) return [];
  const suffix = after ? `?after=${encodeURIComponent(after)}` : "";
  const data = await request(`/api/v1/sessions/${sessionId}/turns${suffix}`) as { turns?: ApiTurn[] };
  return (data.turns ?? []).map(toTurn);
}

/** Creates/restores an opaque API session and attaches the current study context as its active worksheet. */
export async function ensureTutorContext(sessionId: string | null, context: TutorContext): Promise<{ sessionId: string; worksheetId?: string } | null> {
  if (!API_URL) throw new Error("Tutor service is not configured. Set NEXT_PUBLIC_API_URL and restart the app.");
  const source = context.selectedText || context.visiblePageText || context.boardSummary;
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
  } catch {
    // The demo API stores sessions in memory; a server restart invalidates a persisted ID.
    if (!sessionId) throw new Error("Tutor context could not be attached");
    id = await create();
    const worksheet = await attach(id);
    return { sessionId: id, worksheetId: worksheet.worksheet_id as string };
  }
}
