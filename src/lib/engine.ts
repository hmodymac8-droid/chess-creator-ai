export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Color = "w" | "b";
export type Move = {
  kind: "leap" | "slide";
  vectors: [number, number][]; // [dx, dy], dy positive = forward for the owner
  mode?: "both" | "move" | "capture" | undefined;
  jump?: boolean | undefined; // slides pass over pieces
  maxRange?: number | undefined;
  firstMoveOnly?: boolean | undefined;
};
export type PieceRule = { name: string; value: number; moves: Move[] };
export type Rules = {
  name: string;
  description: string;
  pieces: Record<PieceType, PieceRule>;
};
export type Cell = { t: PieceType; c: Color; moved?: boolean } | null;
export type Board = Cell[][];
export type Ply = { fr: number; fc: number; tr: number; tc: number };

const ORTH: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: [number, number][] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

export const DEFAULT_RULES: Rules = {
  name: "الشطرنج الكلاسيكي",
  description: "القواعد التقليدية. اكتب وصفاً لابتكار نسختك الخاصة.",
  pieces: {
    K: { name: "الملك", value: 1000, moves: [{ kind: "leap", vectors: [...ORTH, ...DIAG] }] },
    Q: { name: "الوزير", value: 9, moves: [{ kind: "slide", vectors: [...ORTH, ...DIAG] }] },
    R: { name: "الرخ", value: 5, moves: [{ kind: "slide", vectors: ORTH }] },
    B: { name: "الفيل", value: 3, moves: [{ kind: "slide", vectors: DIAG }] },
    N: { name: "الحصان", value: 3, moves: [{ kind: "leap", vectors: KNIGHT }] },
    P: {
      name: "البيدق",
      value: 1,
      moves: [
        { kind: "leap", vectors: [[0, 1]], mode: "move" },
        { kind: "slide", vectors: [[0, 1]], mode: "move", maxRange: 2, firstMoveOnly: true },
        { kind: "leap", vectors: [[1, 1], [-1, 1]], mode: "capture" },
      ],
    },
  },
};

export const GLYPH: Record<PieceType, string> = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };

export function initialBoard(): Board {
  const back: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    b[0]![c] = { t: back[c]!, c: "b" };
    b[1]![c] = { t: "P", c: "b" };
    b[6]![c] = { t: "P", c: "w" };
    b[7]![c] = { t: back[c]!, c: "w" };
  }
  return b;
}

const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function movesFrom(board: Board, rules: Rules, r: number, c: number): Ply[] {
  const p = board[r]![c];
  if (!p) return [];
  const fwd = p.c === "w" ? -1 : 1;
  const out: Ply[] = [];
  const seen = new Set<number>();
  const add = (tr: number, tc: number) => {
    const k = tr * 8 + tc;
    if (!seen.has(k)) { seen.add(k); out.push({ fr: r, fc: c, tr, tc }); }
  };
  for (const m of rules.pieces[p.t]?.moves ?? []) {
    if (m.firstMoveOnly && p.moved) continue;
    const mode = m.mode ?? "both";
    const range = m.kind === "leap" ? 1 : (m.maxRange ?? 8);
    for (const [dx, dy] of m.vectors) {
      for (let i = 1; i <= range; i++) {
        const tr = r + dy * fwd * i, tc = c + dx * i;
        if (!inB(tr, tc)) break;
        const t = board[tr]![tc];
        if (!t) { if (mode !== "capture") add(tr, tc); }
        else {
          if (t.c !== p.c && mode !== "move") add(tr, tc);
          if (!m.jump) break;
        }
      }
    }
  }
  return out;
}

export function allMoves(board: Board, rules: Rules, color: Color): Ply[] {
  const out: Ply[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r]![c]?.c === color) out.push(...movesFrom(board, rules, r, c));
  return out;
}

export function apply(board: Board, m: Ply): Board {
  const b = board.map((row) => row.slice());
  const p = b[m.fr]![m.fc]!;
  let np = { ...p, moved: true };
  if (p.t === "P" && (m.tr === 0 || m.tr === 7)) np = { ...np, t: "Q" };
  b[m.tr]![m.tc] = np;
  b[m.fr]![m.fc] = null;
  return b;
}

export function hasKing(board: Board, color: Color) {
  return board.some((row) => row.some((x) => x?.t === "K" && x.c === color));
}

function evaluate(board: Board, rules: Rules): number {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r]![c];
    if (!p) continue;
    const v = rules.pieces[p.t]?.value ?? 1;
    const center = 0.05 * (3.5 - Math.abs(3.5 - c)) + 0.05 * (3.5 - Math.abs(3.5 - r));
    s += (p.c === "b" ? 1 : -1) * (v + center);
  }
  return s;
}

function search(board: Board, rules: Rules, depth: number, a: number, b: number, color: Color): number {
  if (!hasKing(board, "w")) return 1e5 + depth;
  if (!hasKing(board, "b")) return -1e5 - depth;
  if (depth === 0) return evaluate(board, rules);
  const moves = order(board, allMoves(board, rules, color));
  if (!moves.length) return evaluate(board, rules);
  if (color === "b") {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(apply(board, m), rules, depth - 1, a, b, "w"));
      a = Math.max(a, best);
      if (a >= b) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(apply(board, m), rules, depth - 1, a, b, "b"));
    b = Math.min(b, best);
    if (a >= b) break;
  }
  return best;
}

const order = (board: Board, ms: Ply[]) =>
  ms.sort((x, y) => (board[y.tr]![y.tc] ? 1 : 0) - (board[x.tr]![x.tc] ? 1 : 0));

export function bestMove(board: Board, rules: Rules, depth = 3): Ply | null {
  const moves = order(board, allMoves(board, rules, "b"));
  let best: Ply | null = null, bestS = -Infinity;
  for (const m of moves) {
    const s = search(apply(board, m), rules, depth - 1, -Infinity, Infinity, "w") + Math.random() * 0.01;
    if (s > bestS) { bestS = s; best = m; }
  }
  return best;
}
