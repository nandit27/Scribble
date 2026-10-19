"use client";

import { KeyboardEvent } from "react";
import { TutorControls } from "./tutor-controls";
import { AuthPanel } from "./auth-panel";
import type { SignInResult } from "../lib/supabase/auth";
import type { VoiceState } from "../lib/bolna-client";
import type { View } from "../lib/types";

type TutorProps = Parameters<typeof TutorControls>[0];
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export function AppHeader({
  sessionName, editingName, nameDraft, onStartEdit, onDraftChange, onCommitName, onCancelEdit,
  voice, view, onGoHome, pdfContextLabel, notesContextLabel, tutorProps,
  authEmail, onSignIn, onSignOut, syncStatus,
}: {
  sessionName: string;
  editingName: boolean;
  nameDraft: string;
  onStartEdit: () => void;
  onDraftChange: (v: string) => void;
  onCommitName: () => void;
  onCancelEdit: () => void;
  voice: VoiceState;
  view: View;
  onGoHome: () => void;
  pdfContextLabel: string;
  notesContextLabel: string;
  tutorProps: TutorProps;
  authEmail: string | null;
  onSignIn: (email: string) => Promise<SignInResult>;
  onSignOut: () => void;
  syncStatus: SyncStatus;
}) {
  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onCommitName();
    if (e.key === "Escape") onCancelEdit();
  };

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={onGoHome} aria-label="Scribble home">
          <img className="brand-logo" src="/logo.png" alt="" />
          <span>Scribble</span>
        </button>
        <div className="session-meta">
          {editingName ? (
            <input
              className="session-name-input"
              value={nameDraft}
              autoFocus
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={onCommitName}
              onKeyDown={onNameKeyDown}
              aria-label="Session name"
            />
          ) : (
            <button className="session-name" onClick={onStartEdit} title="Rename this session">{sessionName}</button>
          )}
          <span
            className="save-state"
            title={authEmail ? "Saved locally, and synced to your account so you can reopen this session on another device." : "Your strokes, notes, and tutor turns are stored only in this browser. Sign in to sync them to an account."}
          >
            <i className={authEmail ? syncStatus : undefined} />
            {authEmail ? (syncStatus === "syncing" ? "Syncing" : syncStatus === "error" ? "Sync error" : "Saved · synced") : "Saved locally"}
          </span>
        </div>
        <div className="top-actions">
          <AuthPanel email={authEmail} onSignIn={onSignIn} onSignOut={onSignOut} />
          <span className={`voice-pill ${voice}`} title="Start a voice conversation with the tutor using your microphone.">
            <i />
            {voice === "active" ? "Listening" : voice === "connecting" ? "Connecting" : voice === "muted" ? "Muted" : voice === "error" ? "Voice unavailable" : "Voice ready"}
          </span>
        </div>
      </header>
      {view === "split" && (
        <div className="session-bar">
          <div className="session-context">
            <span>{pdfContextLabel}</span>
            <span>{notesContextLabel}</span>
          </div>
          <TutorControls {...tutorProps} />
        </div>
      )}
    </>
  );
}
