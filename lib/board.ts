export const COLORS = ["#202019", "#4073d9", "#d96349", "#5a8c61"];
export const COLOR_NAMES: Record<string, string> = {
  "#202019": "Ink",
  "#4073d9": "Blue",
  "#d96349": "Coral",
  "#5a8c61": "Moss",
};
export const STROKE_STEPS = [
  { width: 2, label: "Fine" },
  { width: 3, label: "Medium" },
  { width: 6, label: "Bold" },
] as const;

export const ZOOM_PRESETS = [60, 75, 100, 125, 150, 160];

export function eraserRadiusFor(width: number) {
  return width * 6;
}
