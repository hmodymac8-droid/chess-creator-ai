import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, Sparkles, ArrowLeft, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_RULES, GLYPH, initialBoard, movesFrom, apply, hasKing, bestMove, allMoves,
  type Board, type Rules, type Ply, type PieceType,
} from "@/lib/engine";
import { generateVariant } from "@/lib/variant.functions";
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

const EXAMPLES = [
  "حصان يتحرك كالفيل، وبيدق يمكنه القفز فوق القطع",
  "الرخ يقفز فوق القطع، والملك يتحرك خانتين في أي اتجاه",
  "الفيل يتحرك أيضاً كالحصان، والوزير لا يتحرك إلا ثلاث خانات",
];
const FILES = "abcdefgh";
const PIECES = {
  w: { K: wK.url, Q: wQ.url, R: wR.url, B: wB.url, N: wN.url, P: wP.url },
  b: { K: bK.url, Q: bQ.url, R: bR.url, B: bB.url, N: bN.url, P: bP.url },
};

function Index() {
  const gen = useServerFn(generateVariant);
  const [prompt, setPrompt] = useState(EXAMPLES[0]!);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [last, setLast] = useState<Ply | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const winner = !hasKing(board, "b") ? "w" : !hasKing(board, "w") ? "b" : null;
  const targets = useMemo(() => (sel ? movesFrom(board, rules, sel[0], sel[1]) : []), [sel, board, rules]);

  const note = (m: Ply, b: Board) => `${GLYPH[b[m.fr]![m.fc]!.t]} ${FILES[m.fc]}${8 - m.fr}→${FILES[m.tc]}${8 - m.tr}`;

  const reset = (r = rules) => {
    setRules(r); setBoard(initialBoard()); setSel(null); setTurn("w"); setLast(null); setLog([]);
  };

  useEffect(() => {
    if (turn !== "b" || winner) return;
    const id = setTimeout(() => {
      const m = bestMove(board, rules, 3);
      if (!m) { setTurn("w"); return; }
      setLog((l) => [note(m, board), ...l]);
      setBoard(apply(board, m)); setLast(m); setTurn("w");
    }, 350);
    return () => clearTimeout(id);
  }, [turn, board, rules, winner]);

  const click = (r: number, c: number) => {
    if (turn !== "w" || winner) return;
    const t = targets.find((m) => m.tr === r && m.tc === c);
    if (t) {
      setLog((l) => [note(t, board), ...l]);
      setBoard(apply(board, t)); setLast(t); setSel(null); setTurn("b");
      return;
    }
    setSel(board[r]![c]?.c === "w" ? [r, c] : null);
  };

  const create = async () => {
    setLoading(true); setErr("");
    try {
      const res = await gen({ data: { prompt } });
      if (res.error || !res.rules) setErr(res.error ?? "خطأ غير معروف");
      else reset(res.rules);
    } catch { setErr("تعذّر الاتصال. حاول مجدداً."); }
    setLoading(false);
  };

  const noMoves = !winner && turn === "w" && allMoves(board, rules, "w").length === 0;

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1320px] px-4 pb-12 pt-5 sm:px-7 lg:px-10">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-primary text-2xl font-bold text-primary-foreground">♞</span>
            <div>
              <p className="text-[11px] font-bold text-primary">مختبر القواعد</p>
              <h1 className="font-display text-xl font-semibold sm:text-2xl">مُصمم الشطرنج</h1>
            </div>
          </div>
          <span className="text-xs text-muted-foreground sm:text-sm">قواعدك. رقعتك. لعبتك.</span>
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
                <span className="text-xs text-muted-foreground">القطع الداكنة</span>
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
                <span className="flex items-center gap-2 text-xs font-semibold text-primary"><span className="size-2 rounded-full bg-primary" />{winner ? (winner === "w" ? "انتصرت!" : "انتهت اللعبة") : noMoves ? "لا توجد حركات" : turn === "w" ? "دورك الآن" : "المحرك يفكر…"}</span>
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
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((e, i) => <Button key={e} variant="outline" size="sm" onClick={() => setPrompt(e)} className="h-auto max-w-full whitespace-normal border-border/70 bg-card px-2.5 py-1.5 text-right text-xs leading-5 text-muted-foreground hover:text-foreground">مثال {i + 1} <ArrowLeft className="size-3" aria-hidden="true" /></Button>)}
              </div>
              <Button onClick={create} disabled={loading || prompt.trim().length < 3} className="mt-4 h-11 w-full text-sm font-bold">{loading ? "جارٍ صياغة القواعد…" : <><Sparkles aria-hidden="true" /> ابتكر اللعبة</>}</Button>
              {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
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
    const parts = [m.kind === "slide" ? (m.maxRange ? `انزلاق حتى ${m.maxRange}` : "انزلاق") : "قفزة"];
    parts.push(m.vectors.map((v) => `(${v[0]},${v[1]})`).join(" "));
    if (m.mode === "move") parts.push("بلا أسر");
    if (m.mode === "capture") parts.push("للأسر فقط");
    if (m.jump) parts.push("يتخطى القطع");
    if (m.firstMoveOnly) parts.push("أول حركة");
    return parts.join(" ");
  }).join(" | ");
}
