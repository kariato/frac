# FRAC-inspired spatial puzzle — game design document

Version 0.2 • 18 October 2026 • Working project name: Frac

Browser-first implementation specification. Desktop, tablet, and phone are first-release targets.

## 1. Product vision

Create a single-player, three-dimensional falling-block puzzle in which players arrange voxel pieces inside a well and clear complete horizontal layers. Preserve the appeal of spatial packing, rapid decisions, and mathematical imagery while adding configurable well dimensions, readable depth, deliberate difficulty progression, and useful practice tools.

The defining feature is that well shape changes the puzzle. A narrow shaft emphasizes careful stacking; a broad shallow basin emphasizes complete coverage; rectangular wells reward different placements from square wells. These should feel like distinct ways to play rather than cosmetic variations.

This document specifies a new game inspired by Frac. It is not a specification for an exact historical reproduction. Historical board dimensions, piece inventories, scoring, and rotations have not been established from the original executable. All numerical values below are proposed starting values for playtesting.

### Design pillars

1. Read the space immediately: empty cells, landing positions, and buried gaps must be legible.
2. Make placement matter: poor packing creates consequences, but controls should not create surprises.
3. Let geometry change strategy: width, depth, height, and piece families are first-class rules.
4. Support learning: practice and slow play are complete experiences.
5. Keep the challenge reproducible: deterministic rules, seeds, and replayable inputs.

### Audience and scope

Target players enjoy falling-block puzzles, spatial reasoning, and short score-driven sessions. Default runs should last roughly 5–15 minutes for an intermediate player. Practice is untimed.

Initial target: a static browser game using TypeScript, Vite, Three.js, and HTML/CSS controls. Keyboard, mouse, and touch are supported in the first release. Publish the same build to GitHub Pages and itch.io. The deterministic game core does not depend on the renderer.

MVP is local and single-player, and requires no runtime service after assets load. There is no service worker or offline-install promise. Accounts, online multiplayer, public leaderboards, and procedural campaigns are outside MVP.

## 2. Core game loop

1. Select a preset or configure a custom well.
2. Receive a piece above the playable volume.
3. Move it on the horizontal plane and rotate it around permitted axes.
4. Inspect the landing preview and next pieces.
5. Allow gravity to lower it, soft drop it, or hard drop it.
6. Lock it into the stack.
7. Remove every complete horizontal layer, score the placement, and compact remaining layers.
8. Spawn the next piece. Continue until the objective is met or the next piece cannot spawn.

No enemies, combat, or resource economy are required. The spatial puzzle is the game.

## 3. Coordinate system and board model

The well is a discrete grid of width W, depth D, and height H. Coordinates are integer cells: x from 0 to W−1, z from 0 to D−1, and y from 0 at the floor to H−1 at the top. Gravity moves toward negative y.

Four additional hidden rows above the well form the spawn buffer, y = H through H+3. Buffer cells participate in collision and top-out checks but do not count as clearable layers.

The board stores occupancy and a stable piece/color identifier for every settled cell. Active-piece cells are separate from settled cells. Render animation never changes authoritative board state.

### Valid placement

A piece placement is valid when all its cells are within horizontal bounds, at or above the floor, below the top of the spawn buffer, and do not intersect settled cells. A legal move is atomic: apply every cell or apply none.

### Layer clearing

A layer is full when all W×D cells at a playable y are occupied. Detect all full layers after locking, then remove them simultaneously. Shift each surviving horizontal layer downward by the number of removed layers below it.

Do not apply independent gravity to disconnected voxel clusters. Floating structures can remain after placement; clearing shifts whole layers. This keeps the puzzle deterministic and avoids an additional physics system.

### Top-out and end states

After a piece locks, resolve layer clears first. If any settled cell remains in the spawn buffer, the run ends. Otherwise spawn the next piece; an invalid spawn also ends the run. This permits a last-moment layer clear to rescue a placement that temporarily enters the buffer.

Sprint victory is evaluated after scoring the clear and before spawning the next piece. Timer expiration in Time Attack is processed at a simulation tick boundary; an unlocked piece contributes no points.

## 4. Well dimensions and presets

MVP supports rectangular wells. Custom limits are W = 3–10, D = 3–10, H = 8–24. Presets are curated configurations with independent score tables. These are proposed dimensions, not claims about Frac's original well.

