# Changelog

## v1.1.0

### Added
- Custom starting positions: a variant can add, remove or rearrange pieces (e.g. "only knights, bishops and pawns").
- Kingless variants: without a king in the setup, capturing every enemy piece wins.
- The variant panel shows the goal and lists only the pieces in play.
- Engine tests for setups, win conditions and promotion.

### Changed
- Pawns promote to the strongest piece in play instead of always a queen.
- AI generation asks for JSON mode, low reasoning effort and a larger token budget, and falls back to a plain request when the provider rejects those options. This makes it reliable with thinking models such as Gemini 2.5.
- Replies with code fences, comments or trailing commas are accepted, with one repair round when the reply is still invalid or truncated.
- A busy AI service is reported separately, and the underlying reason is shown under the error message.
- Documented the free Google Gemini setup.

## v1.0.0

First standalone release.

### Added
- English UI as the default language, with a full Arabic translation and a language toggle. RTL layout switches automatically, and the choice is saved per browser.
- About dialog showing the app version and a link to the source repository.
- AI-generated variant names, descriptions, and piece names follow the selected language.
- `.env.example` and full setup documentation.

### Changed
- AI variant generation now works with any OpenAI-compatible provider via `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.
- Chess pieces are served locally from `public/pieces` (cburnett set) instead of an external asset host.
- Vite is configured directly (TanStack Start, React, Tailwind, Nitro) without a hosted-builder preset.
- The lockfile now resolves packages from the public npm registry.
- Move log, auth errors, and server errors are language-aware.

### Removed
- All Lovable-specific code, config, and assets: editor preview auth bridge, error telemetry hooks, AI gateway, project metadata, and the hosted piece assets.

### Fixed
- The routing test hung in jsdom because React 19 waits for stylesheets to load. The test setup now fires the `load` events.
