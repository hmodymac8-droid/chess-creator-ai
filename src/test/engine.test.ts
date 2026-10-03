import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, apply, bestMove, hasRoyal, initialBoard, lost, piecesInPlay, type Rules } from "@/lib/engine";

const minor: Rules = {
  ...DEFAULT_RULES,
  name: "Knights, bishops and pawns",
  setup: {
    back: [null, "N", "B", null, null, "B", "N", null],
    pawns: ["P", "P", "P", "P", "P", "P", "P", "P"],
  },
};

describe("custom setups", () => {
  it("places only the pieces from the setup, mirrored for both sides", () => {
    const b = initialBoard(minor);
    expect(b[7]![0]).toBeNull();
    expect(b[7]![1]).toMatchObject({ t: "N", c: "w" });
    expect(b[0]![2]).toMatchObject({ t: "B", c: "b" });
    expect(b.flat().filter((x) => x?.t === "K")).toHaveLength(0);
    expect(piecesInPlay(minor)).toEqual(["B", "N", "P"]);
  });

  it("without a king, a side loses only when all its pieces are gone", () => {
    expect(hasRoyal(minor)).toBe(false);
    const b = initialBoard(minor);
    expect(lost(b, minor, "w")).toBe(false);
    const onlyBlack = b.map((row) => row.map((x) => (x?.c === "w" ? null : x)));
    expect(lost(onlyBlack, minor, "w")).toBe(true);
  });

  it("standard rules still use king capture", () => {
    const b = initialBoard(DEFAULT_RULES);
    expect(hasRoyal(DEFAULT_RULES)).toBe(true);
    const noWhiteKing = b.map((row) => row.map((x) => (x?.t === "K" && x.c === "w" ? null : x)));
    expect(lost(noWhiteKing, DEFAULT_RULES, "w")).toBe(true);
  });

  it("promotes pawns to the strongest piece in play", () => {
    const b = initialBoard(minor).map((row) => row.map(() => null)) as ReturnType<typeof initialBoard>;
    b[1]![0] = { t: "P", c: "w" };
    const nb = apply(b, { fr: 1, fc: 0, tr: 0, tc: 0 }, minor);
    expect(nb[0]![0]?.t).toBe("B"); // bishop and knight are both 3; first strongest wins
  });

  it("the engine finds a move in a kingless variant", () => {
    expect(bestMove(initialBoard(minor), minor, 2)).not.toBeNull();
  });
});