| Preset       | W × D × H  | Intended experience                             |
| ------------ | ---------- | ----------------------------------------------- |
| Starter      | 4 × 4 × 12 | Low speed, compact board, short straight pieces |
| Standard     | 5 × 5 × 16 | Default spatial puzzle                          |
| Narrow Shaft | 3 × 3 × 20 | Little horizontal recovery room                 |
| Wide Basin   | 8 × 8 × 10 | Coverage planning and broad surfaces            |
| Corridor     | 3 × 8 × 14 | Directional packing and long lanes              |
| Tall Well    | 5 × 5 × 24 | More recovery space and longer runs             |

### Why dimensions matter

Width and depth determine how much coverage is needed for a clear and which orientations are useful. Height controls recovery room and time before top-out; it does not directly make layers easier to complete. A 3×8 well is strategically different from a 5×5 well despite similar layer area.

The setup screen shows the actual 3D well, dimensions, area, total cell capacity, piece family, and speed curve. Updating a dimension updates the preview immediately.

### Custom configuration

Expose width, depth, height, piece family, starting speed, speed progression, preview count, hold availability, rotation mode, and seed. Provide named save slots and a reset-to-preset action.

Changing a preset produces a Custom ruleset. Never compare custom scores directly with preset scores. Swapping W and D is also a different ruleset in MVP, even if geometrically equivalent, to keep identity and input mapping unambiguous.

Do not automatically scale piece size with well size. Instead offer explicit, compatible piece families and explain that small pieces in large wells create longer coverage cycles.

## 5. Pieces and random generation

Pieces are face-connected sets of unit cubes. Author their canonical coordinates in versioned data. Validate connectivity, cell uniqueness, orientation uniqueness, and compatibility at build time.

### Piece families

**Simple (default for every preset):** one cube, a two-cube straight bar, and a three-cube straight bar. No four-cube pieces, branches, zigzags, or compound 3D shapes appear in a new default run. A seeded bag deals one of each short straight piece before reshuffling.

**Simple + corner (optional custom setting):** adds one three-cube L to the Simple family. The tutorial uses this small L to teach rotation.

**Legacy Standard:** the earlier eight-tetracube catalog is retained internally only so existing saves and replay exports remain readable. It is no longer offered when starting a new game. Loading a named setup from the old family switches its new-game selection to Simple. Existing runs and records retain their original family identifiers; do not silently reinterpret their cubes or scores.

This is a deliberate simplicity change, not a claim that the original Frac catalog has been reproduced exactly.

### Compatibility

For every selected piece, require at least one legal orientation in an empty well under the chosen rotation rules. Reject incompatible configurations and identify the offending piece. The narrowest wells may disallow a straight tetracube under vertical-axis-only rules if no horizontal orientation fits.

Use full-axis rotations in the first release. Restricted-axis play is deferred until its piece family and spawn poses are separately designed.

### Randomizer

Use a seeded shuffle bag containing one of each piece in the chosen family. Shuffle with a versioned pseudorandom generator, exhaust the bag, then create the next. Maintain the upcoming queue independently of display settings.

Spawn each piece in a predetermined compatible orientation chosen from the ruleset, centered horizontally with a documented integer tie-break toward lower x and z. Its lowest cell begins at y = H. Do not adapt spawn orientation to the current stack.

Default preview count: three pieces. Default hold: enabled, once per active piece. Swapping resets position and orientation to spawn state; a collision ends the run. Hold becomes available again after a lock.

## 6. Movement, rotation, gravity, and locking

### Movement

Horizontal movement is one grid cell per action. Held movement uses a 160 ms initial delay and 60 ms repeat interval. These are adjustable accessibility preferences recorded in replay metadata, but they do not change scoring rules.

### Rotation

Offer quarter-turns around x, y, and z in full-axis mode. Use integer transforms around a piece-local integer origin; canonical orientation data is normalized and duplicates removed. Avoid floating-point collision math.

For MVP, blocked rotations fail in place: no wall kicks, floor kicks, or automatic translations. Show a short outline pulse and optional quiet sound. This is easy to explain and test. A later assisted-rotation option may add a documented kick table under a separate rules version.

### Gravity and speed

