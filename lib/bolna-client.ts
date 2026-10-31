"use client";

import { BolnaWebCall } from "@bolna/web-call";

export type VoiceState = "idle" | "connecting" | "active" | "muted" | "error";

export function createVoiceCall(sessionId: string, context: Record<string, string>, onState: (state: VoiceState, message?: string) => void) {
  const call = new BolnaWebCall({
    getSession: async () => {
      const response = await fetch("/api/bolna-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_data: { scribble_session_id: sessionId, ...context } }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Could not create a voice session. Please try again.");
      }
      return response.json();
    },
  });
  call.on("state-change", (state: string) => {
    onState(state === "active" ? "active" : state === "connecting" || state === "ringing" ? "connecting" : "idle");
  });
  call.on("call-end", () => onState("idle", "Voice session ended. Your worksheet and notes are still here."));
  call.on("error", (error: { message?: string }) => onState("error", error.message ?? "Voice could not start. Type a question instead."));
  return call;
}
