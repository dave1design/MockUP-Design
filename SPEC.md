# Mockup Studio: Product & Technical Spec (MVP)

Version 1.0 · 2026-10-20 · Web app first, Figma plugin second

## 1. Product in one line
Choose a mockup, upload your design, see it fitted instantly, download it.

## 2. Goals
| Goal | Metric |
|---|---|
| Fast | Upload to first preview in under 5 s; whole flow in under 60 s |
| Simple | A first-time user exports without instructions (target 80%+) |
| Repeat use | 30% of exporters return within 7 days |
| Validate demand | Free-to-paid intent measured on the "HD export" upgrade prompt |

Targets are proposals, to be re-set after the first beta.

## 3. Users
UX/UI and product designers: freelancers, in-house product designers, small agencies. They need portfolio, case-study and client-presentation images.

## 4. Core flow (the entire MVP)
1. **Choose mockup**: the home page shows a gallery with category tabs (Phones, Laptops, Tablets, Desktops) and a search box. Click a card.
2. **Upload image**: on the editor page, drag and drop, click to browse, or paste (PNG/JPG/WebP, up to 20 MB).
3. **See it**: the image is auto-fitted into the device screen and shown live. Quick controls: fit mode (fill / fit), zoom, drag to reposition, background (colour presets, gradients, transparent), device colour if the asset supports it.
4. **Download**: a PNG/JPG button with a resolution choice (1x / 2x / 3x). The file downloads straight from the browser.

Edge cases that need a UI state: unsupported file, oversized file, wrong aspect ratio (show a "crop to fit" hint), asset failed to load, canvas too large for the browser (fall back to a lower scale and say so), offline.

## 5. Scope
**In (MVP):** gallery with search and filter, editor with live preview, client-side rendering, PNG/JPG/transparent-PNG export, light and dark mode, responsive layout, 24+ mockups across the four categories, keyboard accessibility.

**Phase 2:** batch export (one design to many devices), Figma plugin.

**Out, by decision:** backend, accounts, saved projects, favourites, history, analytics, payments. The app is stateless: when the user closes or refreshes the tab, the uploaded image and settings are gone. Nothing is stored on a server or in the browser.

**Out for now:** video or animation, AI scenes, packaging/apparel/print, teams, URL-to-screenshot.

## 6. Visual design
Reference for layout and feel only: a clean gallery, large mockup thumbnails, generous white space, a sticky top bar, and a simple left-panel/centre-canvas editor. Do **not** copy Mockuuups' code, copy, logo or imagery.

**Tokens**
| Token | Light | Dark |
|---|---|---|
| `--primary` | `#E11D2E` | `#FF4757` |
| `--primary-hover` | `#BE1424` | `#FF6B78` |
| `--primary-soft` (tints) | `#FDECEE` | `#3A1318` |
| `--bg` | `#FFFFFF` | `#0E0E10` |
| `--surface` | `#F6F6F7` | `#18181B` |
| `--text` | `#111114` | `#F4F4F5` |
| `--muted` | `#6B6B76` | `#A1A1AA` |
| `--border` | `#E4E4E8` | `#2A2A30` |

Red is used for the primary buttons, active tabs, focus rings and links only. Text on red must be white and meet 4.5:1 contrast. Font: Inter. Spacing is on an 8 px scale, radius 12 px for cards and 8 px for controls.

**Pages**
- `/` hero ("Turn your design into a mockup in seconds"), category tabs, search, mockup grid, footer.
- `/editor/:mockupId` header (back, mockup name, Download), left panel (upload, fit, zoom, background, scale), centre canvas, mobile layout with a bottom sheet for the controls.
- `/about`, `/license` (asset attribution list, generated from the manifest).

## 7. Assets: the "clone free assets" question
Do not scrape or copy mockups from Mockuuups, Artboard Studio, Placeit or similar sites. Their files are copyrighted and their terms of use usually forbid redistribution, and a product that resells or rehosts them is a legal risk. Use one of these instead:

1. **Draw the devices yourself as SVG/CSS** (recommended for the MVP). Generated frames for iPhone-style, Android-style, tablet, laptop and monitor are original, tiny, sharp at any resolution and fully yours.
2. **Openly licensed assets**, only when the licence permits commercial redistribution and modification: CC0 or public-domain collections, and assets whose own licence page says so. Before adding any file, record its source URL, author, licence and date checked in `public/mockups/manifest.json` and in `/license`. When in doubt, leave it out.
3. **Commission or create original photographic scenes** later, as a paid-tier library.

Brand-name caution: label devices generically ("Phone, rounded", "Laptop, slim") rather than using trademarked product names or logos.

## 8. Technical design
**Stack:** Vite + React + TypeScript, Tailwind CSS, React Router, Vitest and Playwright for tests. No backend in the MVP: everything runs in the browser, so uploads never leave the user's device (a privacy selling point).