Simulation runs at 60 fixed ticks per second. Level L starts at 1. In Marathon, advance one level every eight cleared layers. Gravity interval in ticks is max(6, round(60 × 0.85^(L−1))). Thus level 1 falls approximately one cell per second and the fastest normal level falls one cell every 0.1 seconds.

Practice can disable gravity. Soft drop lowers the gravity interval to three ticks when that is faster than normal gravity. Hard drop moves to the lowest legal position and locks immediately.

### Lock delay

Contact starts a 500 ms lock timer. A successful horizontal move or rotation while grounded resets it, up to eight resets per piece. After eight resets, a grounded timer continues without further resets. If a legal move makes the piece airborne, suspend the grounded timer; preserve its remaining duration and reset count until contact resumes. Failed inputs never reset it.

Resolve commands in recorded order within a tick. Process player commands, gravity, lock expiration, clears, and spawn in that order. Paused time does not advance simulation.

## 7. Desktop, touch controls, and camera

The player rotates the view of a fixed well. Gravity remains vertical. An orthographic three-quarter camera has four stable azimuths and elevation constrained to 25–70 degrees above the floor. Drag the board to orbit; release snaps to the nearest side. Buttons turn the view by 90 degrees. Reset returns to the default 45-degree azimuth and approximately 33-degree elevation.

Movement follows the settled view. Each directional action resolves to exactly one horizontal grid-axis move, indicated by floor axes and the view marker. Rotation uses the same settled quadrant: Spin rotates around world vertical; Tip actions resolve to signed world x/z rotations. Replays store resolved commands, not screen-relative actions.

While dragging or snapping, piece movement, rotation, hold, and drop are suppressed; held-repeat state is cleared. Marathon gravity continues. Practice simulation automatically waits until the view settles. Discard blocked commands rather than queueing them. A fresh press is required to resume held movement. Reduced motion makes view snaps immediate.

| Key         | Action                                  |
| ----------- | --------------------------------------- |
| Arrow keys  | Move relative to settled view           |
| Q / E       | Spin around vertical axis               |
| A / D       | Tip around view-right horizontal axis   |
| W / S       | Tip around view-forward horizontal axis |
| Shift, held | Soft drop                               |
| Space       | Hard drop and lock                      |
| C           | Hold / swap                             |
| Z / X       | View left / right                       |
| R           | Reset view                              |
| V           | Toggle top-down inset                   |
| U           | Undo last placement in Practice         |
| Escape      | Pause                                   |

Every gameplay binding is remappable. Reject duplicate assignments. Keep Tab for normal focus navigation. Input fields and browser shortcuts retain their normal behavior. Capture gameplay keys only in the active game context; menus never move pieces.

### Touch and on-screen controls

The left cluster is a four-direction movement pad. The right cluster has six rotation buttons in three labeled pairs: Spin, Tip left/right, and Tip toward/away. A separate action row contains Hold, Soft Drop, and an emphasized Hard Drop. The camera toolbar contains View left/right, Reset, Inset, and Fullscreen. A persistent header exposes Pause. Practice exposes Undo beside the compact piece previews on smaller layouts.

Movement repeats after 160 ms, then every 60 ms. Both repeat values are adjustable. Rotation, hold, and hard drop activate once per fresh press. Soft drop lasts while held. Hard drop activates on release inside the button; releasing outside cancels. Use pointer capture and handle pointer cancellation, lost capture, focus loss, and pause. Support moving while holding Soft Drop. Starting orbit cancels gameplay holds.

Targets for gameplay touch buttons are at least 48 × 48 CSS pixels. Provide pressed states and accessible labels. Allow mirroring the two control clusters. Gestures are optional: every essential action is available as a visible button. Disable browser pan gestures on the board and controls only; menus remain scrollable.

### Responsive layouts

Desktop uses a central well with statistics and next-piece sidebars. Tablet landscape puts controls within thumb reach; portrait puts controls below the well. Phone portrait has a compact score strip, well, movement/rotation clusters, and action row. Phone landscape positions the well between side control zones. When sidebars collapse, show compact Hold and Next previews above the board.

