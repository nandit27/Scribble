export type TutorAction = "complete_handwriting" | "draw_graph" | "explain" | "roast";
export type DecisionInput = { question: string; selectedText?: string; visiblePageText?: string; boardSummary?: string; roastMode?: boolean; handwritingTarget?: string; handwritingConfirmed?: boolean };
export async function decideTutorAction(input: DecisionInput): Promise<TutorAction> {
  const response = await fetch("/api/jev-decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Decision service unavailable");
  return (await response.json() as { action: TutorAction }).action;
}
