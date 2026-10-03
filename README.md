# Chess Creator AI

**Invent your own chess.** Describe new rules in plain language, e.g. *"the knight moves like a bishop, and pawns can jump over pieces"*. AI turns your description into a rule set you can play right away, against a built-in engine that understands the new rules or against a friend online.

The interface is available in **English** (default) and **Arabic** (full right-to-left layout). Switch languages from the header. Your choice is saved in the browser.

## Features

- **Rules from text**: an LLM converts a free-form description (in any language) into a structured rule set: leaps, slides, range limits, move-only or capture-only patterns, jumping over pieces, and first-move-only moves.
- **Play the engine**: a minimax/alpha-beta engine evaluates positions using the piece values from your rule set.
- **18 ready-made examples**, from *Amazon* to *Board Chaos*, plus classic chess.
- **Clocks**: optional time controls with per-move increment.
- **Accounts**: sign up with just a name and password (no email). Signed-in players can save their variants privately.
- **Online play**: invite a friend with a link. Moves sync in real time through Supabase Realtime.
- **Bilingual UI**: English / العربية, with a language toggle and RTL support.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) on [Vite](https://vite.dev) with [Nitro](https://nitro.build)
- [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components
- [Supabase](https://supabase.com) for auth, Postgres and Realtime
- [AI SDK](https://ai-sdk.dev) with any OpenAI-compatible endpoint
- [Vitest](https://vitest.dev) and Testing Library

## Getting started

Requirements: [Node.js](https://nodejs.org) 22+ and [Bun](https://bun.sh) (or run it with `npx bun`).

```sh
git clone https://github.com/hmodymac8-droid/chess-creator-ai.git
cd chess-creator-ai
bun install
cp .env.example .env   # then fill in the values
bun run dev            # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | yes | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | no | Supabase project ref |
| `AI_API_KEY` | for variant generation | API key for the AI provider |
| `AI_BASE_URL` | no | OpenAI-compatible base URL (defaults to OpenAI). Works with OpenRouter, Anthropic's OpenAI-compatible API, local servers, and so on |
| `AI_MODEL` | no | Model name (default `gpt-5-mini`) |
| `DATABASE_URL` | for migrations | Postgres connection string used by `drizzle-kit` |

**Free AI option:** create a key at [Google AI Studio](https://aistudio.google.com/apikey) (no card required) and set `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/` and `AI_MODEL=gemini-flash-latest`.

If `AI_API_KEY` is missing, the app still works: classic chess, the examples you already loaded, and online play all run. Only generating a new variant shows a "not configured" message.

### Database

The schema (profiles, private variants, online games, and the `join_game` RPC) lives in [`drizzle/migrations`](drizzle/migrations). Apply it to your Supabase project with the SQL editor, or run:

```sh
DATABASE_URL=postgres://... bunx drizzle-kit migrate
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build (output in `.output/`) |
| `bun run preview` | Preview the production build |
| `bun run test` | Run the test suite |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |

## Project structure

```
src/
  routes/          index.tsx (lab + local game), play.$id.tsx (online match), __root.tsx (shell)
  lib/engine.ts    move generation, rules model, search engine
  lib/variant.functions.ts   server function: text → rules via the AI
  lib/i18n.tsx     English/Arabic dictionaries, provider, and helpers
  lib/auth.tsx     name+password accounts mapped to synthetic emails
  components/      AuthForm, AboutDialog / LanguageToggle, shadcn/ui
public/pieces/     SVG piece set
drizzle/           database schema and migrations
```

## Adding a language

1. Add a dictionary to [`src/lib/i18n.tsx`](src/lib/i18n.tsx) typed as `Dict` (TypeScript flags any missing keys).
2. Register it in `LANGS` and `DICTS`, and set its direction in `I18nProvider`.
3. Add the language name to `LANG_NAMES` in [`src/lib/variant.functions.ts`](src/lib/variant.functions.ts) so the AI writes generated names in it.

## Credits

- Chess piece artwork: **cburnett** by Colin M.L. Burnett (GPLv2+ / CC BY-SA 3.0), taken from [Lichess chessground](https://github.com/lichess-org/chessground).
