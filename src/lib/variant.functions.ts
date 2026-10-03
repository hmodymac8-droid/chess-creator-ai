import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_RULES, STANDARD_SETUP, type Rules, type PieceType } from "./engine";

const SYSTEM = `You convert natural-language chess variant descriptions (in any language, often English or Arabic) into a JSON rule set.
Return ONLY a JSON object, no prose and no code fences, matching this shape (this is standard chess):
${JSON.stringify({ ...DEFAULT_RULES, setup: STANDARD_SETUP })}
Rules:
- Always include all six piece keys K,Q,R,B,N,P in "pieces" (even unused ones). Board is 8x8.
- vectors are [dx, dy]; dy positive means FORWARD for the piece owner.
- kind "leap" = jump directly to the offset; "slide" = repeat along the direction until blocked (maxRange limits distance).
- mode: "both" | "move" (non-capturing only) | "capture" (capture only). jump:true lets a slide pass over pieces. firstMoveOnly for initial-move-only patterns.
- "setup" is the starting position seen from each player's own side, mirrored for both colors: "back" is the first rank and "pawns" the second rank, 8 entries each for files a→h. Each entry is a piece key or null (empty square). Change it when the description adds, removes or rearranges pieces (e.g. "only knights and pawns" → every other square null); otherwise keep the standard setup.
- Winning: if K is in the setup, capturing the enemy king wins; if K is not in the setup, capturing every enemy piece wins. Mention the goal in the description when it differs from standard chess.
- Only change what the description asks; keep the other pieces standard.
- "value" is the piece's approximate strength for the AI (king stays 1000).
- name: a short creative title for the variant. description: 1-2 sentences summarizing the changed rules.
- Write name, description and all piece names in the OUTPUT LANGUAGE given with the request.`;

const LANG_NAMES = { en: "English", ar: "Arabic" } as const;
const KEYS: PieceType[] = ["K", "Q", "R", "B", "N", "P"];

const MoveS = z.object({
  kind: z.enum(["leap", "slide"]),
  vectors: z.array(z.tuple([z.number().int(), z.number().int()])),
  mode: z.enum(["both", "move", "capture"]).optional(),
  jump: z.boolean().optional(),
  maxRange: z.number().int().optional(),
  firstMoveOnly: z.boolean().optional(),
});
const PieceS = z.object({ name: z.string(), value: z.number(), moves: z.array(MoveS) });
const Rank = z.array(z.enum(["K", "Q", "R", "B", "N", "P"]).nullable()).length(8);
const SetupS = z
  .object({ back: Rank, pawns: Rank })
  .refine((s) => [...s.back, ...s.pawns].some(Boolean), "setup has no pieces");

export type VariantError = "aiNotConfigured" | "rateLimited" | "credits" | "unavailable" | "parse";

export const generateVariant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(3).max(1000), lang: z.enum(["en", "ar"]).default("en") }).parse(d),
  )
  .handler(async ({ data }): Promise<{ rules?: Rules; error?: VariantError }> => {
    const apiKey = process.env["AI_API_KEY"];
    if (!apiKey) return { error: "aiNotConfigured" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateText } = await import("ai");
    // Any OpenAI-compatible endpoint works (OpenAI, Gemini, OpenRouter, Anthropic's compat API, local servers…).
    const baseURL = process.env["AI_BASE_URL"];
    const provider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    let text: string;
    try {
      ({ text } = await generateText({
        model: provider.chat(process.env["AI_MODEL"] || "gpt-5-mini"),
        system: SYSTEM,
        prompt: `OUTPUT LANGUAGE: ${LANG_NAMES[data.lang]}\n\n${data.prompt}`,
        // Free tiers (e.g. Gemini) often return 429/503 transiently; the SDK backs off between retries.
        maxRetries: 2,
      }));
    } catch (e: unknown) {
      const status = (e as { statusCode?: number; lastError?: { statusCode?: number } })?.statusCode
        ?? (e as { lastError?: { statusCode?: number } })?.lastError?.statusCode;
      console.error(e);
      if (status === 429) return { error: "rateLimited" };
      if (status === 402) return { error: "credits" };
      return { error: "unavailable" };
    }
    try {
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const raw = JSON.parse(json);
      const pieces = { ...DEFAULT_RULES.pieces };
      for (const k of KEYS) {
        const p = PieceS.safeParse(raw?.pieces?.[k]);
        if (p.success && p.data.moves.length) pieces[k] = p.data;
      }
      pieces.K = { ...pieces.K, value: 1000 };
      const setup = SetupS.safeParse(raw?.setup);
      return {
        rules: {
          name: String(raw.name ?? (data.lang === "ar" ? "نسخة مخصصة" : "Custom Variant")),
          description: String(raw.description ?? data.prompt),
          pieces,
          ...(setup.success ? { setup: setup.data } : {}),
        },
      };
    } catch (e: unknown) {
      console.error(e, text);
      return { error: "parse" };
    }
  });
