"use client";

import { getSupabaseClient } from "./client";
import type { SavedState } from "../types";

const TABLE = "sessions";
const BUCKET = "pdfs";

/** Reads the single synced session row for this user, or null if none exists yet or sync isn't configured. */
export async function fetchRemoteSession(userId: string): Promise<SavedState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("data, updated_at").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return { ...(data.data as SavedState), updatedAt: data.updated_at };
}

/** Upserts the full session blob for this user. Safe to call frequently; last write wins. */
export async function pushRemoteSession(userId: string, state: SavedState): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    session_name: state.sessionName ?? null,
    data: state,
    pdf_path: state.pdfPath ?? null,
    updated_at: state.updatedAt ?? new Date().toISOString(),
  });
  return !error;
}

/** Uploads a PDF under this user's private storage folder and returns the object path to store alongside the session. */
export async function uploadPdfToStorage(userId: string, file: File): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (error) return null;
  return path;
}

/** Produces a time-limited URL so a synced PDF can be reopened (including on another device) without making the bucket public. */
export async function getPdfSignedUrl(path: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}
