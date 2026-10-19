"use client";

import { LayoutGlyph } from "./layout-glyph";
import { formatRelativeTime } from "../lib/time";
import type { View } from "../lib/types";

const OPTIONS: { view: View; glyph: "pdf" | "notes" | "split"; title: string; description: string; recommended?: boolean }[] = [
  { view: "pdf", glyph: "pdf", title: "Open PDF", description: "Read a study document, page by page." },
  { view: "notes", glyph: "notes", title: "Open notes", description: "Write and sketch on a blank whiteboard." },
  { view: "split", glyph: "split", title: "Open side by side", description: "Keep your document and notes in view together.", recommended: true },
];

export function WelcomeScreen({
  sessionName, hasProgress, updatedAt, contentsLabel, onContinue, onSelect,
}: {
  sessionName: string;
  hasProgress: boolean;
  updatedAt?: string;
  contentsLabel: string;
  onContinue: () => void;
  onSelect: (view: View) => void;
}) {
  return (
    <section className="welcome">
      <div className="welcome-inner">
        <h1>Welcome to Scribble</h1>
        <p>Study with your source, your notes, and a tutor that sees both.</p>

        {hasProgress && (
          <button className="continue-row" onClick={onContinue}>
            <span className="continue-row-main">
              <span className="label">Continue</span>
              <strong>{sessionName}</strong>
              <span className="continue-row-meta">Edited {formatRelativeTime(updatedAt)} · {contentsLabel}</span>
            </span>
            <span className="continue-row-arrow" aria-hidden="true">→</span>
          </button>
        )}

        <div className="welcome-section">
          <span className="label">Start something new</span>
          <div className="option-list">
            {OPTIONS.map((opt) => (
              <button key={opt.view} className="option-row" onClick={() => onSelect(opt.view)}>
                <LayoutGlyph variant={opt.glyph} />
                <span className="option-row-text">
                  <b>
                    {opt.title}
                    {opt.recommended && <em className="recommended">Recommended</em>}
                  </b>
                  <span>{opt.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
