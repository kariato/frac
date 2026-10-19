# frac.

**A different dimension of falling blocks.** A browser-based spatial puzzle inspired by Frac (1990), with a rotatable well, six well shapes, custom dimensions, and keyboard/touch controls.

Play: **https://kariato.github.io/frac/** · [Design](GAME_DESIGN.md) · [Implementation phases](IMPLEMENTATION_PLAN.md) · [Verification](TESTING.md)

## Play

Pack falling voxel pieces into the well. Fill an entire horizontal layer to clear it. Keep the stack below the rim.

- **Geometric blocks by default:** short bars, flat 2×2 / 3×3 / 4×4 squares, solid 2×2×2 / 3×3×3 cubes, and a 2×2×3 block. Pieces that cannot fit the well are omitted. Falling speed is now 2×; old saves retain their original rules.
- **Mostly small pieces:** about 91% are one to four cubes. Larger blocks become progressively rarer by volume; the 3×3×3 cube appears about once per 300 pieces.
- **Marathon:** increasing gravity and local scores per ruleset.
- **Practice:** optional gravity, one-placement undo, and layer inspection.
- Choose Starter, Standard, Narrow Shaft, Wide Basin, Corridor, Tall Well, or customize width/depth (3–10) and height (8–24).
- Drag the well to orbit; release snaps to one of four views. Movement follows the settled view. Marathon gravity continues during orbit; Practice waits.

| Controls     | Action                        |
| ------------ | ----------------------------- |
| Arrows       | Move relative to current view |
| Q / E        | Spin                          |
| A / D, W / S | Tip on horizontal axes        |
| Shift        | Soft drop while held          |
| Space        | Hard drop                     |
| C            | Hold                          |
| Z / X        | View left/right               |
| R / V        | Reset view / top-down inset   |
| U            | Practice undo                 |
| Escape       | Pause                         |

On touch screens, use the movement pad, rotation pairs, action row, and camera toolbar. Keyboard bindings, on-screen buttons, handedness, contrast, and motion preferences are configurable in Settings. Use the interactive tour to learn.

Progress saves locally. Pages and itch.io do **not** share browser storage. Use Settings → Export backup / Import backup to move progress. No account, tracking, or server API is required. Fullscreen is optional; WebGL 2 is required.

## Development

Use **Node 24 LTS** and npm. Node 23 is not supported by the current test runner.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npx playwright install chromium
npm run test:browser
npm run build
npm run package
```

The dev server prints a local network URL for testing on a physical phone/tablet. Use a browser with WebGL 2 enabled. `npm run package` produces `release/frac-0.1.0-html5.zip` and a source archive when run from a committed checkout. Serve `dist/` over HTTP rather than opening index.html as a file.

## Architecture

- `src/engine.ts`: deterministic fixed-tick grid, catalogs, scoring, saves, undo, replay.
- `src/view.ts`: Three.js rendering, camera, view mapping, piece previews, inset.
- `src/main.ts`: session UI, keyboard/Pointer Events input, tutorial, responsive flows.
- `src/storage.ts`: versioned local data, preferences, synthesized sound.
- `tests/`: engine invariants and desktop/mobile browser flows.

The engine receives resolved world-axis commands; rendering and camera changes do not change game state. Replay events use ticks and array ordering. No wall kicks or floating-point collision math.

## Hosting

GitHub Actions builds and deploys `main` to GitHub Pages. Releases also produce an HTML5 ZIP with relative asset paths. For itch.io, create an **HTML Game**, upload the ZIP, select the playable upload, choose click-to-launch/fullscreen, and enable Mobile Friendly after physical-device checks. Detailed steps are in [HOSTING.md](HOSTING.md).

## License and credits

GPL-3.0-only. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Original project code, graphics, and synthesized audio are covered by the project license. Three.js retains its MIT license.

Inspired by Frac by Per Bergland and Max Shapiro / Simsalabim Software (1990). This is an independent implementation; no original game code, artwork, or audio is included.

v0.1.0 is a prerelease until the physical-device and hosted itch.io checks in TESTING.md are complete. Sprint, Time Attack, gamepad, online leaderboards, and installable offline support are future work.