Use actual container dimensions, including iframe size, rather than device names. Support at least 360 × 640 portrait and 640 × 360 landscape. Keep active play within the viewport without page scrolling. Menus and setup can scroll. Honor safe-area insets and dynamic viewport height. Orientation changes pause the run and require explicit resume after relayout. Fullscreen is optional; denial must not prevent play.

## 8. Readability, visuals, and audio

Use an orthographic three-quarter view by default. Keep the active piece visually dominant. Resize the camera to fit each well while preserving a minimum readable cell size; unusually large configurations should favor board space over decorative UI.

Required aids:

- A landing ghost showing the exact hard-drop destination, with depth-tested edges.
- A floor grid with grouped markings on large wells.
- A top-down inset displaying column heights and highlighting landing cells.
- A warning when a column reaches within four cells of the top.
- A selected-layer inspection overlay in Practice, including empty cells.
- Stable edge outlines and depth shading that remain readable without color.

Offer an X-ray view that makes settled cubes translucent while retaining cell edges. It must not hide the landing ghost. Test overlapping transparency carefully; if ambiguous, use a selected-depth slice rather than stacking many translucent surfaces.

Keep a low-contrast procedural mathematical background as an optional visual homage; a true Mandelbrot background is a possible future art refinement. Offer plain background, reduced motion, and disabled color cycling. Piece identity uses color plus edge/pattern cues; it must remain distinguishable for common color-vision differences.

Audio should confirm move, failed rotation, lock, layer clear, multi-layer clear, level change, and top-out. Prioritize clears over repeated movement sounds. Music and effects have separate volume controls. Every important audio cue has a visual equivalent.

## 9. Game modes

### Marathon — MVP

Survive and maximize score with progressive gravity. Uses preset-specific local records. Default: Standard well, Simple pieces (one cube and two/three-cube bars), three previews, hold, full-axis rotation.

### Practice — MVP

Choose any compatible configuration. Optional gravity, unlimited planning time, restart from seed, and undo one placement. Undo restores board, active piece, hold, queue, random state, timers, and score exactly. Practice records are separate from competitive modes.

### Layer Sprint — next release

Clear 20 layers as quickly as possible. Fixed selectable speed, no automatic level increases. Store best completion time per exact ruleset. A failed run records progress but is not a completed time.

### Time Attack — next release

Score as much as possible in five minutes. A fixed curve advances levels every 30 seconds, independently of clears. Pausing is allowed for local play and excludes paused time; any later public challenge must define its own pause policy.

### Puzzle Challenges — later

Authored starting stacks and fixed piece queues, with goals such as clearing a layer in six pieces or avoiding buried gaps. Every challenge must have a solver-verified solution. Support geometry-focused lessons rather than random impossible boards.

### Seed Challenge — later

Share a seed plus full ruleset and version. A daily challenge can be generated locally from a date, but a trusted global leaderboard requires a service and replay verification and is outside initial scope.

## 10. Scoring and records

Proposed Marathon/Time Attack scoring:

For a lock clearing n layers, award 100 × n² × L points, where L is the level before the clear. Add 50 × c × L if it continues a clear streak, where c is zero for the first consecutive clearing piece, one for the next, and so on. A placement clearing nothing resets c.

Soft drop awards one point per manually descended cell; hard drop awards two per cell. Award these only for actual downward motion, never for gravity or failed moves. No speed-of-thought bonus in MVP: clear feedback and quality placement take priority.

Example: at level 2, a two-layer clear scores 800 points. If it is the second consecutive clearing placement, add 100. A hard drop of five cells adds ten, for 910 total.

Different well sizes and families have separate records. Do not claim a formula can fairly normalize all geometries. Include rules version, mode, dimensions, piece catalog, gravity curve, starting level, rotation mode, hold, previews, and assists in the canonical ruleset identifier. The seed is stored with the run but is not itself a separate Marathon leaderboard.

Store score, cleared layers, elapsed active time, pieces placed, maximum occupied height, seed, and replay reference. Display clear rate and average placement time as learning statistics rather than ranking criteria.

## 11. Progression and onboarding

All well presets and customization are available immediately. Progression teaches rather than gates essential features.

First-run tutorial:

1. Move a single cube to a marked floor cell without gravity.
2. Rotate a bent piece into a target position.
3. Use the ghost and top-down inset to predict a landing.
4. Complete a prepared layer.
5. Discover why covering a gap can make later packing difficult.
6. Try slow gravity, hold, and hard drop.

