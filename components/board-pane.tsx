"use client";

import { BoardCanvas } from "./board-canvas";
import { TutorControls } from "./tutor-controls";
import { COLORS, COLOR_NAMES, STROKE_STEPS, eraserRadiusFor } from "../lib/board";
import type { BoardNote, Point, Stroke, Tool, View } from "../lib/types";

type TutorProps = Parameters<typeof TutorControls>[0];

export function BoardPane({
  strokes, notes, tool, onToolChange, color, onColorChange, width, onWidthChange,
  onStroke, onErase, onAddNote, onRemoveNote, onMoveNote,
  undo, redo, canUndo, canRedo,
  confirmingClear, onRequestClear, onConfirmClear, onCancelClear,
  boardContextEnabled, onToggleBoardContext,
  boardZoom, boardPan, onBoardZoomChange, onBoardPanChange,
  showHint, onFirstInteraction,
  view, isFocused, isOtherFocused, onToggleFocus,
  mobileVisible, style, tutorProps,
}: {
  strokes: Stroke[];
  notes: BoardNote[];
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  onColorChange: (c: string) => void;
  width: number;
  onWidthChange: (w: number) => void;
  onStroke: (s: Stroke) => void;
  onErase: (p: Point) => void;
  onAddNote: (p: Point) => void;
  onRemoveNote: (id: string) => void;
  onMoveNote: (id: string, p: Point) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  confirmingClear: boolean;
  onRequestClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
  boardContextEnabled: boolean;
  onToggleBoardContext: () => void;
  boardZoom: number;
  boardPan: Point;
  onBoardZoomChange: (z: number) => void;
  onBoardPanChange: (p: Point) => void;
  showHint: boolean;
  onFirstInteraction: () => void;
  view: View;
  isFocused: boolean;
  isOtherFocused: boolean;
  onToggleFocus: () => void;
  mobileVisible: boolean;
  style?: React.CSSProperties;
  tutorProps: TutorProps | null;
}) {
  if (isOtherFocused) return null;

  return (
    <section className={`surface board-pane ${mobileVisible ? "mobile-visible" : ""}`} style={style}>
      <div className="surface-head">
        <div>
          <span className="label">WHITEBOARD</span>
          <h2>Untitled study notes</h2>
        </div>
        {view === "split" && (
          <button className="small-button" onClick={onToggleFocus} title={isFocused ? "Show both panels" : "Expand this panel, hide the document temporarily"}>
            {isFocused ? "Show both panes" : "Focus"}
          </button>
        )}
      </div>

      <div className="pane-toolbar board-toolbar">
        <div className="toolbar-group segmented" role="group" aria-label="Drawing tool">
          {(["pan", "pen", "eraser", "text"] as const).map((t) => (
            <button key={t} className={tool === t ? "is-active" : ""} aria-pressed={tool === t} onClick={() => onToolChange(t)} title={t === "pan" ? "Move around the whiteboard" : undefined}>
              {t === "pan" ? (
                <svg className="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.5 11V5.75a1.75 1.75 0 0 1 3.5 0V10m0-7.25a1.75 1.75 0 0 1 3.5 0V10m0-5.75a1.75 1.75 0 0 1 3.5 0V11m0-3.25a1.75 1.75 0 0 1 3.5 0v5.5c0 4.42-2.58 7-7 7h-1.25a6.25 6.25 0 0 1-5.3-2.94L4.1 14.6a1.75 1.75 0 0 1 3.02-1.8l.38.63V11" />
                </svg>
              ) : t === "pen" ? "Pen" : t === "eraser" ? "Eraser" : "Text"}
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-group" role="group" aria-label="Pen color">
          {COLORS.map((c) => (
            <button key={c} className={`color-dot ${color === c ? "picked" : ""}`} onClick={() => onColorChange(c)} aria-pressed={color === c} aria-label={`Use ${COLOR_NAMES[c] ?? c}`}>
              <span className="color-dot-fill" style={{ background: c }} />
              {color === c && <span className="color-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-group stroke-steps" role="group" aria-label="Stroke size">
          {STROKE_STEPS.map((step) => (
            <button key={step.width} className={width === step.width ? "is-selected" : ""} aria-pressed={width === step.width} onClick={() => onWidthChange(step.width)} aria-label={step.label} title={step.label}>
              <span className="stroke-preview" style={{ height: step.preview }} />
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-group" role="group" aria-label="History">
          <button onClick={undo} disabled={!canUndo} title="Undo (Cmd/Ctrl+Z)" aria-label="Undo">↶</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Cmd/Ctrl+Shift+Z)" aria-label="Redo">↷</button>
          {confirmingClear ? (
            <span className="confirm-inline">
              <span>Clear all strokes?</span>
              <button className="small-button" onClick={onCancelClear}>Cancel</button>
              <button className="small-button danger" onClick={onConfirmClear}>Clear canvas</button>
            </span>
          ) : (
            <button disabled={!strokes.length} onClick={onRequestClear} title="Remove every stroke from this board">Clear canvas</button>
          )}
        </div>
        <span className="toolbar-spacer" />
        <button className="context-chip" role="switch" aria-checked={boardContextEnabled} onClick={onToggleBoardContext} title="Control whether the tutor can reference this board">
          <span className="chip-switch" aria-hidden="true" />
          {boardContextEnabled ? "Share board with tutor" : "Board hidden from tutor"}
        </button>
        {view !== "split" && tutorProps && <TutorControls {...tutorProps} />}
      </div>

      <BoardCanvas
        strokes={strokes}
        notes={notes}
        tool={tool}
        color={color}
        width={width}
        eraserRadius={eraserRadiusFor(width)}
        zoom={boardZoom}
        pan={boardPan}
        onZoomChange={onBoardZoomChange}
        onPanChange={onBoardPanChange}
        onStroke={onStroke}
        onErase={onErase}
        onAddNote={onAddNote}
        onRemoveNote={onRemoveNote}
        onMoveNote={onMoveNote}
        showHint={showHint}
        onFirstInteraction={onFirstInteraction}
      />
    </section>
  );
}
