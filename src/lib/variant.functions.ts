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
type Result = { rules?: Rules; error?: VariantError; detail?: string };

/** Parse a model reply that should be JSON but may carry fences, prose, comments or trailing commas. */
function parseLoose(text: string): Record<string, unknown> {
  const t = text.replace(/```(?:json)?/gi, "");
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) throw new Error(`no JSON object in reply: ${text.slice(0, 120)}`);
  const body = t.slice(i, j + 1);
  try {
    return JSON.parse(body);
  } catch {
    return JSON.parse(body.replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1"));
  }
}

const statusOf = (e: unknown) =>
  (e as { statusCode?: number })?.statusCode ?? (e as { lastError?: { statusCode?: number } })?.lastError?.statusCode;
const messageOf = (e: unknown) => String((e as { message?: string })?.message ?? e).slice(0, 300);

export const generateVariant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(3).max(1000), lang: z.enum(["en", "ar"]).default("en") }).parse(d),
  )
  .handler(async ({ data }): Promise<Result> => {
    const apiKey = process.env["AI_API_KEY"];
    if (!apiKey) return { error: "aiNotConfigured" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateText, Output } = await import("ai");
    // Any OpenAI-compatible endpoint works (OpenAI, Gemini, OpenRouter, Anthropic's compat API, local servers…).
    const baseURL = process.env["AI_BASE_URL"];
    const provider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    const model = provider.chat(process.env["AI_MODEL"] || "gpt-5-mini");
    const prompt = `OUTPUT LANGUAGE: ${LANG_NAMES[data.lang]}\n\n${data.prompt}`;

    // Thinking models (e.g. Gemini 2.5) can spend the whole token budget reasoning and return
    // truncated JSON, so ask for JSON mode, low effort and a generous budget. Some endpoints reject
    // these extras; fall back to a plain request if so.
    const ask = async (system: string, userPrompt: string, extras: boolean) => {
      const r = await generateText({
        model,
        system,
        prompt: userPrompt,
        maxRetries: 2, // free tiers often return 429/503 transiently; the SDK backs off between retries
        maxOutputTokens: 8192,
        ...(extras
          ? {
              output: Output.json(),
              providerOptions: { openai: { reasoningEffort: process.env["AI_REASONING_EFFORT"] || "low" } },
            }
          : {}),
      });
      return { text: r.text, truncated: r.finishReason === "length" };
    };
    // JSON mode can throw NoObjectGeneratedError on a bad reply; keep its text for our own parser.
    const askSafe = async (system: string, userPrompt: string, extras: boolean) => {
      try {
        return await ask(system, userPrompt, extras);
      } catch (e) {
        const t = (e as { text?: string; finishReason?: string });
        if (typeof t.text === "string" && statusOf(e) == null) return { text: t.text, truncated: t.finishReason === "length" };
        throw e;
      }
    };

    let reply: { text: string; truncated: boolean };
    try {
      try {
        reply = await askSafe(SYSTEM, prompt, true);
      } catch (e) {
        if (statusOf(e) !== 400) throw e;
        reply = await askSafe(SYSTEM, prompt, false);
      }
    } catch (e: unknown) {
      console.error(e);
      const status = statusOf(e);
      if (status === 429) return { error: "rateLimited" };
      if (status === 402) return { error: "credits" };
      return { error: "unavailable", detail: messageOf(e) };
    }

    let raw: Record<string, unknown>;
    try {
      raw = parseLoose(reply.text);
    } catch (first: unknown) {
      // One repair round: hand the broken reply back and ask for valid JSON only.
      console.error("variant JSON parse failed", first, reply.text);
      try {
        const fixed = await askSafe(
          SYSTEM,
          `${prompt}\n\nYour previous reply was ${reply.truncated ? "cut off" : "not valid JSON"}. Reply again with ONLY the complete, valid JSON object, keeping it compact.`,
          false,
        );
        raw = parseLoose(fixed.text);
      } catch (e: unknown) {
        console.error(e);
        return { error: "parse", detail: reply.truncated ? "AI reply was truncated" : messageOf(first) };
      }
    }

    const pieces = { ...DEFAULT_RULES.pieces };
    const rawPieces = (raw["pieces"] ?? {}) as Record<string, unknown>;
    for (const k of KEYS) {
      const p = PieceS.safeParse(rawPieces[k]);
      if (p.success && p.data.moves.length) pieces[k] = p.data;
    }
    pieces.K = { ...pieces.K, value: 1000 };
    const setup = SetupS.safeParse(raw["setup"]);
    return {
      rules: {
        name: String(raw["name"] ?? (data.lang === "ar" ? "نسخة مخصصة" : "Custom Variant")),
        description: String(raw["description"] ?? data.prompt),
        pieces,
        ...(setup.success ? { setup: setup.data } : {}),
      },
    };
  });
