# Contributing

Use Node 24 LTS and `npm ci`. Run `npm test`, `npm run typecheck`, `npm run test:browser`, and `npm run build` before opening a pull request. Browser tests need `npx playwright install chromium`.

Keep the rules engine independent of browser APIs. Include meaningful regression tests for rule or input changes. New gameplay rules require a rules-version decision and compatible record/save handling. Do not silently invalidate old data.

For UI work, check 360×640 portrait, 640×360 landscape, tablet, and desktop. Keep gameplay targets at least 48 CSS pixels. Preserve keyboard focus, reduced motion, safe areas, and touch cancellation handling.

Report bugs with version, browser/device, well dimensions, mode, seed, reproduction steps, and a replay or backup when relevant. Remove any information you do not want public before uploading files.

Contributions are provided under GPL-3.0-only. Include attribution for third-party materials and use compatible dependencies. Do not add original Frac assets.
