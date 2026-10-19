export type Point = { x: number; y: number };
export type Stroke = { id: string; points: Point[]; color: string; width: number };
export type Graph = { expression: string; points: Point[] };
export type BoardNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: "note" | "equation" | "highlight";
  graph?: Graph;
  page?: number;
};
export type Artifact = {
  type: "steps" | "graph" | "check";
  title: string;
  body: string;
  steps?: string[];
  graph?: Graph;
  status: string;
};
export type Turn = { id: string; question: string; response: string; artifact: Artifact; createdAt: string };

export type SavedState = {
  strokes: Stroke[];
  notes: BoardNote[];
  turns: Turn[];
  page: number;
  zoom: number;
  sessionName?: string;
  updatedAt?: string;
  splitRatio?: number;
  pdfName?: string;
  boardContextEnabled?: boolean;
};

export type View = "welcome" | "pdf" | "notes" | "split";
export type Tool = "pen" | "eraser" | "text";