Each step is restartable and skippable. Instructions show current bindings. The tutorial ends by offering Starter or Standard, with a short explanation of the difference.

Optional milestones recognize first clear, first multi-layer clear, first Sprint completion, and play across different well shapes. Cosmetic unlocks may be considered later; do not add power-ups that alter the underlying fairness of score modes.

## 12. Screens and user flows

**Home:** Continue suspended run, Play, Practice, Records, Settings. Continue only appears when a compatible snapshot exists.

**Play setup:** preset cards, interactive well preview, mode, piece family, concise difficulty explanation, Advanced configuration, Start. Changing dimensions must never silently reset unrelated settings.

**In game:** board occupies most space; score, level, layers, and mode objective sit together; hold and next queue are adjacent to the board. Place pause and accessibility controls consistently.

**Pause:** Resume, Controls, Settings, Restart, Quit to home. Restart and Quit require an inline confirmation when they discard an active run. Changing gameplay rules requires a new run; audio, visuals, and bindings apply immediately.

**Results:** outcome, score or time, record status, layers, placements, seed, rules summary, Retry same seed, New run, Home. A top-out result highlights the collision area and allows inspection before dismissing the board.

**Records:** filter by preset and mode, with Custom in its own area. Include rules version so balance updates do not silently overwrite incomparable records.

## 13. Accessibility and comfort

- Adjustable key repeat and remappable controls, including left-handed layouts.
- Reduced motion, plain backgrounds, no required flashes, and adjustable effect intensity.
- High-contrast outlines, non-color piece cues, and scalable interface text.
- Pause on window focus loss, with explicit input required to resume.
- Optional slower fixed-speed play and unlimited-time Practice.
- Camera reset always available; no forced camera motion during a placement.
- Menus usable by keyboard with visible focus and accessible labels.

The 3D board will need dedicated research for nonvisual accessibility. Do not describe the MVP as fully screen-reader accessible merely because its menus are labeled.

## 14. Technical architecture

### Modules

1. Rules engine: board, pieces, collision, rotations, gravity, locking, clears, scoring, and end states.
2. Session controller: modes, setup validation, pause, restart, snapshots, and results.
3. Input adapter: physical keys to tick-indexed semantic commands.
4. Renderer: board projection, camera, meshes, ghost, overlays, and animation.
5. Interface: menus, HUD, settings, tutorial, and records.
6. Persistence: schema-versioned settings, runs, records, and replay storage.

### State and replay

Authoritative state contains ruleset ID, tick, board, active piece position/orientation, hold, queue, bag/PRNG state, gravity accumulator, lock state, score, streak, level, cleared layers, and mode objective state.

Replay header stores engine/rules version, full canonical configuration, and seed. Events store simulation tick and semantic command in array order, which supplies same-tick ordering. Store the final state checksum for verification. A renderer must be able to rebuild an identical board by replaying these events headlessly.

### Rendering and performance

Render settled voxels using instancing or equivalent batching. Cache edges or use a technique that avoids drawing every internal face. Update the ghost only when the active placement or board changes. The maximum board has 2,400 playable cells; optimize for stable performance at that scale before adding effects.

Target 60 fps on the selected reference laptop, with simulation correctness independent of frame rate. Use real-device release testing to establish supported performance; automated emulation does not establish hardware frame rates. Cap catch-up work after long stalls and auto-pause instead of simulating an unseen top-out.

### Saving

Persist on lock, pause, and settings changes. Use IndexedDB for snapshots, records, and custom setups; localStorage holds preferences. Provide JSON export/import for transfer between hosts, which have separate storage origins. A snapshot resumes at a well-defined simulation tick, paused. Handle unavailable storage with a visible session-only notice. Validate schemas and bounds before loading. Keep incompatible saves available for export instead of attempting silent migration.

Local records are convenience features and are user-editable. Public score trust is a separate future system.

## 15. Verification and playtest plan

### Rules correctness

Test all authored orientations, four repeated quarter-turns, collision at every boundary, failed movement atomicity, hard-drop destination, simultaneous clears, whole-layer compaction, post-clear top-out, invalid spawn, hold collision, lock resets, pause/resume, and seeded bag consistency.