**Mockup manifest** (`public/mockups/manifest.json`), one entry per mockup:
```json
{
  "id": "phone-rounded-front",
  "name": "Phone, rounded",
  "category": "phones",
  "tags": ["mobile", "front", "minimal"],
  "frame": "mockups/phone-rounded-front.svg",
  "thumbnail": "mockups/phone-rounded-front.thumb.webp",
  "canvas": { "width": 1600, "height": 2200 },
  "screen": {
    "quad": [[x,y],[x,y],[x,y],[x,y]],
    "cornerRadius": 96,
    "aspect": 0.462
  },
  "layers": { "behind": true, "overlay": "mockups/phone-rounded-front.glare.png" },
  "colors": ["#111", "#e5e5e5"],
  "license": { "type": "original", "source": "self", "author": "Mockup Studio" }
}
```
`screen.quad` is the four screen corners in canvas pixels (TL, TR, BR, BL). Flat front views give an axis-aligned rectangle; angled views give a general quad.

**Rendering pipeline** (`src/render/`):
1. Draw the background (colour, gradient, or transparent).
2. Draw the user image into the screen region: clip to the rounded screen shape, apply fit/zoom/offset in screen-local coordinates.
3. For non-rectangular quads, map the image with a homography by subdividing it into a grid of triangles (e.g. 16×16) and drawing each with an affine transform, so the same code works for the preview and the export.
4. Draw the device frame on top (SVG rasterised to canvas), then the optional glare overlay.
5. Preview renders at reduced scale on a `<canvas>`; export re-renders at 1x/2x/3x on an `OffscreenCanvas` and calls `toBlob`. Guard against exceeding the browser's maximum canvas area.

The renderer is a pure function, `render(mockup, userImage, settings, scale) -> canvas`, so it can later be reused in the Figma plugin and in unit tests.

**Structure**
```
src/
  pages/        Home.tsx, Editor.tsx, License.tsx
  components/   MockupCard, CategoryTabs, UploadDropzone, ControlsPanel, CanvasStage, DownloadMenu
  render/       render.ts, homography.ts, fit.ts, export.ts
  data/         loadManifest.ts, types.ts
  styles/       tokens.css
public/mockups/ manifest.json + assets
scripts/        generate-device-frames.ts (SVG generator), validate-manifest.ts
figma-plugin/   (phase 2)
```

## 9. Requirements
**Functional**
- FR1 Gallery lists all manifest mockups; filter by category, search by name or tag.
- FR2 Editor loads the chosen mockup; deep links (`/editor/:id`) work.
- FR3 Upload by drag-drop, file picker and paste; validate type, size and decodability; show a thumbnail and the file name.
- FR4 Auto-fit on upload; the user can switch fill/fit, zoom, and drag to reposition; reset button.
- FR5 Background: colour presets, a custom colour, 3+ gradients, transparent.
- FR6 Download PNG or JPG at 1x/2x/3x; transparent background is PNG only; file name `mockup-<id>-<scale>x.png`.
- FR7 Switch mockup inside the editor without losing the uploaded image.
- FR8 No persistence: no history, no saved projects, no stored uploads. State lives in memory only. The only thing that may be remembered is the light/dark theme choice (`localStorage`, in try/catch). Show a short note near the upload area: "Your image stays on your device and is not saved."

**Non-functional**
- Preview updates in under 100 ms after a control change on a mid-range laptop.
- Initial JS under 250 KB gzipped; thumbnails lazy-loaded.
- WCAG 2.2 AA: keyboard operable, visible focus, labelled controls, error text not conveyed by colour alone, `prefers-reduced-motion` respected.
- Works in current Chrome, Safari, Firefox, Edge; usable at 375 px width.
- No user image is uploaded, logged or stored. No cookies or tracking. Release object URLs when the image is replaced or the page closes.

## 10. Phase 2: Figma plugin
- Plugin UI is a small iframe that reuses `src/render`, `manifest.json` and the assets.
- Flow: select one frame, open the plugin, pick a mockup, preview, "Insert". Use `frame.exportAsync({format:'PNG', constraint:{type:'SCALE', value:2}})` and send the bytes to the UI, render, then `figma.createImage(bytes)` and place it as a rectangle fill next to the frame.
- States: nothing selected, several selected, frame too large, export failed, insertion failed.
- Publish-time needs: `manifest.json` for the plugin, `networkAccess` allow-list if assets are fetched remotely (or bundle a small set locally).

## 11. Risks
| Risk | Mitigation |
|---|---|
| Asset copyright | Original SVG frames and a licence ledger; no scraping |
| Misaligned screens | Per-asset quad coordinates, visual regression tests with sample images |
| Browser canvas limits at 3x | Detect and fall back; tell the user |
| Strong incumbents | Win on speed and a three-step flow; validate with 8–12 designers |
| Large images slow the preview | Downscale the preview copy; keep the original for export |

## 12. Acceptance checklist
- [ ] Gallery with 24+ mockups, 4 categories, search
- [ ] Upload, fit, preview, download works end to end for each mockup
- [ ] Red primary theme in light and dark; contrast checked
- [ ] Rendering unit tests and one Playwright flow test pass
- [ ] `/license` lists every asset with source and licence
- [ ] Lighthouse accessibility score of 95 or higher
- [ ] Figma plugin inserts a mockup into the canvas (phase 2)
