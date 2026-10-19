# FRAC implementation and release plan

Version 0.2 • 18 October 2026

## Agreed product decisions

Browser-first 3D falling-block puzzle, desktop and touch in the first release. The well remains fixed while its view rotates. Movement follows one of four settled camera quadrants. Visible buttons control every game action; drag orbits the view. Clean geometric graphics, six presets and custom dimensions, Marathon and Practice. Public `kariato/frac`, GPL-3.0-only, GitHub Pages, and itch.io.

This plan describes the implementation sequence and acceptance gates. Completed code is not evidence of real-device playtesting. See `TESTING.md` for the actual verification record and outstanding checks.

## Phase 0 — Specification and repository

1. Update `GAME_DESIGN.md` for responsive browser play and control mappings.
2. Create public GitHub repository from `/Users/kariatoo/source/frac`, main branch.
3. Include GPL text, third-party notices, README, contribution instructions, and issue/PR templates.
4. Scaffold TypeScript, Vite, Three.js, Vitest, and Playwright. Use Node 24 LTS and a committed npm lockfile.
5. Configure relative asset URLs, a static entry point, and CI.

Gate: a clean install typechecks and builds; docs state the chosen first-release behavior without unresolved implementation choices.

## Phase 1 — Deterministic rules engine

Implement integer grid, four hidden spawn rows, canonical piece catalogs, quarter-turn rotations around an integer local origin, collision, movement, drop, hold, seeded shuffle bags, locking, simultaneous clears, compaction, scoring, levels, top-out, and Practice undo.

Interfaces: `GameConfig`, `GameState`, `GameCommand`, `Replay`, and versioned snapshots. Commands resolve to world axes before reaching the engine. The fixed-tick engine has no renderer, wall-clock, browser, or storage dependencies. Same-tick replay commands retain array order. Saving copies state rather than retaining live references.

Gate: catalog completeness, all presets, custom bounds, failed atomic moves, rotation inverses, scoring, buffer handling, lock timing, deterministic replay, save round-trips, and undo history pass tests.

## Phase 2 — Desktop vertical slice

Build a Three.js well with instanced blocks, edges, floor grid, landing ghost, lighting, orthographic camera, axis marker, top-down heights, and compact piece previews. Add keyboard mappings and remapping, orbit with side snapping, pause/resume, results, and restart. Build touch control prototypes at this stage to avoid designing around unlimited desktop space.

Camera owns cosmetic state. Input adapters resolve view-relative movement and rotations. Suppress commands during orbit, clear held state, and do not queue actions. Marathon continues gravity; Practice suspends simulation while orbiting.

Gate: a complete run can be played, failed, restarted, and replayed; camera changes never reinterpret queued inputs; rotated views remain predictable.

## Phase 3 — Responsive touch play

Implement four-direction pad, six rotation controls, hold, soft/hard drop, camera toolbar, and touch undo. Use Pointer Events, capture, cancellation, and multi-pointer ownership. Support both hands, optional mirrored clusters, and at least 48-pixel gameplay targets.

Implement desktop, tablet portrait/landscape, and phone portrait/landscape layouts. Use container size, safe areas, and dynamic viewport heights. Pause on orientation/focus changes. Keep setup and modal scrolling separate from active play. Show compact Hold/Next when sidebars disappear.

Gate: at 360×640, 640×360, 820×1180, and 1180×820, all controls stay inside the viewport; no horizontal overflow or stuck input. Automated emulation is followed by physical-device tests before declaring full mobile compatibility.

## Phase 4 — Complete v0.1 features

Add all six wells, custom dimensions and named setups, Marathon progression, Practice gravity toggle and undo, interactive six-step tutorial, local rules-separated records, settings, procedural effects/ambient audio, contrast and reduced-motion options, automatic snapshots, and JSON backup transfer.

Use IndexedDB for run data and localStorage for preferences. Validate imported configuration, counters, boards, shapes, commands, and bounded collection sizes. Confirm destructive import. Handle denied storage and graphics loss without losing the ability to play or export.

Gate: setup → play → pause → save → reload → resume and export → import work with both input systems. Tutorial teaches movement, rotation, orbit, a prepared clear, gap awareness, and hold.

## Phase 5 — Hosting and hardening

1. Build with relative base `./`, bundled dependencies/assets, and no runtime API requirement.
2. Run engine and browser suites, typecheck, and production build in CI.
3. Deploy GitHub Pages through Actions. Test under the repository subpath.
4. Package itch HTML5 ZIP with index.html at root. Upload manually through the publishing account, configure click-to-launch, and test the actual embedded/fullscreen build.
5. Include license, notices, source URL, version, and commit provenance. Release source alongside the playable archive.
6. Test visibility loss, blocked storage, resize, denied fullscreen, corrupted saves, context loss, and simultaneous touch actions.

Gate: both hosts serve the same version; local records remain separate by origin; backup transfer works. No credentials are embedded in the client.

## Phase 6 — Public release

Review visual screenshots, conduct real-device tests on iPhone/iPad and Android, and record browser versions and performance. Target 60 fps desktop/tablet and 30 fps minimum on representative phones. Cap pixel ratio and avoid heavy post-processing; profile the maximum 10×10×24 well.

Publish a tagged v0.1.0 prerelease while hardware checks or itch upload remain outstanding. Promote it to a stable release only after all acceptance gates are satisfied. Add release notes, known limitations, source archive, and itch-ready ZIP. Roll back by redeploying an earlier known-good commit and re-uploading its ZIP; do not migrate saved data silently.

No analytics service is included. Use user-filed issues, reproducible seeds, replay exports, and CI results for diagnosis.

## Phase 7 — Follow-up releases

Sprint, Time Attack, seed-sharing UI, gamepad, authored solvable challenges, Extended pieces, and additional backgrounds each require their own acceptance tests. No backend or online ranking is implied. Keep old records identified by rules version when balance changes.

## Definition of done

- Source and docs are committed and available under GPL-3.0-only.
- Engine and browser checks pass, and build/package outputs are reproducible from a clean install.
- Public Pages deployment is checked; itch archive is ready and the live itch project is verified when account access is available.
- Real-device checks are either documented as completed or explicitly listed as pending. Do not equate emulation with physical-device verification.
