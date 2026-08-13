# Product Design QA

- source visual truth: the left pane of `qa/home-comparison-final.png`
- implementation screenshot: `qa/home-implementation-final-1440x1024.png`
- full-view comparison evidence: `qa/home-comparison-final.png`
- focused search comparison: `qa/home-focus-search-comparison.png`
- focused technical-image comparison: `qa/home-focus-visual-comparison.png`
- responsive evidence: `qa/home-mobile-390x844.png`, `qa/admin-1024x768.png`
- viewport: desktop CSS target `1440 × 1024`; mobile `390 × 844`; admin narrow desktop `1024 × 768`
- source pixels: `1487 × 1058`; implementation screenshot pixels: `1425 × 1013`; in-app browser CSS viewport override: `1440 × 1024`, device scale 1
- density normalization: source and implementation were proportionally scaled into separate `1440 × 1024` white canvases, then horizontally combined without stretching
- state: English home, Part / Reference active, `TQ-FL-4827` populated

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: Barlow Condensed reproduces the tall industrial display hierarchy; Inter handles English UI/body; Noto Sans SC handles the denser admin. The headline keeps the source's two-line wrap and product numbers use tabular, technical styling.
- Spacing and layout rhythm: the header, 57/43 hero split, search instrument, thin rules and four-category index preserve the selected composition. Surfaces use near-square controls and borders instead of generic elevated cards.
- Colors and tokens: deep navy, graphite, warm off-white and restrained safety orange map directly to the source. Semantic success, warning and danger colors are reserved for operational state and paired with text/icons.
- Image quality and asset fidelity: the hero is a dedicated `720 × 760` generated raster cutaway with real material detail, flow arrows, dimensions and component labels; product and family imagery are dedicated high-resolution raster assets. No CSS drawings, placeholder boxes, handcrafted SVGs or emoji replace target assets.
- Copy and content: the selected home copy is preserved. Category names intentionally follow the PRD's four fixed categories (`Air`, `Oil`, `Fuel`, `Cabin`) instead of the generated mock's accidental coolant category.
- Icons: Phosphor's consistent linear set is used for UI icons; stroke weight and optical size are shared across public and admin surfaces.
- Responsiveness: the public workflow remains usable at `390 × 844`; the admin remains intact at `1024 × 768`; measured document width did not exceed the available content viewport in either check.
- Accessibility: persistent labels, visible focus rings, semantic buttons/forms, alt text, reduced-motion handling, textual status labels and 44–48 px primary targets are present.

## Comparison History

### Pass 1 — blocked

- [P2] The part-number field inherited an incorrect `Optional` marker not present in the source or lookup contract.
- Fix: changed the reusable field component so requirement metadata renders only when explicitly requested.
- Post-fix evidence: `qa/home-focus-search-comparison.png` shows the corrected permanent label.

### Pass 2 — passed

- Full-view comparison confirms the headline hierarchy, split proportion, search anatomy, rule system, palette and category index.
- Focused search comparison confirms label, tab, input, CTA and secondary action alignment.
- Focused image comparison confirms the same cutaway subject, dimension language, material treatment and orange/blue flow cues. The implementation's slightly warmer image plate is an acceptable generated-asset variation and does not change hierarchy.
- No further P0/P1/P2 mismatch was found.

## Interaction and Runtime Verification

- Precise part number opens product detail.
- Metric / Imperial changes visible dimensions.
- Product inquiry validates required fields and reaches the non-sensitive success receipt.
- Vehicle lookup reaches the matching-results route.
- No-result and discontinued-with-replacement states render.
- Quote drawer opens and closes; reassignment renders the old owner's permission-denied state.
- Excel errors disable import; corrected preview enables import; import success and undo-conflict rejection render.
- Browser console was checked after fixes: no errors or warnings.
- `npm run build`: passed.
- `npm run test:sites`: 4/4 passed.

## Follow-up Polish

- [P3] The generated hero asset uses a subtly warmer rectangular paper plate than the page surface. This preserves readability of its fine annotations and can be revisited if a transparent production illustration becomes available.

final result: passed
