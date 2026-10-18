"use client";

import { BolnaWebCall } from "@bolna/web-call";

export type VoiceState = "idle" | "connecting" | "active" | "muted" | "error";

export function createVoiceCall(sessionId: string, onState: (state: VoiceState, message?: string) => void) {
  const call = new BolnaWebCall({
    sessionUrl: "/api/bolna-session",
    userData: { scribble_session_id: sessionId },
  });
  call.on("state-change", (state: string) => {
    onState(state === "active" ? "active" : state === "connecting" || state === "ringing" ? "connecting" : "idle");
  });
  call.on("call-end", () => onState("idle", "Voice session ended. Your worksheet and notes are still here."));
  call.on("error", (error: { message?: string }) => onState("error", error.message ?? "Voice could not start. Type a question instead."));
  return call;
}
