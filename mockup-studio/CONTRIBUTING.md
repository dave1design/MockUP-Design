# Contributing to Mockup Studio

Thank you for helping! There are two ways to contribute.

## 1. Share a mockup

Send it by email or open an issue/pull request (see the links on the site). Please include:

- the **device type** (phone, tablet, laptop or desktop) and a name;
- the file: a **PSD** with the screen as a smart object, or a **PNG** where the screen is transparent;
- **who made it and its licence**. Only send mockups you made yourself, or whose licence clearly allows sharing
  and modification. Do not send files taken from other sites without permission.

Accepted mockups are added with `scripts/import-mockups.ts` (see the README), recorded with their licence in
`public/mockups/manifest.json`, and listed on the Licences page, with credit to the author.

## 2. Improve the code

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run e2e      # browser tests (needs Google Chrome)
```

Please keep changes small, add a test when you change behaviour, and run `npm run build` before sending a pull
request. The app is deliberately stateless: no accounts, no tracking, and no uploads of users' designs.

By contributing you agree that your code is released under the MIT licence in `LICENSE`.
