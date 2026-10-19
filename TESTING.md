# Verification record

19 October 2026 • v0.1.0 preview

## Automated checks completed

- **53 engine tests passed** using Node 24.19.0 and Vitest 5.0.5.
- **36 browser tests passed** using Playwright Chromium, desktop and iPhone-sized touch emulation.
- TypeScript strict checking and Vite production build passed.
- Dependency audit reported **zero known vulnerabilities** at verification time.
- Production HTML/JS/CSS loaded from a nested path inside an iframe and completed a placement without page errors.
- Layouts checked at 360×640, 640×360, 820×1180, and 1180×820. Gameplay buttons stayed within the viewport and measured at least 48 CSS pixels in the layout assertions.

Engine coverage includes exact size-weighted bag frequencies (about 91% small pieces and 1% huge pieces), strictly decreasing frequency by volume, narrow-well renormalization, weighted save/undo/replay compatibility, separate weighted records, default bars, flat squares, solid cubes and cuboids, exact 2× gravity/soft-drop timing, unchanged game clock and lock delay, well-specific bag filtering, oversized-save rejection, large-piece rotation/saves/replays, legacy simple-piece bags/saves/replays, legacy eight-tetracube save compatibility, optional Foundation shapes, connectivity, inverse/four-turn rotations, orientations, all presets, custom minimum/maximum dimensions, invalid settings, collision boundaries, atomic failure, hard-drop landing, simultaneous clears, whole-layer compaction, hidden rows, pre-top-out clears, scoring, gravity, lock delay/reset limits, hold, disabled hold, deterministic bags, replay, snapshots, corrupted data, same-tick undo, and view mapping.

Browser coverage includes well selection, setup validation, named configurations, keyboard/touch placement, save/resume, Practice undo, camera snapping/input suppression, tutorial layer completion, focus pause, denied storage, remapping/menu keyboard behavior, graphics interruption, backup export/import, malformed backup rejection, simultaneous movement/soft-drop cancellation, production iframe/subpath loading, and full-size 3×3×3 preview containment on desktop and touch.

Software WebGL browser checks run serially to avoid competing graphics contexts affecting animation timing. Each viewport has its own test case and timeout, rather than combining four software-rendered screenshots into one hosted-runner time budget. Browser tests build on explicit settled-view state rather than fixed sleeps for camera transitions.

## Visual inspection

Desktop home and gameplay were inspected through screenshots. Phone portrait/landscape and tablet layout screenshots were also inspected. Settled blocks, active pieces, landing ghosts, compact Hold/Next, and camera/control toolbars are present.

## Checks still requiring hardware or account access

- Physical iPhone/iPad Safari and Android Chrome playtests, including multi-touch comfort, safe areas, rotation, and performance.
- Desktop Safari, Firefox, and Edge interactive checks. Chromium emulation does not establish compatibility for other engines.
- Measured 60 fps desktop/tablet and 30 fps phone targets on representative hardware, including maximum well dimensions.
- Actual itch.io upload and its hosted iframe/fullscreen behavior. The user will install on itch.io after testing.
- Learning/playtest targets in GAME_DESIGN.md: tutorial completion, ghost prediction, packing readability, and numerical balance.

GitHub Actions repeats engine, browser, and production checks before deployment. The release stays a prerelease while the outstanding compatibility/playtest checks remain incomplete. See the Actions run and public preview for hosted build status; no local result alone establishes deployment success.

## Reproduce

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run format:check
npm audit
```

`test-results/` contains generated layout screenshots and failure traces and is intentionally excluded from source control. Attach selected artifacts to a bug report when useful. No physical-device testing is claimed by these automated results.
