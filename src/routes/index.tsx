import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DEFAULT_RULES, GLYPH, initialBoard, movesFrom, apply, hasKing, bestMove, allMoves,
  type Board, type Rules, type Ply, type PieceType,
} from "@/lib/engine";
import { generateVariant } from "@/lib/variant.functions";

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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 text-center">
          <p className="text-sm tracking-widest text-primary">مختبر القواعد</p>
          <h1 className="font-display text-4xl md:text-5xl">مُصمم ألعاب الشطرنج المخصصة</h1>
          <p className="mt-2 text-muted-foreground">صِف قواعدك بالكلام، وسيبني الذكاء الاصطناعي اللعبة ويلعب ضدك.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <section className="order-2 space-y-5 lg:order-1">
            <div className="panel">
              <label className="mb-2 block font-display text-lg">اكتب قواعدك</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background/60 p-3 outline-none focus:border-primary"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => setPrompt(e)} className="chip">{e}</button>
                ))}
              </div>
              <button onClick={create} disabled={loading || prompt.trim().length < 3} className="btn-brass mt-4 w-full">
                {loading ? "جارٍ صياغة القواعد…" : "ابتكر اللعبة"}
              </button>
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            </div>

            <div className="panel">
              <h2 className="font-display text-2xl text-primary">{rules.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{rules.description}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {(Object.keys(rules.pieces) as PieceType[]).map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="text-2xl leading-none text-primary">{GLYPH[k]}</span>
                    <span>
                      <b>{rules.pieces[k].name}</b>{" "}
                      <span className="text-muted-foreground">(قيمة {k === "K" ? "∞" : rules.pieces[k].value})</span>
                      <span className="block text-xs text-muted-foreground">{describe(rules.pieces[k].moves)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button onClick={() => reset(DEFAULT_RULES)} className="chip mt-4">العودة للقواعد الكلاسيكية</button>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg">
                {winner ? (winner === "w" ? "انتصرت! أسقطت الملك 👑" : "المحرك أسقط ملكك")
                  : noMoves ? "لا توجد حركات متاحة"
                  : turn === "w" ? "دورك (الأبيض)" : "المحرك يفكر…"}
              </span>
              <button onClick={() => reset()} className="chip">لعبة جديدة</button>
            </div>
            <div dir="ltr" className="board">
              {board.map((row, r) => row.map((p, c) => {
                const dark = (r + c) % 2 === 1;
                const isT = targets.some((m) => m.tr === r && m.tc === c);
                const isSel = sel && sel[0] === r && sel[1] === c;
                const isLast = last && ((last.fr === r && last.fc === c) || (last.tr === r && last.tc === c));
                return (
                  <button
                    key={`${r}${c}`}
                    onClick={() => click(r, c)}
                    className={`sq ${dark ? "sq-dark" : "sq-light"} ${isSel ? "sq-sel" : ""} ${isLast ? "sq-last" : ""}`}
                  >
                    {p && <span className={p.c === "w" ? "pc-w" : "pc-b"}>{GLYPH[p.t]}</span>}
                    {isT && <span className={p ? "ring-capture" : "dot"} />}
                  </button>
                );
              }))}
            </div>
            <div className="mt-3 max-h-24 overflow-auto text-xs text-muted-foreground" dir="ltr">
              {log.slice(0, 12).join("  ·  ")}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function describe(moves: Rules["pieces"]!["K"]["moves"]) {
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
