import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_RULES, type Rules, type PieceType } from "./engine";

const SYSTEM = `You convert natural-language chess variant descriptions (in any language, often English or Arabic) into a JSON rule set.
Return ONLY a JSON object, no prose, matching this shape (this is standard chess):
${JSON.stringify(DEFAULT_RULES)}
Rules:
- Keep piece keys K,Q,R,B,N,P. Board is 8x8, standard setup, winning = capturing the enemy king.
- vectors are [dx, dy]; dy positive means FORWARD for the piece owner.
- kind "leap" = jump directly to the offset; "slide" = repeat along the direction until blocked (maxRange limits distance).
- mode: "both" | "move" (non-capturing only) | "capture" (capture only). jump:true lets a slide pass over pieces. firstMoveOnly for initial-move-only patterns.
- Only change what the description asks; keep the other pieces standard.
- "value" is the piece's approximate strength for the AI (king stays 1000).
- name: a short creative title for the variant. description: 1-2 sentences summarizing the changed rules.
- Write name, description and all piece names in the OUTPUT LANGUAGE given with the request.`;

const LANG_NAMES = { en: "English", ar: "Arabic" } as const;

const MoveS = z.object({
  kind: z.enum(["leap", "slide"]),
  vectors: z.array(z.tuple([z.number().int(), z.number().int()])),
  mode: z.enum(["both", "move", "capture"]).optional(),
  jump: z.boolean().optional(),
  maxRange: z.number().int().optional(),
  firstMoveOnly: z.boolean().optional(),
});
const PieceS = z.object({ name: z.string(), value: z.number(), moves: z.array(MoveS) });

export type VariantError = "aiNotConfigured" | "rateLimited" | "credits" | "parse";

export const generateVariant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(3).max(1000), lang: z.enum(["en", "ar"]).default("en") }).parse(d),
  )
  .handler(async ({ data }): Promise<{ rules?: Rules; error?: VariantError }> => {
    const apiKey = process.env["AI_API_KEY"];
    if (!apiKey) return { error: "aiNotConfigured" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateText } = await import("ai");
    // Any OpenAI-compatible endpoint works (OpenAI, OpenRouter, Anthropic's compat API, local servers…).
    const baseURL = process.env["AI_BASE_URL"];
    const provider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    try {
      const { text } = await generateText({
        model: provider.chat(process.env["AI_MODEL"] || "gpt-5-mini"),
        system: SYSTEM,
        prompt: `OUTPUT LANGUAGE: ${LANG_NAMES[data.lang]}

${data.prompt}`,
        maxRetries: 0,
      });
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const raw = JSON.parse(json);
      const pieces = { ...DEFAULT_RULES.pieces };
      for (const k of ["K", "Q", "R", "B", "N", "P"] as PieceType[]) {
        const p = PieceS.safeParse(raw?.pieces?.[k]);
        if (p.success && p.data.moves.length) pieces[k] = p.data;
      }
      pieces.K = { ...pieces.K, value: 1000 };
      return {
        rules: {
          name: String(raw.name ?? (data.lang === "ar" ? "نسخة مخصصة" : "Custom Variant")),
          description: String(raw.description ?? data.prompt),
          pieces,
        },
      };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) return { error: "rateLimited" };
      if (status === 402) return { error: "credits" };
      console.error(e);
      return { error: "parse" };
    }
  });
