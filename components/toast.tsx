"use client";

import { useEffect, useRef, useState } from "react";

export type ToastState = { id: string; message: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | null>(null);

  const show = (message: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ id: `${Date.now()}`, message });
    timer.current = window.setTimeout(() => setToast(null), 5000);
  };

  const dismiss = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast(null);
  };

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <p>{toast.message}</p>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss message">×</button>
    </div>
  );
}
