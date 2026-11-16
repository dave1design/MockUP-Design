# Prompt for Claude Code

Open Claude Code in the project folder, make sure `SPEC.md` is in it, and paste everything below the line.

---

You are building **Mockup Studio**, a web app for UX/UI designers. Read `SPEC.md` in this folder first. It is the source of truth for scope, design tokens, the manifest schema and the rendering pipeline.

## The product
The user flow is exactly: **choose a mockup, upload an image, see it fitted in the device, download it.** Keep it that simple.

## Hard rules
1. **Assets: do not scrape, copy or download mockups from Mockuuups, Artboard Studio, Placeit or any other mockup site.** Build the device frames yourself as original SVG (phone, tablet, laptop, desktop monitor, in several styles and colours) with a generator script. Only add third-party files if they are CC0/public-domain or clearly licensed for commercial redistribution, and record source, author and licence in the manifest and on the `/license` page. If you cannot verify a licence, do not include the file.
2. Use generic device names. No trademarked product names or logos.
3. Visual style: clean, airy and gallery-like in the spirit of mockuuups.studio, but original. **Primary colour is red** (`#E11D2E` light, `#FF4757` dark) using the tokens in `SPEC.md`. Red is for primary buttons, active tabs, focus rings and links only. Inter font, 8 px spacing scale, light and dark mode.
4. Everything runs client-side. Uploaded images never leave the browser.
5. Stack: Vite, React, TypeScript, Tailwind, React Router, Vitest, Playwright.

## Work in these phases. Finish and verify each before the next.

**Phase 1: Foundation**
Scaffold the project, set up Tailwind with the design tokens as CSS variables (light and dark), the routes (`/`, `/editor/:id`, `/license`), and the shared layout (sticky top bar, footer, theme toggle).

**Phase 2: Assets**
Write `scripts/generate-device-frames.ts` that produces at least 24 original SVG mockups (6+ phones, 6+ laptops, 6+ tablets, 6+ desktop monitors) with varied colours and styles, thumbnails, and `public/mockups/manifest.json` following the schema in `SPEC.md`. Include a few angled or perspective variants to exercise the quad mapping. Add `scripts/validate-manifest.ts`, which checks that every file exists, the quad is valid and the licence fields are filled.

**Phase 3: Renderer**
Implement `src/render/` as a pure, tested module: fit and fill maths, rounded-screen clipping, homography via triangle-grid subdivision for non-rectangular quads, background (colour, gradient, transparent), overlay, preview and export scaling, and a canvas-size guard. Add Vitest tests for the maths and a few golden-image checks.

**Phase 4: Gallery page**
Hero, category tabs (Phones, Laptops, Tablets, Desktops), search, responsive grid of mockup cards with lazy-loaded thumbnails, empty and no-results states, and keyboard navigation.

**Phase 5: Editor**
Upload dropzone (drag-drop, picker, paste) with validation (type, 20 MB limit, decodability) and clear error messages. Live canvas preview with auto-fit on upload, a fill/fit toggle, zoom, drag to reposition and a reset. Background presets, a custom colour, gradients and transparent. A mockup switcher that keeps the uploaded image. Download menu (PNG/JPG, 1x/2x/3x, transparent only for PNG). Loading, error and success states. A mobile layout with a bottom-sheet control panel. Keep all state in memory only: no history, no saved projects, no stored uploads. The only thing persisted is the theme choice in `localStorage` (try/catch). Show the note "Your image stays on your device and is not saved." near the upload area, and revoke object URLs when the image changes.

**Phase 6: Quality**
Accessibility pass (WCAG 2.2 AA: focus, labels, contrast, reduced motion). Performance pass (bundle under 250 KB gzipped, preview under 100 ms per change). A Playwright test for the full flow: open a mockup, upload a sample image, check the preview, download, and assert the file. Fill in `/license` from the manifest. Write a README with setup, scripts, and how to add a new mockup.

**Phase 7: Figma plugin (after the web app is done)**
Create `figma-plugin/` with `manifest.json`, a main thread and a UI iframe. The UI imports the shared `src/render` module and manifest. The flow is: read the selected frame, export it as PNG at 2x with `exportAsync`, let the user pick a mockup and preview, render, then insert with `figma.createImage` as a rectangle fill beside the frame. Handle: no selection, multiple selection, oversized frame, export error, insertion error. Document how to load it with "Import plugin from manifest".

## How to work
- Start with a short plan, then build phase by phase. After each phase, run the build, the type check, the tests and the dev server, and report what you verified. Do not claim something works without running it.
- Keep components small, use TypeScript strictly, and match the file structure in `SPEC.md`.
- If a decision is not covered by `SPEC.md`, choose the simplest option, note it in the README under "Decisions", and continue. Ask me only if you are blocked.
- Do not add a backend, accounts, history, saved projects, payments, cookies or analytics. The app is stateless by design and must work as a static site.

When done, give me: how to run it, a list of what is implemented against the `SPEC.md` acceptance checklist, and anything you deliberately left out.
