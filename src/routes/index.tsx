import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, Sparkles, CircleHelp, Users, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_RULES, initialBoard, movesFrom, apply, hasKing, bestMove, allMoves,
  type Board, type Rules, type Ply, type PieceType,
} from "@/lib/engine";
import { generateVariant } from "@/lib/variant.functions";
import { playSound } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

type Saved = { id: string; title: string; prompt: string; rules: Rules };
import wK from "@/assets/pieces/wK.asset.json";
import wQ from "@/assets/pieces/wQ.asset.json";
import wR from "@/assets/pieces/wR.asset.json";
import wB from "@/assets/pieces/wB.asset.json";
import wN from "@/assets/pieces/wN.asset.json";
import wP from "@/assets/pieces/wP.asset.json";
import bK from "@/assets/pieces/bK.asset.json";
import bQ from "@/assets/pieces/bQ.asset.json";
import bR from "@/assets/pieces/bR.asset.json";
import bB from "@/assets/pieces/bB.asset.json";
import bN from "@/assets/pieces/bN.asset.json";
import bP from "@/assets/pieces/bP.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مُصمم ألعاب الشطرنج المخصصة" },
      { name: "description", content: "اكتب قواعد شطرنج جديدة بالكلام، والذكاء الاصطناعي يحولها للعبة تفاعلية ويلعب ضدك." },
      { property: "og:title", content: "مُصمم ألعاب الشطرنج المخصصة" },
      { property: "og:description", content: "ابتكر نسختك من الشطرنج بوصف نصي والعب ضد محرك يفهم قواعدك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILES = "abcdefgh";
const PIECES = {
  w: { K: wK.url, Q: wQ.url, R: wR.url, B: wB.url, N: wN.url, P: wP.url },
  b: { K: bK.url, Q: bQ.url, R: bR.url, B: bB.url, N: bN.url, P: bP.url },
};
const CLASSIC = "الشطرنج الكلاسيكي";
const EXAMPLES: { title: string; text: string }[] = [
  { title: CLASSIC, text: "الشطرنج الكلاسيكي بقواعده المعروفة" },
  { title: "الحصان القطري", text: "حصان يتحرك كالفيل، وبيدق يمكنه القفز فوق القطع" },
  { title: "الرخ القافز", text: "الرخ يقفز فوق القطع، والملك يتحرك خانتين في أي اتجاه" },
  { title: "الفيل الفارس", text: "الفيل يتحرك أيضاً كالحصان، والوزير لا يتحرك إلا ثلاث خانات" },
  { title: "الملك الجبار", text: "الملك يتحرك مثل الوزير، والوزير يتحرك مثل الملك فقط" },
  { title: "البيادق المحاربة", text: "البيدق يتحرك ويأسر في أي اتجاه خانة واحدة" },
  { title: "الأحصنة الطائرة", text: "الحصان يقفز ثلاث خانات بشكل حرف L كبير (3،1)" },
  { title: "الوزير المحدود", text: "الوزير يتحرك خانتين فقط في أي اتجاه، والرخ يتحرك كالوزير" },
  { title: "الأفيال القافزة", text: "الفيل يقفز فوق القطع قطرياً ويأسر للأمام فقط" },
  { title: "الرخ الملكي", text: "الرخ يتحرك أيضاً خطوة قطرية واحدة مثل الملك" },
  { title: "البيدق الطويل", text: "البيدق يتحرك حتى ثلاث خانات للأمام دائماً ويأسر قطرياً" },
  { title: "الحصان الأمير", text: "الحصان يتحرك كالحصان والملك معاً" },
  { title: "الجمل", text: "الحصان يصبح جملاً يقفز (3،1) والفيل يتحرك كالرخ" },
  { title: "السلاحف", text: "كل القطع تتحرك خانة واحدة فقط في اتجاهاتها" },
  { title: "الأمازون", text: "الوزير يتحرك كالوزير والحصان معاً" },
  { title: "الرخ الأعمى", text: "الرخ لا يأسر إلا قطرياً خانة واحدة، ويتحرك أفقياً وعمودياً بلا أسر" },
  { title: "البيدق الشبح", text: "البيدق يقفز فوق القطع ويأسر للأمام مباشرة" },
  { title: "فوضى الرقعة", text: "كل القطع تقفز فوق القطع، والملك يتحرك كالحصان" },
];
const TIMES = [0, 1, 3, 5, 10, 15, 30];
const INCS = [0, 1, 2, 3, 5, 10];
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function Index() {
  const gen = useServerFn(generateVariant);
  const [prompt, setPrompt] = useState(EXAMPLES[1]!.text);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [last, setLast] = useState<Ply | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [mins, setMins] = useState(10);
  const [inc, setInc] = useState(0);
  const [clock, setClock] = useState({ w: 600000, b: 600000 });
  const [flag, setFlag] = useState<"w" | "b" | null>(null);
  const { user, username, ready } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [mine, setMine] = useState<Saved[]>([]);
  useEffect(() => {
    if (!user) { setMine([]); return; }
    supabase.from("variants").select("id, title, prompt, rules").order("created_at", { ascending: false })
      .then(({ data }) => setMine((data ?? []) as unknown as Saved[]));
  }, [user?.id]);

  const kingWinner = !hasKing(board, "b") ? "w" : !hasKing(board, "w") ? "b" : null;
  const winner = kingWinner ?? (flag ? (flag === "w" ? "b" : "w") : null);
  const targets = useMemo(() => (sel ? movesFrom(board, rules, sel[0], sel[1]) : []), [sel, board, rules]);

  const note = (m: Ply, b: Board) => {
    const piece = b[m.fr]?.[m.fc];
    return `${piece ? rules.pieces[piece.t].name : "قطعة"} ${FILES[m.fc]}${8 - m.fr}→${FILES[m.tc]}${8 - m.tr}`;
  };

  const reset = (r = rules, m = mins) => {
    setRules(r); setBoard(initialBoard()); setSel(null); setTurn("w"); setLast(null); setLog([]);
    setClock({ w: m * 60000, b: m * 60000 }); setFlag(null);
  };

  const doMove = (m: Ply, side: "w" | "b") => {
    const nb = apply(board, m);
    const captured = !!board[m.tr]?.[m.tc];
    const ended = !hasKing(nb, side === "w" ? "b" : "w");
    playSound(ended ? "end" : captured ? "capture" : "move");
    setLog((l) => [note(m, board), ...l]);
    setBoard(nb); setLast(m); setSel(null);
    if (mins > 0) setClock((c) => ({ ...c, [side]: c[side] + inc * 1000 }));
    setTurn(side === "w" ? "b" : "w");
  };

  useEffect(() => {
    if (mins === 0 || winner || log.length === 0) return;
    let prev = Date.now();
    const id = setInterval(() => {
      const now = Date.now(); const dt = now - prev; prev = now;
      setClock((c) => {
        const t = c[turn] - dt;
        if (t <= 0) { setFlag(turn); playSound("end"); return { ...c, [turn]: 0 }; }
        return { ...c, [turn]: t };
      });
    }, 100);
    return () => clearInterval(id);
  }, [turn, winner, mins, log.length]);

  useEffect(() => {
    if (turn !== "b" || winner) return;
    const id = setTimeout(() => {
      const m = bestMove(board, rules, 3);
      if (!m) { setTurn("w"); return; }
      doMove(m, "b");
    }, 350);
    return () => clearTimeout(id);
  }, [turn, board, rules, winner]);

  const click = (r: number, c: number) => {
    if (turn !== "w" || winner) return;
    const t = targets.find((m) => m.tr === r && m.tc === c);
    if (t) { doMove(t, "w"); return; }
    setSel(board[r]![c]?.c === "w" ? [r, c] : null);
  };

  const pickExample = (i: number) => {
    const ex = EXAMPLES[i]!;
    setPrompt(ex.text);
    if (ex.title === CLASSIC) reset(DEFAULT_RULES);
  };

  const create = async () => {
    if (prompt === EXAMPLES[0]!.text) { reset(DEFAULT_RULES); return; }
    setLoading(true); setErr("");
    try {
      const res = await gen({ data: { prompt } });
      if (res.error || !res.rules) setErr(res.error ?? "خطأ غير معروف");
      else {
        reset(res.rules);
        if (user) {
          const { data } = await supabase.from("variants").insert({ title: res.rules.name, prompt, rules: res.rules as never }).select("id, title, prompt, rules").single();
          if (data) setMine((m) => [data as unknown as Saved, ...m]);
        }
      }
    } catch { setErr("تعذّر الاتصال. حاول مجدداً."); }
    setLoading(false);
  };

  const invite = async () => {
    if (!user) { setShowAuth(true); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setInviting(true); setErr("");
    const { data, error } = await supabase.from("games").insert({
      host_name: username, rules: rules as never, board: initialBoard() as never,
      minutes: mins, inc, clock_w: mins * 60000, clock_b: mins * 60000,
    }).select("id").single();
    setInviting(false);
    if (error || !data) { setErr("تعذّر إنشاء الدعوة"); return; }
    navigate({ to: "/play/$id", params: { id: data.id } });
  };

  const Clock = ({ side }: { side: "w" | "b" }) => mins === 0 ? null : (
    <span dir="ltr" className={`rounded-md px-2.5 py-1 font-display text-lg font-semibold tabular-nums ${turn === side && !winner ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} ${clock[side] < 20000 ? "animate-pulse" : ""}`}>{fmt(clock[side])}</span>
  );

  const noMoves = !winner && turn === "w" && allMoves(board, rules, "w").length === 0;

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1320px] px-4 pb-12 pt-5 sm:px-7 lg:px-10">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-primary"><img src={bN.url} alt="" className="size-10" /></span>
            <div>
              <p className="text-[11px] font-bold text-primary">مختبر القواعد</p>
              <h1 className="font-display text-xl font-semibold sm:text-2xl">مُصمم الشطرنج</h1>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-2 text-sm"><span className="font-semibold">{username}</span><Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5 text-muted-foreground"><LogOut aria-hidden="true" /> خروج</Button></div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAuth((s) => !s)} className="gap-1.5 bg-card"><LogIn aria-hidden="true" /> تسجيل الدخول</Button>
          )}
          {showAuth && !user && <div className="w-full sm:mr-auto sm:w-80"><AuthForm onDone={() => setShowAuth(false)} /></div>}
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.36fr)_minmax(340px,0.9fr)] xl:gap-12">
          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">الرقعة / {rules.name}</p>
                <h2 className="font-display text-xl font-semibold sm:text-2xl">العب ضد المحرك</h2>
              </div>
              <Button onClick={() => reset()} variant="outline" size="sm" className="shrink-0 gap-2 bg-card" title="لعبة جديدة"><RotateCcw aria-hidden="true" /> لعبة جديدة</Button>
            </div>
            <div className="mx-auto w-full max-w-[650px]">
              <div className="mb-2 flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2.5"><img src={bN.url} alt="" className="size-8" /><span className="text-sm font-semibold">المنافس الذكي</span></div>
                <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">القطع الداكنة</span><Clock side="b" /></div>
              </div>
              <div dir="ltr" className="board" role="grid" aria-label="رقعة الشطرنج">
              {board.map((row, r) => row.map((p, c) => {
                const dark = (r + c) % 2 === 1;
                const isT = targets.some((m) => m.tr === r && m.tc === c);
                const isSel = sel && sel[0] === r && sel[1] === c;
                const isLast = last && ((last.fr === r && last.fc === c) || (last.tr === r && last.tc === c));
                return (
                  <Button
                    key={`${r}${c}`}
                    onClick={() => click(r, c)}
                    variant="ghost"
                    size="icon"
                    aria-label={`${FILES[c]}${8-r}${p ? ` ${rules.pieces[p.t].name} ${p.c === "w" ? "أبيض" : "داكن"}` : " فارغة"}`}
                    className={`sq !size-full !rounded-none ${dark ? "sq-dark" : "sq-light"} ${isSel ? "sq-sel" : ""} ${isLast ? "sq-last" : ""}`}
                  >
                    {p && <img className="piece-image" src={PIECES[p.c][p.t]} alt="" draggable={false} />}
                    {isT && <span className={p ? "ring-capture" : "dot"} />}
                  </Button>
                );
              }))}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2.5"><img src={wN.url} alt="" className="size-8" /><span className="text-sm font-semibold">أنت <span className="font-normal text-muted-foreground">· الأبيض</span></span></div>
                <div className="flex items-center gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-primary"><span className="size-2 rounded-full bg-primary" />{winner ? (winner === "w" ? (flag ? "انتصرت بالوقت!" : "انتصرت!") : (flag ? "انتهى وقتك" : "انتهت اللعبة")) : noMoves ? "لا توجد حركات" : turn === "w" ? "دورك الآن" : "المحرك يفكر…"}</span><Clock side="w" /></div>
              </div>
              {log.length > 0 && <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground"><span className="mb-1 block font-semibold text-foreground">آخر الحركات</span><div className="max-h-20 overflow-auto" dir="ltr">{log.slice(0, 12).join("  ·  ")}</div></div>}
            </div>
          </section>

          <aside className="min-w-0 space-y-7 lg:pt-10">
            <section>
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"><Sparkles className="size-5" aria-hidden="true" /></span>
                <div><h2 className="font-display text-xl font-semibold">ابتكر نسختك</h2><p className="mt-0.5 text-sm text-muted-foreground">صِف حركة القطع بكلماتك، وابدأ اللعب.</p></div>
              </div>
              <label htmlFor="rule-prompt" className="mb-2 block text-sm font-semibold">قواعد اللعبة</label>
              <textarea id="rule-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full resize-none rounded-md border border-input bg-card p-3.5 text-sm leading-7 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <label htmlFor="examples" className="mb-1.5 mt-3 block text-sm font-semibold">قائمة الأمثلة ({EXAMPLES.length + mine.length})</label>
              <select id="examples" defaultValue="" onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("s:")) { const s = mine.find((m) => m.id === v.slice(2)); if (s) { setPrompt(s.prompt); reset(s.rules); } }
                else if (v !== "") pickExample(Number(v));
              }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary">
                <option value="" disabled>اختر مثالاً…</option>
                {mine.length > 0 && <optgroup label="أمثلتي (خاصة بك)">{mine.map((m) => <option key={m.id} value={`s:${m.id}`}>★ {m.title}</option>)}</optgroup>}
                <optgroup label="أمثلة جاهزة">{EXAMPLES.map((e, i) => <option key={e.title} value={i}>{i + 1}. {e.title}</option>)}</optgroup>
              </select>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="tc-min" className="mb-1.5 block text-sm font-semibold">المؤقت</label>
                  <select id="tc-min" value={mins} onChange={(e) => { const m = Number(e.target.value); setMins(m); reset(rules, m); }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary">
                    {TIMES.map((t) => <option key={t} value={t}>{t === 0 ? "بدون مؤقت" : `${t} دقيقة`}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="tc-inc" className="mb-1.5 block text-sm font-semibold">زيادة لكل حركة</label>
                  <select id="tc-inc" value={inc} disabled={mins === 0} onChange={(e) => setInc(Number(e.target.value))} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary disabled:opacity-50">
                    {INCS.map((t) => <option key={t} value={t}>{t} ثانية</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={create} disabled={loading || prompt.trim().length < 3} className="mt-4 h-11 w-full text-sm font-bold">{loading ? "جارٍ صياغة القواعد…" : <><Sparkles aria-hidden="true" /> ابتكر اللعبة</>}</Button>
              {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
              <Button onClick={invite} disabled={inviting} variant="outline" className="mt-2 h-11 w-full gap-2 bg-card text-sm font-bold"><Users aria-hidden="true" /> {inviting ? "جارٍ تجهيز الدعوة…" : "العب مع صديق أونلاين"}</Button>
              {!user && ready && <p className="mt-2 text-xs text-muted-foreground">سجّل الدخول لحفظ أمثلتك ودعوة أصدقائك.</p>}
            </section>

            <section className="border-t border-border/60 pt-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div><p className="mb-1 text-xs font-semibold text-primary">النسخة الحالية</p><h2 className="font-display text-xl font-semibold">{rules.name}</h2></div>
                <CircleHelp className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{rules.description}</p>
              <ul className="mt-4 divide-y divide-border/60 border-y border-border/60">
                {(Object.keys(rules.pieces) as PieceType[]).map((k) => (
                  <li key={k} className="flex items-start gap-3 py-2.5">
                    <img src={PIECES.w[k]} alt="" className="size-9 shrink-0 rounded-sm bg-secondary/50 p-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-sm"><strong className="font-semibold">{rules.pieces[k].name}</strong><span className="text-xs text-muted-foreground">{k === "K" ? "∞" : rules.pieces[k].value}</span></div>
                      <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">{describe(rules.pieces[k].moves)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" onClick={() => reset(DEFAULT_RULES)} className="mt-3 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"><RotateCcw aria-hidden="true" /> العودة للقواعد الكلاسيكية</Button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function describe(moves: Rules["pieces"]["K"]["moves"]) {
  return moves.map((m) => {
    const dirs = m.vectors.map(([x, y]) => `${Math.abs(x)},${Math.abs(y)}`);
    const unique = [...new Set(dirs)];
    const diagonal = unique.length === 1 && unique[0] === "1,1";
    const straight = unique.every((v) => v === "1,0" || v === "0,1");
    const queen = unique.includes("1,1") && unique.includes("1,0") && unique.includes("0,1") && unique.length === 3;
    const knight = unique.every((v) => v === "1,2" || v === "2,1");
    const forward = unique.length === 1 && unique[0] === "0,1";
    const parts = [queen ? "في جميع الاتجاهات" : diagonal ? "قطرياً" : straight ? (forward ? "للأمام" : "أفقياً وعمودياً") : knight ? "على شكل حرف L" : `باتجاهات ${m.vectors.map(([x, y]) => `(${x}،${y})`).join(" ")}`];
    if (m.kind === "slide" && m.maxRange) parts.push(`حتى ${m.maxRange} خانات`);
    else if (m.kind === "leap" && !knight) parts.push("خانة واحدة");
    if (m.mode === "move") parts.push("بلا أسر");
    if (m.mode === "capture") parts.push("للأسر فقط");
    if (m.jump) parts.push("يتخطى القطع");
    if (m.firstMoveOnly) parts.push("أول حركة");
    return parts.join(" ");
  }).join(" | ");
}
