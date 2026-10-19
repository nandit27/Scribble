"use client";

import { RefObject, useRef } from "react";

const MIN_RATIO = 0.18;
const MAX_RATIO = 0.82;

export function clampRatio(r: number) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));
}

export function SplitDivider({
  containerRef,
  ratio,
  onRatioChange,
  dividerWidth = 8,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  ratio: number;
  onRatioChange: (r: number) => void;
  dividerWidth?: number;
}) {
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onRatioChange(clampRatio(x / (rect.width - dividerWidth)));
  };
  const onPointerUp = () => { dragging.current = false; };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowLeft") { e.preventDefault(); onRatioChange(clampRatio(ratio - step)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); onRatioChange(clampRatio(ratio + step)); }
    else if (e.key === "Home" || e.key === "Enter") { onRatioChange(0.5); }
  };

  return (
    <div
      className="split-divider"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize document and notes panels"
      aria-valuemin={Math.round(MIN_RATIO * 100)}
      aria-valuemax={Math.round(MAX_RATIO * 100)}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      style={{ width: dividerWidth }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onRatioChange(0.5)}
      onKeyDown={onKeyDown}
      title="Drag to resize. Double-click to reset. Arrow keys adjust."
    >
      <span className="split-divider-grip" aria-hidden="true" />
    </div>
  );
}
