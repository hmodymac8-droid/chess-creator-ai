# Agent notes

Guidance for AI coding agents and contributors working in this repo.

## Architecture

- **TanStack Start** app (React 19 + Vite + Nitro). Routes are files in `src/routes/` (see `src/routes/README.md`). `src/routeTree.gen.ts` is generated, so don't edit it.
- **Rules engine** (`src/lib/engine.ts`) is pure and framework-free. A variant is a `Rules` object (piece name, value, and move patterns) and is the single source of truth for gameplay. UI code must not hard-code piece behavior.
- **AI generation** (`src/lib/variant.functions.ts`) is a server function that calls an OpenAI-compatible endpoint configured by `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. It returns error **codes** (`VariantError`), never user-facing text.

## Conventions

- **i18n**: every user-visible string goes through `useI18n()` / `src/lib/i18n.tsx`. English is the default and primary language, and Arabic must stay complete (the `Dict` type enforces this). Use logical CSS utilities (`ms-*`, `me-*`, `start-*`, `end-*`, `rtl:`) instead of `left`/`right`, so RTL keeps working.
- Rules are stored data. Built-in names (classic variant, standard piece names) are translated at render time with `variantName`, `variantDesc`, and `pieceName`. AI-generated names are shown as-is.
- Piece artwork lives in `public/pieces/{w,b}{K,Q,R,B,N,P}.svg` and is referenced through `PIECE_IMG` (`src/lib/pieces.ts`). The board and the legend must use the same images.
- Accounts use name + password mapped to a synthetic email (`src/lib/auth.tsx`). Usernames live in `profiles`, which keeps sign-in email-free. Auth helpers return error codes that are translated in the UI.
- Online games are rows in `games`, synced through Supabase Realtime. Each game copies its rules, so a friend can play without access to the owner's private variants.
- The app version shown in the About dialog comes from `package.json` (`__APP_VERSION__`, injected by Vite). Bump it when you cut a release.

## Checks

Run these before committing:

```sh
bunx tsc --noEmit
bun run test
bun run build
```
