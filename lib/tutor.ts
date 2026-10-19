import type { Artifact } from "./types";

export function modeOf(q: string) {
  return /plot|graph/i.test(q) ? "Plotting" : /check|correct/i.test(q) ? "Checking" : /hint/i.test(q) ? "Hinting" : "Explaining";
}

export function makeArtifact(question: string): Artifact {
  const q = question.toLowerCase();
  if (q.includes("plot") || q.includes("graph")) {
    const expression = q.includes("cos") ? "cos(x)" : q.includes("x\u00b2") || q.includes("x^2") ? "x\u00b2" : "sin(x) + x/3";
    const points = Array.from({ length: 61 }, (_, i) => {
      const x = -6 + i / 5;
      const y = expression === "cos(x)" ? Math.cos(x) : expression === "x\u00b2" ? (x * x) / 5 : Math.sin(x) + x / 3;
      return { x, y };
    });
    return { type: "graph", title: "A quick visual check", body: "This bounded plot is generated locally from the supported expression. It is illustrative, not a proof.", graph: { expression, points }, status: "not_applicable" };
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
    body: hint ? "Look for the operation that changes the outer function, then name the rule that matches it." : "Here is a compact explanation grounded in the active study surface.",
    steps: hint
      ? ["Circle the expression that changes.", "Ask which rule describes that change.", "Apply only that rule before simplifying."]
      : ["Name the quantity or rule in the selected line.", "Substitute the known values without changing the structure.", "Simplify one operation at a time and check the units or signs."],
    status: "not_applicable",
  };
}
