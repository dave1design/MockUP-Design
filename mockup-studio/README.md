# Mockup Studio

Choose a mockup, upload your design, see it fitted in the device, download it.
Everything runs in the browser: there is no backend, no account, no history, and nothing is stored.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm test           # unit tests (renderer maths)
npm run e2e        # browser tests with Google Chrome (builds and serves the app)
npm run assets     # regenerate the device frames and manifest
npm run validate   # check the manifest
```

`dist/` is a static site. Host it anywhere (Netlify, Vercel, GitHub Pages). `public/_redirects` handles
client-side routes on Netlify; other hosts need an equivalent "serve index.html for unknown paths" rule.

## How it works

- `scripts/generate-device-frames.ts` draws original device frames as SVG (with a transparent screen hole)
  and writes `public/mockups/manifest.json`. Tilted devices are projected in 3D, so each mockup stores the
  exact screen quad.
- `src/render/` is a pure rendering module (no React): fit maths, projective mapping, drawing, export.
  The same module is meant to be reused by the Figma plugin.
- Rendering order: background, shadow, your image mapped into the screen quad (clipped to the rounded
  screen), then the device frame on top.
- State (`src/state/Session.tsx`) is in memory only. Only the light/dark theme is remembered.

## Adding a mockup

Add an entry to the `entries` list in the generator and run `npm run assets`, or add your own files:
a frame SVG/PNG with a transparent screen hole, a thumbnail, and a manifest entry with the screen
`quad` (TL, TR, BR, BL in canvas pixels), its size and corner radius, and a **licence** block.
Third-party assets must include `license.url`, and the licence must allow commercial redistribution
and modification. `npm run validate` enforces this.

## My mockups (private, per browser)

`/my-mockups` lets the owner add their own mockup images (photos or renders). For each image you drag four
numbered corners onto the device screen and save. The design is then placed on that screen over the photo.
These mockups are stored in the browser's IndexedDB only; they are not part of the build, the manifest or the
licence page, and nothing is uploaded. Clearing site data removes them. Photos can't cover things that sit in
front of the screen (a hand, glare), because the design is drawn on top of the whole picture.

### Bulk import from a folder of archives

`scripts/import-mockups.ts` imports mockup PSDs from a folder of zip / rar / 7z files into `public/my-mockups/`
(ignored by git, loaded by the app next to the built-in library):

```bash
npx tsx scripts/import-mockups.ts <folder-with-archives> <empty-work-folder> <path-to-7zz>
```

For each PSD it rebuilds the scene (using the PSD's own preview, or the layers when a promo/cover layer is baked
into it), reads the screen position from the smart object, keeps the camera notch/island in front of the design,
and writes `manifest.json` plus `import-report.json`. 7-Zip's command-line tool (`7zz`) is needed because macOS's
built-in tool can't unpack these RAR files. `npm run build` copies `public/my-mockups` into `dist/`, so don't
publish `dist/` if you use files you shouldn't share.

Only add images you are allowed to use for this purpose. Free mockups from sites like ls.graphics are normally
licensed for your own use but not for redistribution, so keep this tool private if you use them.

## Open source

The code is MIT licensed (`LICENSE`); see `CONTRIBUTING.md` for how others can send mockups or code. Fill in
your name, email, repository and social links in `src/config/developer.ts`: they appear in the "Developer"
section and the footer (empty links are hidden on the published site).

**Before you publish the repository or the site:** `public/my-mockups/` holds mockups imported from other
people's PSD packs. They are gitignored and must stay out of any public repository, build or deployment.
Check that `dist/my-mockups` is not uploaded, or delete `public/my-mockups` before building for the public.

## Decisions

- Device frames are original and generic (no manufacturer names or logos). No mockups were copied from
  other mockup sites.
- Letterbox colour in "Fit inside" mode is sampled from the image's top-left corner.
- Exports are limited to browser canvas limits (16,384 px per side, 100 MP); the app tells the user when
  it lowers the scale.
- Not yet built: multi-device scenes, batch export, glare overlays, the Figma plugin (next phase).
