import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const normName = (n: string) => n.trim().toLowerCase();
export const nameToEmail = (n: string) =>
  `${Array.from(new TextEncoder().encode(normName(n))).map((b) => b.toString(16).padStart(2, "0")).join("")}@players.chess.app`;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); setReady(true); });
    supabase.auth.getUser().then(({ data: d }) => { setUser(d.user ?? null); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const username = (user?.user_metadata?.["username"] as string | undefined) ?? "";
  return { user, username, ready };
}

/** Resolves to null on success, or an error code (see `authErr` in i18n). */
export async function signInOrUp(mode: "in" | "up", name: string, password: string): Promise<string | null> {
  const n = name.trim();
  if (n.length < 2 || n.length > 24) return "nameLength";
  if (password.length < 6) return "pwLength";
  const email = nameToEmail(n);
  if (mode === "up") {
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", n).maybeSingle();
    if (taken) return "nameTaken";
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username: n } } });
    if (error) return error.message.includes("registered") ? "nameTaken" : error.message.includes("weak") || error.message.includes("pwned") ? "weakPw" : "signUpFailed";
    return null;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? "badCredentials" : null;
}
