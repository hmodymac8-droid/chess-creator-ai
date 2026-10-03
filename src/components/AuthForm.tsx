import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInOrUp } from "@/lib/auth";

export function AuthForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await signInOrUp(mode, name, pw);
    setBusy(false);
    if (r) setErr(r); else onDone?.();
  };
  const input = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary";
  return (
    <form onSubmit={submit} className="space-y-3" dir="rtl">
      <div className="flex gap-1 rounded-md bg-secondary p-1 text-sm">
        {(["in", "up"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded px-3 py-1.5 font-semibold ${mode === m ? "bg-card text-foreground" : "text-muted-foreground"}`}>{m === "in" ? "تسجيل الدخول" : "حساب جديد"}</button>
        ))}
      </div>
      <div><label htmlFor="au-name" className="mb-1 block text-sm font-semibold">الاسم</label><input id="au-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" className={input} /></div>
      <div><label htmlFor="au-pw" className="mb-1 block text-sm font-semibold">كلمة المرور</label><input id="au-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} className={input} /></div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="h-10 w-full font-bold">{busy ? "لحظة…" : mode === "in" ? "دخول" : "إنشاء الحساب"}</Button>
    </form>
  );
}
