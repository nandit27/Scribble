import type { Stroke } from "./types";

export function captureStudyImages(strokes: Stroke[], includeBoard: boolean): string[] {
  const images: string[] = [];
  const pdf = document.querySelector<HTMLCanvasElement>(".pdf-document canvas");
  if (pdf && pdf.width && pdf.height) {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(pdf.width, pdf.height));
    canvas.width = Math.max(1, Math.round(pdf.width * scale));
    canvas.height = Math.max(1, Math.round(pdf.height * scale));
    canvas.getContext("2d")?.drawImage(pdf, 0, 0, canvas.width, canvas.height);
    images.push(canvas.toDataURL("image/jpeg", 0.8));
  }
  if (includeBoard && strokes.length) {
    const points = strokes.flatMap((stroke) => stroke.points);
    if (points.length) {
      const minX = Math.min(...points.map((p) => p.x)) - 24, minY = Math.min(...points.map((p) => p.y)) - 24;
      const maxX = Math.max(...points.map((p) => p.x)) + 24, maxY = Math.max(...points.map((p) => p.y)) + 24;
      const scale = Math.min(1, 1600 / Math.max(maxX - minX, maxY - minY));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil((maxX - minX) * scale));
      canvas.height = Math.max(1, Math.ceil((maxY - minY) * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale); ctx.translate(-minX, -minY);
        for (const stroke of strokes) {
          if (!stroke.points.length) continue;
          ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        images.push(canvas.toDataURL("image/jpeg", 0.8));
      }
    }
  }
  return images;
}
