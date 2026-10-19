"use client";

import { FormEvent, useState } from "react";
import type { SignInResult } from "../lib/supabase/auth";

export function AuthPanel({
  email: signedInEmail, onSignIn, onSignOut,
}: {
  email: string | null;
  onSignIn: (email: string) => Promise<SignInResult>;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || sending) return;
    setSending(true);
    const result = await onSignIn(value);
    setSending(false);
    setStatus(result.message);
    if (result.ok) setEmail("");
  };

  if (signedInEmail) {
    return (
      <div className="auth-panel">
        <span className="auth-email" title={signedInEmail}>{signedInEmail}</span>
        <button className="small-button" onClick={onSignOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      {open ? (
        <form className="auth-form" onSubmit={submit}>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setStatus(null); } }}
            placeholder="you@school.edu"
            aria-label="Email for sign-in link"
          />
          <button className="small-button" type="submit" disabled={sending}>{sending ? "Sending" : "Send link"}</button>
          {status && <span className="auth-status">{status}</span>}
        </form>
      ) : (
        <button className="small-button" onClick={() => setOpen(true)} title="Sign in to sync your session across devices">
          Sign in
        </button>
      )}
    </div>
  );
}
