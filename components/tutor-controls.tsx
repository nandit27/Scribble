"use client";

import { FormEvent } from "react";
import type { VoiceState } from "../lib/bolna-client";

export function TutorControls({
  askOpen, onOpenAsk, onCloseAsk, question, onQuestionChange, onAsk, busy,
  current, onDismissCurrent, live, voiceState, onStartVoice, onEndVoice, onToggleMute,
}: {
  askOpen: boolean;
  onOpenAsk: () => void;
  onCloseAsk: () => void;
  question: string;
  onQuestionChange: (v: string) => void;
  onAsk: (e: FormEvent) => void;
  busy: boolean;
  current: { question: string; mode: string } | null;
  onDismissCurrent: () => void;
  live: boolean;
  voiceState: VoiceState;
  onStartVoice: () => void;
  onEndVoice: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="tutor-controls">
      {live ? (
        <>
          <button className="tutor-status live" onClick={onEndVoice} aria-label="End voice conversation">
            {voiceState === "connecting" ? "Connecting" : voiceState === "muted" ? "Muted" : "Listening"}
          </button>
          <button className="tutor-mini" onClick={onToggleMute} disabled={voiceState === "connecting"}>
            {voiceState === "muted" ? "Unmute" : "Mute"}
          </button>
        </>
      ) : (
        <button className="tutor-status" onClick={onOpenAsk} title="Ask about your document or notes">
          Ask tutor <kbd>/</kbd>
        </button>
      )}
      {askOpen ? (
        <form className="tutor-ask" onSubmit={onAsk}>
          <input
            autoFocus
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onCloseAsk(); }}
            onBlur={() => { if (!question.trim()) onCloseAsk(); }}
            placeholder="Explain, hint, check, or plot"
            aria-label="Ask Scribble"
          />
        </form>
      ) : current ? (
        <div className="tutor-now">
          <span className="mode-chip">{busy ? "Thinking" : current.mode}</span>
          <p>{current.question}</p>
          <button className="tutor-mini" onClick={onDismissCurrent} aria-label="Dismiss last question">×</button>
        </div>
      ) : !live ? (
        <button className="tutor-mini tutor-listen" onClick={onStartVoice} title="Start a voice conversation">
          Listen
        </button>
      ) : null}
    </div>
  );
}
