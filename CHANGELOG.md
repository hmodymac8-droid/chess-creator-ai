# Changelog

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
