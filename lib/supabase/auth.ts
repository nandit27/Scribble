"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./client";

export type SignInResult = { ok: boolean; message: string };

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setInitializing(false); return; }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setInitializing(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string): Promise<SignInResult> => {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, message: "Accounts aren't configured on this deployment yet." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Check ${email} for a sign-in link.` };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return { user, initializing, isConfigured: isSupabaseConfigured, signInWithEmail, signOut };
}
