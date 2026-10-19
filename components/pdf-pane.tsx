"use client";

import { ChangeEvent, DragEvent, RefObject } from "react";
import { TutorControls } from "./tutor-controls";
import { ZOOM_PRESETS } from "../lib/board";
import type { View } from "../lib/types";

type TutorProps = Parameters<typeof TutorControls>[0];

export function PdfPane({
  pdfUrl, pdfName, page, onPageChange, zoom, onZoom,
  fileInputRef, onOpenPicker, onFileChange,
  dragOver, onDragOver, onDragLeave, onDrop,
  fileError, pdfLoading,
  highlightMode, onToggleHighlight, onAddToNotes, highlightHintSeen,
  onTrySample,
  view, isFocused, isOtherFocused, onToggleFocus,
  mobileVisible, style, tutorProps,
}: {
  pdfUrl: string;
  pdfName: string;
  page: number;
  onPageChange: (p: number) => void;
  zoom: number;
  onZoom: (z: number) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpenPicker: () => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  fileError: string | null;
  pdfLoading: boolean;
  highlightMode: boolean;
  onToggleHighlight: () => void;
  onAddToNotes: () => void;
  highlightHintSeen: boolean;
  onTrySample: () => void;
  view: View;
  isFocused: boolean;
  isOtherFocused: boolean;
  onToggleFocus: () => void;
  mobileVisible: boolean;
  style?: React.CSSProperties;
  tutorProps: TutorProps | null;
}) {
  if (isOtherFocused) return null;
  const disabledTitle = "Open a PDF to enable";

  return (
    <section className={`surface pdf-pane ${mobileVisible ? "mobile-visible" : ""}`} style={style}>
      <div className="surface-head">
        <div>
          <span className="label">DOCUMENT</span>
          <h2>{pdfName || "No document open"}</h2>
        </div>
        <div className="surface-head-actions">
          {view === "split" && (
            <button className="small-button" onClick={onToggleFocus} title={isFocused ? "Show both panels" : "Expand this panel, hide notes temporarily"}>
              {isFocused ? "Show both panes" : "Focus"}
            </button>
          )}
          <button className="small-button" onClick={onOpenPicker}>Open PDF</button>
          <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={onFileChange} />
        </div>
      </div>

      <div className="pane-toolbar pdf-toolbar">
        <div className="toolbar-group">
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={!pdfUrl} title={pdfUrl ? "Previous page" : disabledTitle} aria-label="Previous page">‹</button>
          {pdfUrl ? (
            <input className="page-input" type="number" min={1} value={page} onChange={(e) => onPageChange(Math.max(1, Number(e.target.value) || 1))} aria-label="Jump to page" title="Type to jump to a page" />
          ) : (
            <span className="page-indicator" title={disabledTitle}>– / –</span>
          )}
          <button onClick={() => onPageChange(page + 1)} disabled={!pdfUrl} title={pdfUrl ? "Next page" : disabledTitle} aria-label="Next page">›</button>
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={() => onZoom(ZOOM_PRESETS[Math.max(0, ZOOM_PRESETS.indexOf(zoom) - 1)])} disabled={!pdfUrl} title={pdfUrl ? "Zoom out" : disabledTitle} aria-label="Zoom out">−</button>
          <select value={zoom} disabled={!pdfUrl} onChange={(e) => onZoom(Number(e.target.value))} aria-label="Zoom preset" title={pdfUrl ? "Zoom presets" : disabledTitle}>
            {ZOOM_PRESETS.map((z) => <option key={z} value={z}>{z}%</option>)}
          </select>
          <button onClick={() => onZoom(ZOOM_PRESETS[Math.min(ZOOM_PRESETS.length - 1, ZOOM_PRESETS.indexOf(zoom) + 1)])} disabled={!pdfUrl} title={pdfUrl ? "Zoom in" : disabledTitle} aria-label="Zoom in">＋</button>
        </div>
        <span className="toolbar-divider" />
        <div className="toolbar-group">
          <button className={highlightMode ? "is-active" : ""} aria-pressed={highlightMode} disabled={!pdfUrl} onClick={onToggleHighlight} title={pdfUrl ? "Prepare a page reference to send to your notes" : disabledTitle}>
            ▱ Highlight
          </button>
          {highlightMode && pdfUrl && (
            <span className="highlight-inline">
              <button className="small-button" onClick={onAddToNotes}>Add to notes</button>
              {!highlightHintSeen && <span className="inline-hint">Sends a page reference to your whiteboard</span>}
            </span>
          )}
        </div>
        {view !== "split" && tutorProps && (
          <>
            <span className="toolbar-spacer" />
            <TutorControls {...tutorProps} />
          </>
        )}
      </div>

      <div className="pdf-stage">
        {pdfLoading ? (
          <div className="pdf-loading">
            <span className="spinner" aria-hidden="true" />
            <p>Opening document</p>
          </div>
        ) : pdfUrl ? (
          <iframe
            title={pdfName || "PDF document"}
            src={`${pdfUrl}#page=${page}&zoom=${zoom}`}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
          />
        ) : (
          <div className={`pdf-empty ${dragOver ? "drag-over" : ""}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
            <button type="button" className="pdf-dropzone" onClick={onOpenPicker}>
              <span className="dropzone-icon" aria-hidden="true">▤</span>
              <span className="dropzone-title">Drop a PDF here or choose a file</span>
              <span className="dropzone-hint">Files stay in this browser. Nothing is uploaded.</span>
              {fileError && <span className="field-error" role="alert">{fileError}</span>}
            </button>
            <button className="text-button" onClick={onTrySample}>Try with sample document</button>
          </div>
        )}
      </div>
    </section>
  );
}
