"use client";

import { useMemo } from "react";
import type { Graph } from "../lib/types";

export function GraphView({ graph }: { graph: Graph }) {
  const path = useMemo(() => {
    const xs = graph.points.map((p) => p.x), ys = graph.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const sx = (x: number) => ((x - minX) / (maxX - minX || 1)) * 100;
    const sy = (y: number) => 100 - ((y - minY) / (maxY - minY || 1)) * 100;
    return { d: graph.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" "), x: sy(0), y: sx(0) };
  }, [graph]);
  return (
    <div className="graph-card">
      <code>y = {graph.expression}</code>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Graph of ${graph.expression}`}>
        <path className="axis" d={`M0 ${path.x}H100 M${path.y} 0V100`} />
        <path className="curve" d={path.d} />
      </svg>
    </div>
  );
}
