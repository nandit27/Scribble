import type { Artifact } from "./types";

export type TutorContext = { selectedText?: string; visiblePageText?: string; boardSummary?: string; roastMode?: boolean };

export function modeOf(q: string) {
  return /roast/i.test(q) ? "Roasting" : /plot|graph/i.test(q) ? "Plotting" : /check|correct/i.test(q) ? "Checking" : /hint/i.test(q) ? "Hinting" : "Explaining";
}

export function makeArtifact(question: string, context: TutorContext = {}): Artifact {
  const q = question.toLowerCase();
  const source = context.selectedText || context.visiblePageText || context.boardSummary;
  if (context.roastMode || /\broast me\b|\broast mode\b/i.test(question)) {
    return { type: "steps", title: "Gentle roast", body: "Your algebra is doing parkour around the equals sign. Bold choice—but let’s land one step at a time.", steps: source ? ["I kept your selected context in view.", "Now make one legal transformation and write why it is valid."] : ["Give me a line of work to roast constructively."], status: "not_applicable" };
  }
  if (q.includes("plot") || q.includes("graph")) {
    return { type: "steps", title: "Graph request", body: "Start the Scribble API to create a validated graph, then ask with an expression such as graph sin(x) + x/3.", steps: ["The graph endpoint validates the expression before creating board points."], status: "not_applicable" };
  }
  if (q.includes("check") || q.includes("correct")) {
    return {
      type: "check",
      title: "Work check",
      body: "I can compare the typed work with the active context. Your visible strokes are not transcribed, so this result is unverified. Select or type the step you want checked.",
      steps: ["Identify the exact step to check.", "Compare each transformation with the rule being used.", "Test the result with a simple value before continuing."],
      status: "unverified",
    };
  }
  const hint = q.includes("hint");
  return {
    type: "steps",
    title: hint ? "A next-step hint" : "Why this step works",
    body: hint ? `Look for the operation that changes the outer function, then name the rule that matches it.${source ? " I’m using your active document or board context." : ""}` : `Here is a compact explanation grounded in the active study surface.${source ? " I used the selected or visible source text." : ""}`,
    steps: hint
      ? ["Circle the expression that changes.", "Ask which rule describes that change.", "Apply only that rule before simplifying."]
      : ["Name the quantity or rule in the selected line.", "Substitute the known values without changing the structure.", "Simplify one operation at a time and check the units or signs."],
    status: "not_applicable",
  };
}
