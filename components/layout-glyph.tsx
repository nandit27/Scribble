"use client";

/** Small schematic diagrams showing the pane arrangement each option opens into. */
export function LayoutGlyph({ variant }: { variant: "pdf" | "notes" | "split" }) {
  if (variant === "pdf") {
    return (
      <svg className="layout-glyph" width="36" height="24" viewBox="0 0 36 24" fill="none" aria-hidden="true">
        <rect x="0.75" y="0.75" width="34.5" height="22.5" rx="3" className="glyph-frame" />
        <line x1="7" y1="7" x2="29" y2="7" className="glyph-mark" />
        <line x1="7" y1="12" x2="29" y2="12" className="glyph-mark" />
        <line x1="7" y1="17" x2="20" y2="17" className="glyph-mark" />
      </svg>
    );
  }
  if (variant === "notes") {
    return (
      <svg className="layout-glyph" width="36" height="24" viewBox="0 0 36 24" fill="none" aria-hidden="true">
        <rect x="0.75" y="0.75" width="34.5" height="22.5" rx="3" className="glyph-frame" />
        <path d="M7 17 L12 7 L17 15 L22 6 L28 13" className="glyph-pen" />
      </svg>
    );
  }
  return (
    <svg className="layout-glyph" width="36" height="24" viewBox="0 0 36 24" fill="none" aria-hidden="true">
      <rect x="0.75" y="0.75" width="15.5" height="22.5" rx="2.5" className="glyph-frame" />
      <line x1="5" y1="7" x2="13" y2="7" className="glyph-mark" />
      <line x1="5" y1="11" x2="13" y2="11" className="glyph-mark" />
      <line x1="5" y1="15" x2="10" y2="15" className="glyph-mark" />
      <rect x="19.75" y="0.75" width="15.5" height="22.5" rx="2.5" className="glyph-frame" />
      <path d="M23 17 L25.5 8 L28 14 L30.5 7" className="glyph-pen" />
    </svg>
  );
}