Use property tests where useful: legal transforms preserve voxel count; no locked cells overlap; clear compaction preserves surviving cell order; replaying the same commands produces the same checksum. Test the complete preset matrix and minimum/maximum custom dimensions.

### Usability playtests

Recruit new and experienced falling-block players. Ask players to predict a landing before dropping, identify an enclosed gap, explain a failed rotation, and complete the tutorial. Observe errors rather than only asking for preferences.

Initial acceptance targets: at least 80% of first-time testers complete the tutorial unaided; at least 90% correctly predict ten sampled ghost landings; no tester loses because camera rotation unexpectedly changes controls. Treat these as product targets requiring an adequate sample, not evidence already collected.

Compare Standard, Narrow Shaft, Wide Basin, and Corridor using survival time, clears per minute, top-out causes, camera usage, and reported readability. Adjust piece distribution or speed only after distinguishing difficulty from poor visibility.

### Failure and edge cases

Test focus loss while dropping, stuck key release after resume, browser resize, low frame rate, disabled storage, corrupted snapshots, rapid restart, incompatible catalogs, timers ending during lock delay, and a clear occurring on the same tick as objective completion.

## 16. Delivery phases and exit criteria

### Phase 1: rules prototype

Implement headless core, piece validation, seeded randomization, custom rectangular wells, layer clears, gravity, locking, scoring, and replay. Exit when correctness tests pass and replay checksums match across repeated runs.

### Phase 2: playable MVP

Add 3D rendering, keyboard and touch controls, view-relative input, ghost, camera, top-down inset, six presets, Marathon, Practice, interactive tutorial, settings, snapshots, backup transfer, and local records. Exit when every preset is playable, maximum dimensions remain readable, and save/resume reproduces state.

### Phase 3: usability and balance

Run structured playtests, improve depth cues and onboarding, tune speed and presets, verify accessibility options, and document a stable rules version. Exit when major interpretation errors are addressed and performance meets the reference-device target.

### Phase 4: expanded modes

Add Sprint, Time Attack, seed sharing, authored puzzles, and gamepad support. Consider Extended pieces only after confirming that standard pieces and wide wells are enjoyable.

No calendar estimate is implied until implementation technology, team capacity, and asset requirements are chosen.

## 17. Risks and decisions still open

| Risk or question                           | Proposed response                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Buried gaps are hard to see                | Ghost, height inset, outlines, and Practice inspection                                      |
| Many controls overwhelm beginners          | Staged tutorial, binding hints, optional restricted rotation mode                           |
| Large wells become slow chores             | Compare larger families and shorter objectives in later playtests                           |
| Narrow wells are incompatible with pieces  | Validate every configuration before starting                                                |
| Height alone creates long, dull runs       | Tune mode objectives and gravity separately from dimensions                                 |
| Assistance changes challenge               | Include mechanical assists in rules identity; keep camera and contrast preferences cosmetic |
| Transparency obscures depth                | Prefer outlines and selectable slices if X-ray fails testing                                |
| Historical assumptions become requirements | Maintain a separate historical research log; label new rules explicitly                     |

Chosen defaults: working title Frac; clean geometric visual style; TypeScript/Vite/Three.js; full-axis rotation; GPL-3.0-only; public kariato/frac repository; static GitHub Pages and itch.io builds. Open future work: final numerical balance through playtests, reference hardware measurements, restricted rotation catalogs, Extended pieces, and any online features.

## 18. Historical references and boundaries

- MobyGames, Frac overview and credits: https://www.mobygames.com/game/2930/frac/ — DOS release dated 1990; Simsalabim Software; Per Bergland and Max Shapiro; Mandelbrot background.
- Original instruction screen reproduced by KCU: https://kcuniversal.net/video-gaming/scipgnimag/0016-03-pc-frac-tetris-3d.jpg — packing blocks, moving and rotating, drop controls, layer bonuses, speed progression, and next-piece toggle.
- KCU retrospective: https://kcuniversal.net/video-gaming/computer-gaming-reviews/pc-frac-tetris-3d — screenshots and discussion of controls and difficulty.

The recreated instruction screen is the strongest source here for original controls. None of these sources establishes an exact original piece catalog or a complete rules algorithm. This project should use original code, branding, artwork, and audio. Historical assets are research references, not production assets.
