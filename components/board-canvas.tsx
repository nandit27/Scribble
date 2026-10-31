"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState, WheelEvent as ReactWheelEvent } from "react";
import { GraphView } from "./graph-view";
import type { BoardNote, Point, Stroke, Tool } from "../lib/types";
import { makeId } from "../lib/id";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.5;

export function BoardCanvas({
  strokes, notes, tool, color, width, eraserRadius,
  zoom, pan, onZoomChange, onPanChange,
  onStroke, onErase, onAddNote, onRemoveNote,
  onMoveNote,
  showHint, onFirstInteraction,
}: {
  strokes: Stroke[];
  notes: BoardNote[];
  tool: Tool;
  color: string;
  width: number;
  eraserRadius: number;
  zoom: number;
  pan: Point;
  onZoomChange: (z: number) => void;
  onPanChange: (p: Point) => void;
  onStroke: (s: Stroke) => void;
  onErase: (p: Point) => void;
  onAddNote: (p: Point) => void;
  onRemoveNote: (id: string) => void;
  onMoveNote: (id: string, p: Point) => void;
  showHint: boolean;
  onFirstInteraction: () => void;
}) {
  const [active, setActive] = useState<Point[] | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [pointerScreen, setPointerScreen] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<{ x: number; y: number; pan: Point } | null>(null);
  const noteDrag = useRef<{ id: string; startX: number; startY: number; point: Point } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const toLocal = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const down = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (spaceDown || tool === "pan") { setPanning(true); panStart.current = { x: e.clientX, y: e.clientY, pan }; return; }
    const p = toLocal(e.clientX, e.clientY);
    if (tool === "text") { onAddNote(p); onFirstInteraction(); return; }
    setActive([p]);
  };

  const move = (e: ReactPointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setPointerScreen({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (panning && panStart.current) {
      onPanChange({ x: panStart.current.pan.x + (e.clientX - panStart.current.x), y: panStart.current.pan.y + (e.clientY - panStart.current.y) });
      return;
    }
    if (active) {
      const p = toLocal(e.clientX, e.clientY);
      if (tool === "eraser") onErase(p);
      else setActive((pts) => (pts ? [...pts, p] : [p]));
    }
  };

  const up = () => {
    if (panning) { setPanning(false); panStart.current = null; return; }
    if (active && active.length > 1 && tool === "pen") { onStroke({ id: makeId(), points: active, color, width }); onFirstInteraction(); }
    else if (active && tool === "eraser") onFirstInteraction();
    setActive(null);
  };

  const startNoteDrag = (e: ReactPointerEvent<HTMLDivElement>, note: BoardNote) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    noteDrag.current = { id: note.id, startX: e.clientX, startY: e.clientY, point: { x: note.x, y: note.y } };
  };

  const moveNote = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = noteDrag.current;
    if (!drag) return;
    e.stopPropagation();
    onMoveNote(drag.id, {
      x: drag.point.x + (e.clientX - drag.startX) / zoom,
      y: drag.point.y + (e.clientY - drag.startY) / zoom,
    });
  };

  const endNoteDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!noteDrag.current) return;
    e.stopPropagation();
    noteDrag.current = null;
  };

  const onWheel = (e: ReactWheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const localX = (sx - pan.x) / zoom, localY = (sy - pan.y) / zoom;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 - e.deltaY * 0.01)));
    onZoomChange(next);
    onPanChange({ x: sx - localX * next, y: sy - localY * next });
  };

  const cursor = spaceDown || tool === "pan" ? (panning ? "grabbing" : "grab") : tool === "pen" ? "crosshair" : tool === "text" ? "text" : "none";

  return (
    <div className="board-canvas-wrap">
      <svg
        ref={svgRef}
        className="board-canvas"
        style={{ cursor }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => setPointerScreen(null)}
        onWheel={onWheel}
        aria-label="Interactive whiteboard"
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {strokes.map((s) => (
            <polyline key={s.id} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {active && <polyline points={active.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
          {notes.map((n) => (
            <foreignObject key={n.id} x={n.x} y={n.y} width={n.graph ? 300 : 300} height={n.graph ? 400 : 280}>
              <div
                className={`board-note ${n.kind} ${n.graph ? "has-graph" : ""}`}
                onPointerDown={(e) => startNoteDrag(e, n)}
                onPointerMove={moveNote}
                onPointerUp={endNoteDrag}
                onPointerCancel={endNoteDrag}
              >
                <button className="note-remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemoveNote(n.id)} aria-label="Dismiss note">×</button>
                <span>{n.kind === "equation" ? "Equation" : n.kind === "highlight" ? `Linked note · page ${n.page ?? "?"}` : "Tutor note"}</span>
                {n.text}
                {n.graph && <GraphView graph={n.graph} />}
              </div>
            </foreignObject>
          ))}
        </g>
      </svg>
      {tool === "eraser" && pointerScreen && !spaceDown && (
        <span
          className="eraser-ring"
          style={{ left: pointerScreen.x, top: pointerScreen.y, width: eraserRadius * 2 * zoom, height: eraserRadius * 2 * zoom }}
        />
      )}
      <div className="board-zoom-hud">
        <button onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))} aria-label="Zoom out" title="Zoom out">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))} aria-label="Zoom in" title="Zoom in">+</button>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button onClick={() => { onZoomChange(1); onPanChange({ x: 0, y: 0 }); }} title="Reset zoom and position">Reset</button>
        )}
      </div>
      <div className={`board-hint ${showHint ? "" : "is-hidden"}`} aria-hidden={!showHint}>
        {tool === "text" ? "Click anywhere to add a note" : tool === "pan" ? "Drag to move around the whiteboard" : "Draw to get started · hold space to pan · Ctrl + scroll to zoom"}
      </div>
    </div>
  );
}
