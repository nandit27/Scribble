import { makeId } from "./id";
import type { Stroke } from "./types";

// A simple vector practice alphabet—not an imitation of the student's handwriting.
const glyphs: Record<string, number[][]> = { "0":[[0,0,1,0,1,2,0,2,0,0]], "1":[[.5,0,.5,2]], "2":[[0,0,1,0,1,1,0,2,1,2]], "3":[[0,0,1,0,.5,1,1,2,0,2]], "4":[[0,0,0,1,1,1,1,0,1,2]], "5":[[1,0,0,0,0,1,1,1,1,2,0,2]], "6":[[1,0,0,1,0,2,1,2,1,1,0,1]], "7":[[0,0,1,0,.35,2]], "8":[[0,0,1,0,1,2,0,2,0,0],[0,1,1,1]], "9":[[1,1,0,1,0,0,1,0,1,2]], "x":[[0,0,1,2],[1,0,0,2]], "y":[[0,0,.5,1,1,0,.5,2]], "f":[[.7,0,.3,0,.3,2],[0,1,1,1]], "s":[[1,0,0,0,0,1,1,1,1,2,0,2]], "i":[[.5,.5,.5,2],[.5,0,.5,.1]], "n":[[0,2,0,.6,1,2,1,.6,0,1.3]], "c":[[1,0,0,0,0,2,1,2]], "o":[[0,0,1,0,1,2,0,2,0,0]], "+":[[.5,.4,.5,1.6],[0,1,1,1]], "-":[[0,1,1,1]], "=":[[0,.65,1,.65],[0,1.35,1,1.35]], "/":[[0,2,1,0]], "(":[[1,0,.3,.5,.3,1.5,1,2]], ")":[[0,0,.7,.5,.7,1.5,0,2]], ".":[[.5,1.9,.5,2]] };
export function targetToPracticeStrokes(target: string, x = 100, y = 150): Stroke[] {
  const scale = 18, advance = 24;
  return [...target.toLowerCase()].slice(0, 80).flatMap((char, index) => (glyphs[char] ?? []).map((segment) => ({ id: makeId(), color: "#4073d9", width: 2.5, points: segment.reduce<{ x: number; y: number }[]>((points, value, i) => i % 2 ? points : [...points, { x: x + index * advance + value * scale, y: y + segment[i + 1] * scale }], []) })));
}
