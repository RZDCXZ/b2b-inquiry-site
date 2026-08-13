# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable design decision

- Selected direction: Product Design ideation option 1, “Precision Ledger”.
- Visual comparison evidence: `qa/home-comparison-final.png` (the left pane contains the selected generated direction).
- Preserve the warm editorial paper surface, deep-navy condensed display typography, thin graphite rules, near-square controls, generous public-site whitespace, and safety-orange primary actions.
- The Chinese admin is the denser operational counterpart of the same system, not a generic SaaS dashboard.
- Public top navigation must visibly highlight the current section with the same safety-orange underline used by the language and finder tabs; expose the active item with `aria-current="page"`.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
