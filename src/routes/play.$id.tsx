import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { apply, lost, movesFrom, type Board, type Ply, type Rules } from "@/lib/engine";
import { PIECE_IMG } from "@/lib/pieces";
import { playSound } from "@/lib/sounds";
import { pieceName, useI18n, variantDesc, variantName } from "@/lib/i18n";
import { AboutDialog, LanguageToggle } from "@/components/AppHeaderActions";

export const Route = createFileRoute("/play/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Online match — Chess Variant Designer" },
      { name: "description", content: "Play a custom chess variant live against your friend." },
      { property: "og:title", content: "Online challenge — Chess Variant Designer" },
      { property: "og:description", content: "Your friend is inviting you to a chess match with brand-new rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Play,
});

type Game = {
  id: string; host_id: string; guest_id: string | null; host_name: string; guest_name: string | null;
  rules: Rules; board: Board; turn: "w" | "b"; last: Ply | null; minutes: number; inc: number;
  clock_w: number; clock_b: number; moved_at: string | null; status: string; winner: string | null;
};
const FILES = "abcdefgh";
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function Play() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [g, setG] = useState<Game | null>(null);
  const [missing, setMissing] = useState(false);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: first } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
      if (first && !first.guest_id && first.host_id !== user.id) await supabase.rpc("join_game", { _id: id });
      const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (!data) setMissing(true); else setG(data as unknown as Game);
    })();
    const ch = supabase.channel(`game-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, (p) => {
        setG((old) => {
          const n = p.new as unknown as Game;
          if (old && n.last && JSON.stringify(old.last) !== JSON.stringify(n.last)) {
            const cap = !!old.board[n.last.tr]?.[n.last.tc];
            playSound(n.status === "finished" ? "end" : cap ? "capture" : "move");
          }
          return n;
        });
      }).subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [id, user?.id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);

  const me: "w" | "b" | null = !g || !user ? null : g.host_id === user.id ? "w" : g.guest_id === user.id ? "b" : null;
  const live = (side: "w" | "b") => {
    if (!g) return 0;
    const base = side === "w" ? g.clock_w : g.clock_b;
    if (g.status !== "playing" || g.turn !== side || !g.moved_at) return base;
    return base - (now - new Date(g.moved_at).getTime());
  };

  // Flag fall: whoever notices first records it.
  useEffect(() => {
    if (!g || g.status !== "playing" || g.minutes === 0 || !g.moved_at || !me) return;
    if (live(g.turn) <= 0) {
      supabase.from("games").update({ status: "finished", winner: g.turn === "w" ? "b" : "w", ...(g.turn === "w" ? { clock_w: 0 } : { clock_b: 0 }) }).eq("id", g.id).eq("status", "playing").then();
    }
  }, [now]);

  const targets = useMemo(() => (g && sel ? movesFrom(g.board, g.rules, sel[0], sel[1]) : []), [g, sel]);

  if (!ready) return null;
  if (!user) return (
    <Shell><div className="mx-auto max-w-sm"><h1 className="mb-2 font-display text-2xl font-semibold">{t.online.invited}</h1><p className="mb-5 text-sm text-muted-foreground">{t.online.signInToJoin}</p><AuthForm /></div></Shell>
  );
  if (missing) return <Shell><p className="text-center">{t.online.notFound}</p></Shell>;
  if (!g) return <Shell><p className="text-center text-muted-foreground">{t.online.loading}</p></Shell>;
  if (!me) return <Shell><p className="text-center">{t.online.others}</p></Shell>;

  const click = async (r: number, c: number) => {
    if (g.status !== "playing" || g.turn !== me) return;
    const t = targets.find((m) => m.tr === r && m.tc === c);
    if (t) {
      const nb = apply(g.board, t, g.rules);
      const cap = !!g.board[t.tr]?.[t.tc];
      const other = me === "w" ? "b" : "w";
      const won = lost(nb, g.rules, other);
      playSound(won ? "end" : cap ? "capture" : "move");
      const left = live(me) + g.inc * 1000;
      const patch = {
        board: nb as never, last: t as never, turn: other, moved_at: new Date().toISOString(),
        ...(g.moved_at && g.minutes > 0 ? { [me === "w" ? "clock_w" : "clock_b"]: Math.round(left) } : {}),
        ...(won ? { status: "finished", winner: me } : {}),
      };
      setG({ ...g, ...(patch as Partial<Game>) });
      setSel(null);
      await supabase.from("games").update(patch).eq("id", g.id);
      return;
    }
    setSel(g.board[r]![c]?.c === me ? [r, c] : null);
  };

  const rows = me === "b" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const opp = me === "w" ? "b" : "w";
  const name = (s: "w" | "b") => (s === "w" ? g.host_name : g.guest_name ?? t.online.waitingName);
  const link = typeof window !== "undefined" ? window.location.href : "";
  const status = g.status === "waiting" ? t.online.waitingJoin : g.status === "finished" ? (g.winner === me ? t.online.youWon : t.online.youLost) : g.turn === me ? t.yourTurn : t.online.friendTurn;

  const Bar = ({ side }: { side: "w" | "b" }) => (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2.5">
      <div className="flex items-center gap-2.5"><img src={PIECE_IMG[side].N} alt="" className="size-8" /><span className="text-sm font-semibold">{name(side)}{side === me && <span className="font-normal text-muted-foreground"> · {t.you}</span>}</span></div>
      {g.minutes > 0 && <span dir="ltr" className={`rounded-md px-2.5 py-1 font-display text-lg font-semibold tabular-nums ${g.status === "playing" && g.turn === side ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{fmt(live(side))}</span>}
    </div>
  );

  return (
    <Shell>
      <div className="mx-auto grid max-w-[1100px] items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="mx-auto w-full max-w-[620px] space-y-2">
          <Bar side={opp} />
          <div dir="ltr" className="board" role="grid" aria-label={t.boardLabel}>
            {rows.map((r) => rows.map((c) => {
              const p = g.board[r]![c];
              const dark = (r + c) % 2 === 1;
              const isT = targets.some((m) => m.tr === r && m.tc === c);
              const isSel = sel && sel[0] === r && sel[1] === c;
              const isLast = g.last && ((g.last.fr === r && g.last.fc === c) || (g.last.tr === r && g.last.tc === c));
              return (
                <Button key={`${r}${c}`} onClick={() => click(r, c)} variant="ghost" size="icon"
                  aria-label={`${FILES[c]}${8 - r}${p ? ` ${pieceName(g.rules, p.t, t)}` : ""}`}
                  className={`sq !size-full !rounded-none ${dark ? "sq-dark" : "sq-light"} ${isSel ? "sq-sel" : ""} ${isLast ? "sq-last" : ""}`}>
                  {p && <img className="piece-image" src={PIECE_IMG[p.c][p.t]} alt="" draggable={false} />}
                  {isT && <span className={p ? "ring-capture" : "dot"} />}
                </Button>
              );
            }))}
          </div>
          <Bar side={me} />
        </div>
        <aside className="space-y-5">
          <div><p className="mb-1 text-xs font-semibold text-primary">{t.online.match}</p><h1 className="font-display text-2xl font-semibold">{variantName(g.rules, t)}</h1><p className="mt-1 text-sm text-muted-foreground">{variantDesc(g.rules, t)}</p></div>
          <p className="rounded-md bg-primary/15 px-3 py-2 text-sm font-semibold text-primary">{status}</p>
          {g.status === "waiting" && me === "w" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t.online.sendLink}</p>
              <div dir="ltr" className="break-all rounded-md border border-border/60 bg-card p-2.5 text-xs text-muted-foreground">{link}</div>
              <Button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }} className="w-full gap-2"><Copy aria-hidden="true" /> {copied ? t.online.copied : t.online.copyLink}</Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{g.minutes > 0 ? t.online.timerInfo(g.minutes, g.inc) : t.noTimer} · {t.online.whiteStarts}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> {t.online.back}</Link>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { dir } = useI18n();
  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto -mt-4 mb-4 flex max-w-[1100px] justify-end gap-1"><LanguageToggle /><AboutDialog /></div>
      {children}
    </main>
  );
}
