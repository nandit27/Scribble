import type { Artifact, Turn } from "./types";
import type { TutorContext } from "./tutor";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiTurn = { turn_id: string; question_text: string; spoken_response: string; created_at: string; artifact: { type: string; title: string; steps?: { text: string }[]; graph?: Artifact["graph"] }; verification: { status: string } };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error("Tutor service unavailable");
  return response.json();
}

export async function askTutorService(sessionId: string | null, question: string, context: TutorContext): Promise<{ sessionId: string; turn: Turn } | null> {
  if (!API_URL) return null;
  const id = sessionId ?? (await request("/api/v1/sessions", { method: "POST" })).session_id as string;
  const source = context.selectedText || context.visiblePageText || context.boardSummary;
  if (!source) return null;
  await request(`/api/v1/sessions/${id}/context`, { method: "POST", body: JSON.stringify({ problem_text: source, source_title: context.selectedText ? "Selected PDF text" : "Visible study context" }) });
  await request(`/api/v1/sessions/${id}/tutor-turn`, { method: "POST", body: JSON.stringify({ scribble_session_id: id, question, focus_text: context.selectedText ?? context.boardSummary }) });
  const data = await request(`/api/v1/sessions/${id}/turns`);
  const result = data.turns.at(-1) as ApiTurn | undefined;
  if (!result) throw new Error("Tutor service returned no turn");
  const artifact: Artifact = {
    type: result.artifact.type === "graph" ? "graph" : result.artifact.type === "mistake" ? "check" : "steps",
    title: result.artifact.title,
    body: result.spoken_response,
    steps: result.artifact.steps?.map((step) => step.text),
    graph: result.artifact.graph,
    status: result.verification.status,
  };
  return { sessionId: id, turn: { id: result.turn_id, question: result.question_text, response: result.spoken_response, artifact, createdAt: result.created_at } };
}
