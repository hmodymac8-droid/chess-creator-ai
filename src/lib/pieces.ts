import type { Color, PieceType } from "./engine";

const TYPES: PieceType[] = ["K", "Q", "R", "B", "N", "P"];
const set = (c: Color) =>
  Object.fromEntries(TYPES.map((t) => [t, `/pieces/${c}${t}.svg`])) as Record<PieceType, string>;

export const PIECE_IMG: Record<Color, Record<PieceType, string>> = { w: set("w"), b: set("b") };
