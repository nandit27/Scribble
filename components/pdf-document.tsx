"use client";

import { useEffect, useRef, useState } from "react";

type TextItem = { str: string };

/** A small PDF.js surface that keeps the document's selectable text in the app. */
export function PdfDocument({ url, page, zoom, onPageCount, onPageText, onSelection }: {
  url: string;
  page: number;
  zoom: number;
  onPageCount: (count: number) => void;
  onPageText: (text: string) => void;
  onSelection: (text: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => void } | undefined;
    const render = async () => {
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ url });
        loadingTask = task;
        const document = await task.promise;
        if (cancelled) return;
        onPageCount(document.numPages);
        const safePage = Math.min(Math.max(1, page), document.numPages);
        const pdfPage = await document.getPage(safePage);
        const scale = zoom / 100;
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        const textLayer = textRef.current;
        if (!canvas || !textLayer || cancelled) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        await pdfPage.render({ canvas, viewport }).promise;
        const content = await pdfPage.getTextContent();
        if (cancelled) return;
        const text = content.items.map((item) => ("str" in item ? (item as TextItem).str : "")).join(" ").replace(/\s+/g, " ").trim();
        onPageText(text);
        textLayer.textContent = text;
      } catch {
        if (!cancelled) setError("This PDF could not be read in Scribble. Try another PDF.");
      }
    };
    void render();
    return () => { cancelled = true; loadingTask?.destroy(); };
  }, [url, page, zoom, onPageCount, onPageText]);

  const captureSelection = () => {
    const selected = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (selected) onSelection(selected);
  };

  if (error) return <div className="pdf-error" role="alert">{error}</div>;
  return <div className="pdf-document" onMouseUp={captureSelection} onKeyUp={captureSelection}>
    <canvas ref={canvasRef} />
    <div ref={textRef} className="pdf-text-layer" aria-label="Selectable PDF text" />
  </div>;
}
