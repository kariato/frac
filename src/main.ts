// SPDX-License-Identifier: GPL-3.0-only
import "./style.css";
import {
  Engine,
  PRESETS,
  CATALOGS,
  index,
  landing,
  rulesId,
  validateConfig,
  worldCells,
  type Axis,
  type GameConfig,
  type GameCommand,
  type Mode,
} from "./engine";
import { BoardView, previewSvg, viewVector } from "./view";
import {
  DEFAULT_BINDINGS,
  DEFAULT_SETTINGS,
  loadSettings,
  Sound,
  Storage,
  validateSettings,
  type RecordEntry,
} from "./storage";

const cube =
  '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 12 7v13l-12 7-12-7V10Zm0 0v13m12-6-12 6-12-6m12 6v14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const icons: Record<string, string> = {
  pause: "Ⅱ",
  settings: "⚙",
  left: "←",
  right: "→",
  forward: "↑",
  back: "↓",
  spinLeft: "↶",
  spinRight: "↷",
  tipLeft: "↶",
  tipRight: "↷",
  tipForward: "↶",
  tipBack: "↷",
  soft: "↓",
  drop: "⇓",
  hold: "⇄",
  cameraLeft: "↶",
  cameraRight: "↷",
  reset: "⌂",
  inset: "▦",
  undo: "↶",
};
const actionNames: Record<string, string> = {
  left: "Move left",
  right: "Move right",
  forward: "Move away",
  back: "Move toward",
  spinLeft: "Spin left",
  spinRight: "Spin right",
  tipLeft: "Tip left",
  tipRight: "Tip right",
  tipForward: "Tip away",
  tipBack: "Tip toward",
  soft: "Soft drop",
  drop: "Hard drop",
  hold: "Hold piece",
  cameraLeft: "View left",
  cameraRight: "View right",
  reset: "Reset view",
  inset: "Top-down view",
  undo: "Undo placement",
  pause: "Pause",
};
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function button(action: string, label = actionNames[action], extra = "") {
  return `<button type="button" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icons[action] || ""}<span>${label}</span></button>`;
}
$("#app").innerHTML = `
  <header class="topbar"><a class="brand" href="#" aria-label="Frac home">${cube}<span>frac<span class="brand-dot">.</span></span><small>A DIFFERENT DIMENSION</small></a><nav aria-label="Main"><button id="how-button">How to play <span>↗</span></button><button id="records-button">Records</button><button id="settings-button" aria-label="Settings">${icons.settings}</button><button id="pause-button" hidden>Ⅱ <span>Pause</span></button></nav></header>
  <main class="workspace" data-screen="home">
    <section class="setup-panel" aria-label="Game setup">
      <div class="eyebrow"><span class="status-dot"></span> A SPATIAL FALLING-BLOCK PUZZLE</div>
      <h1>Make space.<br><em>Find your flow.</em></h1><p class="intro">A familiar idea. One more dimension.<br>Arrange the pieces. Clear a layer. Keep going.</p>
      <div class="section-label">01 <span>CHOOSE YOUR WELL</span><button id="custom-toggle">Customize ↗</button></div>
      <div id="presets" class="presets"></div>
      <div id="custom-panel" hidden>
        <div class="dimensions"><label>Width<input id="width" type="number" min="3" max="10" value="5"></label><span>×</span><label>Depth<input id="depth" type="number" min="3" max="10" value="5"></label><span>×</span><label>Height<input id="height" type="number" min="8" max="24" value="16"></label></div>
        <label class="field">Pieces<select id="family"><option value="simple">Simple · cube and short bars</option><option value="foundation">Simple + corner · adds a small L</option></select></label>
        <div class="form-pair"><label class="field">Starting level<input id="start-level" type="number" min="1" max="20" value="1"></label><label class="field">Next pieces<select id="previews"><option>3</option><option>2</option><option>1</option><option>0</option></select></label></div>
        <label class="field">Seed <span class="muted">optional</span><input id="seed" type="text" maxlength="10" inputmode="numeric" placeholder="Random each run"></label><label class="check"><input id="hold-enabled" type="checkbox" checked> Allow hold</label>
        <div class="form-pair"><button id="save-preset" class="subtle">Save setup</button><button id="reset-preset" class="subtle">Reset preset</button></div><select id="saved-configs" aria-label="Saved setups"><option value="">Load a saved setup…</option></select>
      </div>
      <div class="section-label mode-heading">02 <span>FIND YOUR PACE</span></div>
      <div class="mode-select"><button data-mode="marathon" aria-pressed="true">Marathon<small>Build your best score</small></button><button data-mode="practice" aria-pressed="false">Practice<small>No rush. Just possibilities.</small></button></div>
      <label id="gravity-field" class="check" hidden><input id="gravity" type="checkbox"> Enable gravity in Practice</label>
      <button id="start-button" class="primary">Enter the well <span>↗</span></button><button id="continue-button" class="continue" hidden>Continue your last run →</button>
    </section>
    <section class="session-panel" hidden aria-label="Run statistics">
      <div class="eyebrow" id="session-mode">MARATHON / STANDARD</div><h1 class="session-title">One piece<br>at a time.</h1>
      <div class="score-block"><span class="section-label">SCORE</span><strong id="score">000000</strong><small id="best-score">YOUR SPACE TO THINK</small></div>
      <div class="stats"><div><span>LAYERS</span><strong id="layers">00</strong></div><div><span>LEVEL</span><strong id="level">01</strong></div><div><span>TIME</span><strong id="time">0:00</strong></div></div>
      <div class="progress-heading"><span>NEXT LEVEL</span><span id="progress-text">0 / 8 layers</span></div><div class="progress-track"><div id="progress"></div></div>
      <div class="hold-section"><div class="section-label">HOLD <kbd>C</kbd></div><div id="hold-preview" class="piece-preview"></div></div>
      <div class="run-note">Fill an entire horizontal layer.<br>Good things happen when it all fits.</div>
      <div class="session-actions"><button id="restart-button">↶ Restart</button><button id="home-button">↗ New setup</button></div>
    </section>
    <section class="stage-section" aria-label="Well">
      <div class="stage-top"><div><span class="status-dot"></span><span id="stage-label">LIVE PREVIEW</span></div><span id="well-size">5 × 5 × 16</span></div>
      <div id="mobile-piece-strip" hidden></div>
      <div id="board" tabindex="0" role="application" aria-label="Frac game. Arrow keys move; Space drops. Open How to play for all controls."></div>
      <div class="axis-marker" aria-hidden="true"><span id="view-label">VIEW 01</span><b>↗ <span id="axis-label">X / Z</span></b></div>
      <div class="stage-caption" id="stage-caption"><span>SPACE TO THINK.</span><small>Drag to explore your next challenge</small></div>
      <div id="play-message" class="play-message" role="status" aria-live="polite"></div>
      <div class="camera-bar" aria-label="Camera controls">${button("cameraLeft", "View left")}${button("reset", "Reset view")}${button("cameraRight", "View right")}<i></i>${button("inset", "Top-down view")}<button id="fullscreen" aria-label="Fullscreen" title="Fullscreen">⛶</button></div>
      <div id="inset-panel" hidden><div class="section-label">TOP / COLUMN HEIGHT</div><canvas id="inset-canvas" aria-label="Top-down column heights"></canvas><label id="slice-field" hidden>Inspect layer <input id="slice" type="range" min="-1" max="15" value="-1"><output id="slice-value">All</output></label></div>
      <div id="tutorial-panel" hidden><div class="eyebrow" id="tutorial-number">LEARN / 01</div><h2 id="tutorial-title"></h2><p id="tutorial-text"></p><div><button id="tutorial-skip" class="subtle">Skip tutorial</button><button id="tutorial-next" class="primary">Next →</button></div></div>
    </section>
    <aside class="right-panel">
      <div id="home-aside"><div class="tiny-cube">${cube}</div><div class="eyebrow">A LITTLE PERSPECTIVE</div><h2>Same pieces.<br>New possibilities.</h2><p>Rotate your view.<br>Discover the space between.<br>There’s more than one way to fit in.</p><div class="well-facts"><div><span>FOOTPRINT</span><strong id="footprint">25 cells</strong></div><div><span>CAPACITY</span><strong id="capacity">400 cubes</strong></div></div><button id="tutorial-button">First time? Take a little tour <span>→</span></button></div>
      <div id="next-aside" hidden><div class="section-label">COMING UP <span id="next-count">03</span></div><div id="next-pieces"></div><div class="keyboard-guide"><span class="section-label">AT YOUR FINGERTIPS</span><p><kbd>↑ ↓ ← →</kbd> Move</p><p><kbd>Q E</kbd> Spin</p><p><kbd>A D / W S</kbd> Tip</p><p><kbd>SPACE</kbd> Drop</p><button class="link-button" id="all-controls">All controls ↗</button></div>${button("undo", "Undo placement", 'id="undo-button" hidden')}</div>
    </aside>
    <section id="touch-controls" class="touch-controls" aria-label="On-screen game controls" hidden>
      <div class="movement-cluster"><div class="control-label">MOVE</div><div class="dpad">${button("forward")}${button("left")}${button("back")}${button("right")}</div></div>
      <div class="rotation-cluster"><div class="control-label">ROTATE PIECE</div><div class="rotation-row"><label>Spin</label>${button("spinLeft")}${button("spinRight")}</div><div class="rotation-row"><label>Tip ↔</label>${button("tipLeft")}${button("tipRight")}</div><div class="rotation-row"><label>Tip ↕</label>${button("tipForward")}${button("tipBack")}</div></div>
      <div class="drop-cluster">${button("hold", "Hold")}${button("soft", "Soft drop")}${button("drop", "Hard drop")}</div>
    </section>
  </main>
  <footer><span>INSPIRED BY FRAC, 1990 <span class="footer-cross">+</span> REIMAGINED FOR A NEW PERSPECTIVE</span><a href="https://github.com/kariato/frac" target="_blank" rel="noopener">OPEN SOURCE <span>↗</span></a><span title="Build ${__BUILD_COMMIT__}">v0.1.0</span></footer>
  <div id="toast" role="status" aria-live="polite"></div>
  <dialog id="modal"><div class="modal-head"><span class="eyebrow" id="modal-eyebrow">FRAC</span><button id="close-modal" aria-label="Close dialog">×</button></div><div id="modal-content"></div></dialog>
  <input id="import-file" type="file" accept="application/json,.json" hidden>
`;

let settings = loadSettings(),
  selected = 1,
  mode: Mode = "marathon",
  custom = false,
  playing = false,
  paused = false,
  dragging = false,
  tutorial = -1,
  tutorialDone = false,
  inset = false,
  slice = -1;
let engine: Engine,
  preview: Engine,
  view: BoardView | undefined,
  saved: ReturnType<Engine["snapshot"]> | undefined,
  lastHud = "",
  lastSaveRevision = -1,
  finished = false;
let toastTimer: ReturnType<typeof setTimeout>,
  messageTimer: ReturnType<typeof setTimeout>;
const notify = (message: string) => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 5000);
};
const store = new Storage(notify),
  sound = new Sound();
function readConfig(): GameConfig {
  const p = PRESETS[selected];
  const seedInput = $<HTMLInputElement>("#seed").value.trim();
  if (seedInput && !/^\d{1,10}$/.test(seedInput))
    throw new Error("Seed must be an integer from 0 to 4294967295.");
  return validateConfig({
    width: custom ? +$<HTMLInputElement>("#width").value : p.width,
    depth: custom ? +$<HTMLInputElement>("#depth").value : p.depth,
    height: custom ? +$<HTMLInputElement>("#height").value : p.height,
    family: custom ? $<HTMLSelectElement>("#family").value : p.family,
    mode,
    seed: seedInput
      ? Number(seedInput)
      : crypto.getRandomValues(new Uint32Array(1))[0],
    gravity: mode === "marathon" || $<HTMLInputElement>("#gravity").checked,
    startLevel: custom ? +$<HTMLInputElement>("#start-level").value : 1,
    previews: custom ? +$<HTMLSelectElement>("#previews").value : 3,
    hold: custom ? $<HTMLInputElement>("#hold-enabled").checked : true,
  });
}
function configLabel(c: GameConfig) {
  const preset = PRESETS.find(
    (p) =>
      p.width === c.width &&
      p.depth === c.depth &&
      p.height === c.height &&
      p.family === c.family,
  );
  return preset && !custom ? preset.name : "Custom";
}
function loadFields(c: GameConfig) {
  for (const key of ["width", "depth", "height"] as const)
    $<HTMLInputElement>(`#${key}`).value = String(c[key]);
  $<HTMLSelectElement>("#family").value =
    c.family === "standard" ? "simple" : c.family;
  $<HTMLInputElement>("#start-level").value = String(c.startLevel);
  $<HTMLSelectElement>("#previews").value = String(c.previews);
  $<HTMLInputElement>("#hold-enabled").checked = c.hold;
  $<HTMLInputElement>("#seed").value = String(c.seed);
  $<HTMLInputElement>("#gravity").checked = c.gravity;
}
function refreshSetup() {
  $("#presets").innerHTML = PRESETS.map(
    (p, i) =>
      `<button class="preset ${selected === i && !custom ? "selected" : ""}" data-preset="${i}" aria-pressed="${selected === i && !custom}"><span class="preset-icon">${cube}</span><span><strong>${p.name}</strong><small>${p.width} × ${p.depth} × ${p.height}</small></span><span class="preset-dot"></span></button>`,
  ).join("");
  try {
    const c = readConfig();
    preview = new Engine(c);
    view?.update(preview.state, true);
    $("#well-size").textContent = `${c.width} × ${c.depth} × ${c.height}`;
    $("#footprint").textContent = `${c.width * c.depth} cells`;
    $("#capacity").textContent = `${c.width * c.depth * c.height} cubes`;
    $<HTMLButtonElement>("#start-button").disabled = false;
  } catch {
    $<HTMLButtonElement>("#start-button").disabled = true;
  }
}
try {
  view = new BoardView($("#board"), () => {
    if (playing) pause();
    notify(
      "Graphics were interrupted. Your run is paused; resume after recovery or reload your saved run.",
    );
  });
} catch {
  $("#board").innerHTML =
    '<div class="graphics-error"><h2>A little graphics help needed.</h2><p>FRAC needs WebGL 2. Try an updated browser with hardware acceleration enabled.</p></div>';
  $<HTMLButtonElement>("#start-button").disabled = true;
}
function applySettings() {
  document.body.classList.toggle("reduced-motion", settings.reduced);
  document.body.classList.toggle("high-contrast", settings.contrast);
  document.body.classList.toggle("mirror-controls", settings.mirror);
  view?.setOptions(settings.reduced, settings.fractal, settings.contrast);
  sound.settings = settings;
  sound.music(playing && !paused);
  $("#touch-controls").hidden = !playing || !settings.controls;
}
refreshSetup();
applySettings();
void store.get<ReturnType<Engine["snapshot"]>>("snapshot").then((data) => {
  if (data) {
    try {
      Engine.restore(data);
      saved = data;
      $("#continue-button").hidden = false;
    } catch {
      notify(
        "An older save cannot be resumed. You can still export it from Settings.",
      );
    }
  }
});
async function refreshSavedConfigs() {
  const values = await store.configs();
  $("#saved-configs").innerHTML =
    '<option value="">Load a saved setup…</option>' +
    values
      .map((v, i) => `<option value="${i}">${escape(v.name)}</option>`)
      .join("");
}
void refreshSavedConfigs();

function message(text: string) {
  $("#play-message").textContent = text;
  $("#play-message").classList.add("visible");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(
    () => $("#play-message").classList.remove("visible"),
    1800,
  );
}
function begin(instance?: Engine) {
  if (!view) return;
  try {
    engine = instance || new Engine(readConfig());
  } catch (e) {
    notify((e as Error).message);
    return;
  }
  playing = true;
  paused = false;
  finished = false;
  lastHud = "";
  lastSaveRevision = -1;
  tutorial = -1;
  slice = -1;
  $(".workspace").dataset.screen = "game";
  $(".setup-panel").hidden = true;
  $(".session-panel").hidden = false;
  $("#home-aside").hidden = true;
  $("#next-aside").hidden = false;
  $("#pause-button").hidden = false;
  $("#stage-caption").hidden = true;
  $("#tutorial-panel").hidden = true;
  $("#stage-label").textContent = "IN THE WELL";
  $("#well-size").textContent =
    `${engine.state.config.width} × ${engine.state.config.depth} × ${engine.state.config.height}`;
  $("#mobile-piece-strip").hidden = false;
  $("#undo-button").hidden = engine.state.config.mode !== "practice";
  $("#slice-field").hidden = engine.state.config.mode !== "practice";
  $<HTMLInputElement>("#slice").max = String(engine.state.config.height - 1);
  $<HTMLInputElement>("#slice").value = "-1";
  view.reset();
  view.render();
  clearInputs();
  sound.unlock();
  applySettings();
  view.update(engine.state);
  updateHud();
  $("#board").focus({ preventScroll: true });
  void save();
}
function goHome() {
  playing = false;
  paused = false;
  tutorial = -1;
  clearInputs();
  sound.music(false);
  $(".workspace").dataset.screen = "home";
  $(".setup-panel").hidden = false;
  $(".session-panel").hidden = true;
  $("#home-aside").hidden = false;
  $("#next-aside").hidden = true;
  $("#pause-button").hidden = true;
  $("#stage-caption").hidden = false;
  $("#tutorial-panel").hidden = true;
  $("#touch-controls").hidden = true;
  $("#mobile-piece-strip").hidden = true;
  $("#inset-panel").hidden = true;
  inset = false;
  $("#stage-label").textContent = "LIVE PREVIEW";
  view?.reset();
  refreshSetup();
}
async function save() {
  if (!playing || tutorial >= 0) return;
  const snapshot = engine.snapshot();
  saved = structuredClone(snapshot);
  await store.set("snapshot", snapshot);
  $("#continue-button").hidden = false;
}
function time(ticks: number) {
  const sec = Math.floor(ticks / 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
function updateHud() {
  if (!playing) return;
  const s = engine.state;
  const k = JSON.stringify([
    s.score,
    s.layers,
    s.level,
    Math.floor(s.tick / 60),
    s.active.id,
    s.held,
    s.canHold,
    s.queue,
    s.placements,
    s.over,
  ]);
  if (k !== lastHud) {
    lastHud = k;
    $("#score").textContent = String(s.score).padStart(6, "0");
    $("#layers").textContent = String(s.layers).padStart(2, "0");
    $("#level").textContent = String(s.level).padStart(2, "0");
    $("#time").textContent = time(s.tick);
    $("#session-mode").textContent =
      `${s.config.mode.toUpperCase()} / ${configLabel(s.config).toUpperCase()}`;
    $("#progress-text").textContent = `${s.layers % 8} / 8 layers`;
    $("#progress").style.width = `${((s.layers % 8) / 8) * 100}%`;
    $("#hold-preview").innerHTML = previewSvg(s.config.family, s.held);
    $("#hold-preview").classList.toggle("unavailable", !s.canHold);
    $("#next-pieces").innerHTML =
      s.queue
        .slice(0, s.config.previews)
        .map(
          (id, i) =>
            `<div class="next-piece"><span>0${i + 1}</span>${previewSvg(s.config.family, id)}</div>`,
        )
        .join("") || '<p class="muted">No previews in this setup.</p>';
    $("#next-count").textContent = String(s.config.previews).padStart(2, "0");
    const undo = $<HTMLButtonElement>("#undo-button");
    undo.disabled = !engine.undoState;
    $("#mobile-piece-strip").innerHTML =
      `<div class="mini-hold ${s.canHold ? "" : "unavailable"}"><span>HOLD</span>${previewSvg(s.config.family, s.held)}</div><div class="mini-next"><span>NEXT</span>${s.queue
        .slice(0, s.config.previews)
        .map((id) => previewSvg(s.config.family, id))
        .join(
          "",
        )}</div>${s.config.mode === "practice" ? '<button id="mobile-undo" aria-label="Undo placement">↶</button>' : ""}`;
    const mobileUndo = document.getElementById("mobile-undo");
    if (mobileUndo) mobileUndo.onclick = () => action("undo");
  }
  view?.update(s);
  if (inset) view?.drawInset($<HTMLCanvasElement>("#inset-canvas"), s, slice);
  if (s.revision !== lastSaveRevision) {
    lastSaveRevision = s.revision;
    if (s.lastClear) {
      message(
        `${s.lastClear} ${s.lastClear === 1 ? "LAYER" : "LAYERS"} CLEARED +`,
      );
      sound.tone("clear");
    } else if (s.placements) sound.tone("lock");
    void save();
  }
  if (s.over && !finished) {
    finished = true;
    clearInputs();
    sound.tone("over");
    sound.music(false);
    void store.record(engine, configLabel(s.config));
    void store.remove("snapshot");
    saved = undefined;
    $("#continue-button").hidden = true;
    setTimeout(() => showResults(), 350);
  }
}
const held = new Map<string, { next: number; pointer?: number }>();
function clearInputs() {
  held.clear();
  if (engine?.state.softDrop)
    engine.command({ type: "softDrop", active: false });
  document
    .querySelectorAll(".pressed")
    .forEach((e) => e.classList.remove("pressed"));
}
function canCommand() {
  return (
    playing &&
    !paused &&
    !engine.state.over &&
    !view?.cameraState.orbiting &&
    !dragging &&
    !$("#modal").hasAttribute("open")
  );
}
function resolved(action: string): GameCommand | undefined {
  const q = view?.cameraState.quadrant || 0;
  const moves: Record<string, [number, number]> = {
    left: [-1, 0],
    right: [1, 0],
    forward: [0, -1],
    back: [0, 1],
  };
  if (moves[action]) {
    const [dx, dz] = viewVector(q, ...moves[action]);
    return { type: "move", dx, dz };
  }
  if (action === "drop") return { type: "hardDrop" };
  if (action === "hold") return { type: "hold" };
  if (action === "soft") return { type: "softDrop", active: true };
  if (action === "spinLeft" || action === "spinRight")
    return {
      type: "rotate",
      axis: "y",
      direction: action === "spinLeft" ? -1 : 1,
    };
  if (["tipLeft", "tipRight", "tipForward", "tipBack"].includes(action)) {
    const [x, z] = viewVector(
      q,
      ...((action === "tipLeft" || action === "tipRight" ? [1, 0] : [0, 1]) as [
        number,
        number,
      ]),
    );
    return {
      type: "rotate",
      axis: (x ? "x" : "z") as Axis,
      direction: ((action === "tipLeft" || action === "tipForward" ? -1 : 1) *
        (x || z)) as 1 | -1,
    };
  }
}
function action(name: string) {
  if (name === "pause") {
    if (playing) pause();
    return;
  }
  if (["cameraLeft", "cameraRight", "reset"].includes(name)) {
    if (paused || $("#modal").hasAttribute("open")) return;
    clearInputs();
    if (name === "reset") view?.reset();
    else view?.orbit(name === "cameraLeft" ? -1 : 1);
    checkTutorial("orbit");
    return;
  }
  if (name === "inset") {
    inset = !inset;
    $("#inset-panel").hidden = !inset;
    if (inset && playing)
      view?.drawInset(
        $<HTMLCanvasElement>("#inset-canvas"),
        engine.state,
        slice,
      );
    return;
  }
  if (!canCommand()) return;
  if (name === "undo") {
    if (engine.undo()) {
      lastSaveRevision = -1;
      updateHud();
      message("PLACEMENT UNDONE");
    }
    return;
  }
  const cmd = resolved(name);
  if (!cmd) return;
  const success = engine.command(cmd);
  sound.tone(success ? "move" : "fail");
  if (!success) {
    $("#board").classList.remove("blocked");
    void $("#board").offsetWidth;
    $("#board").classList.add("blocked");
  }
  if (success) checkTutorial(cmd.type);
  updateHud();
}
function holdStart(name: string, pointer?: number) {
  if (!canCommand()) return;
  action(name);
  if (["left", "right", "forward", "back"].includes(name))
    held.set(name, { next: performance.now() + settings.repeatDelay, pointer });
  else if (name === "soft") held.set(name, { next: Infinity, pointer });
}
function holdEnd(name: string) {
  held.delete(name);
  if (name === "soft" && engine?.state.softDrop)
    engine.command({ type: "softDrop", active: false });
}
let remapAction: string | undefined;
document.addEventListener("keydown", (e) => {
  if (remapAction) {
    e.preventDefault();
    if (e.code === "Escape") {
      remapAction = undefined;
      showSettings();
      return;
    }
    if (
      Object.values(settings.bindings).includes(e.code) &&
      settings.bindings[remapAction] !== e.code
    ) {
      notify("That key is already assigned. Choose another key.");
      return;
    }
    const candidate = {
      ...settings,
      bindings: { ...settings.bindings, [remapAction]: e.code },
    };
    const validated = validateSettings(candidate);
    if (validated.bindings[remapAction] !== e.code) {
      notify("Choose a letter, arrow, digit, or standard control key.");
      return;
    }
    settings = validated;
    store.settings(settings);
    remapAction = undefined;
    showSettings();
    return;
  }
  const target = e.target as HTMLElement;
  if (
    target.matches("input,select,textarea") ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey
  )
    return;
  if ($("#modal").hasAttribute("open")) return;
  const name = Object.entries(settings.bindings).find(
    ([, code]) => code === e.code,
  )?.[0];
  if (!name) return;
  if (playing && target.closest("button,a") && name !== "pause") return;
  if (
    !playing &&
    !["cameraLeft", "cameraRight", "reset", "inset"].includes(name)
  )
    return;
  e.preventDefault();
  if (e.repeat) return;
  if (["left", "right", "forward", "back", "soft"].includes(name))
    holdStart(name);
  else action(name);
});
document.addEventListener("keyup", (e) => {
  const name = Object.entries(settings.bindings).find(
    ([, code]) => code === e.code,
  )?.[0];
  if (name) holdEnd(name);
});
document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((b) => {
  const name = b.dataset.action!;
  let pointer: number | undefined;
  b.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    pointer = e.pointerId;
    b.classList.add("pressed");
    sound.unlock();
    if (["left", "right", "forward", "back", "soft"].includes(name))
      holdStart(name, e.pointerId);
    else if (name !== "drop") action(name);
  });
  b.addEventListener("pointerup", (e) => {
    if (pointer !== e.pointerId) return;
    const r = b.getBoundingClientRect();
    if (
      name === "drop" &&
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    )
      action(name);
    holdEnd(name);
    b.classList.remove("pressed");
    pointer = undefined;
  });
  for (const event of ["pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => {
      holdEnd(name);
      b.classList.remove("pressed");
      pointer = undefined;
    });
  b.addEventListener("click", (e) => {
    if (e.detail === 0) action(name);
  });
});
let dragPointer: number | undefined,
  lastX = 0,
  lastY = 0;
$("#board").addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || paused || $("#modal").hasAttribute("open")) return;
  dragPointer = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  $("#board").setPointerCapture(e.pointerId);
  clearInputs();
  dragging = true;
  if (view) view.cameraState.orbiting = true;
});
$("#board").addEventListener("pointermove", (e) => {
  if (dragPointer !== e.pointerId) return;
  view?.drag(e.clientX - lastX, e.clientY - lastY);
  lastX = e.clientX;
  lastY = e.clientY;
});
function endDrag() {
  if (dragPointer === undefined) return;
  dragPointer = undefined;
  dragging = false;
  view?.snap();
  checkTutorial("orbit");
}
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("#board").addEventListener(event, endDrag);

function modal(title: string, content: string, eyebrow = "FRAC") {
  clearInputs();
  $("#modal-eyebrow").textContent = eyebrow;
  $("#modal-content").innerHTML = `<h2>${title}</h2>${content}`;
  if (!$<HTMLDialogElement>("#modal").open)
    $<HTMLDialogElement>("#modal").showModal();
}
function closeModal() {
  remapAction = undefined;
  $<HTMLDialogElement>("#modal").close();
  if (playing && !engine.state.over) {
    paused = false;
    sound.music(true);
    $("#board").focus({ preventScroll: true });
  }
}
$("#close-modal").addEventListener("click", closeModal);
$("#modal").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeModal();
});
function pause() {
  if (!playing || engine.state.over) return;
  paused = true;
  clearInputs();
  sound.music(false);
  void save();
  modal(
    "A little breathing room.",
    `<p>Your well will be right here.</p><button id="resume" class="primary">Back to the well →</button><div class="modal-actions"><button id="pause-settings">Settings</button><button id="pause-export">Export backup</button><button id="pause-home">New setup</button></div>`,
    "PAUSED",
  );
  $("#resume").onclick = closeModal;
  $("#pause-settings").onclick = showSettings;
  $("#pause-export").onclick = () => void exportBackup();
  $("#pause-home").onclick = () => confirmDiscard(goHome);
}
function confirmDiscard(next: () => void) {
  paused = true;
  clearInputs();
  sound.music(false);
  modal(
    "Start fresh?",
    `<p>This ends the current run. Your local records stay saved.</p><div class="modal-actions"><button id="cancel-discard">Keep playing</button><button id="confirm-discard" class="primary">Start fresh →</button></div>`,
  );
  $("#cancel-discard").onclick = closeModal;
  $("#confirm-discard").onclick = () => {
    void store.remove("snapshot");
    saved = undefined;
    $("#continue-button").hidden = true;
    closeModal();
    next();
  };
}
function showResults() {
  if (!playing) return;
  paused = true;
  modal(
    "There’s always another way.",
    `<p>The well is full. Take a breath, then find a new perspective.</p><div class="result-score">${engine.state.score.toLocaleString()}<small>POINTS</small></div><div class="result-stats"><span>${engine.state.layers} layers</span><span>${engine.state.placements} pieces</span><span>${time(engine.state.tick)}</span></div><p class="muted">${escape(configLabel(engine.state.config))} · Seed ${engine.state.config.seed}</p><button class="primary" id="retry">Same seed. Fresh start. →</button><div class="modal-actions"><button id="new-run">New seed</button><button id="results-home">Choose a well</button><button id="export-replay">Export replay</button></div>`,
    "RUN COMPLETE",
  );
  $("#retry").onclick = () => {
    const c = { ...engine.state.config };
    closeModal();
    begin(new Engine(c));
  };
  $("#new-run").onclick = () => {
    const c = {
      ...engine.state.config,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    };
    closeModal();
    begin(new Engine(c));
  };
  $("#results-home").onclick = () => {
    closeModal();
    goHome();
  };
  $("#export-replay").onclick = () =>
    download("frac-replay.json", engine.replay());
}
function formatKey(code: string) {
  return code
    .replace("Key", "")
    .replace("Digit", "")
    .replace("Arrow", "")
    .replace("ShiftLeft", "Shift")
    .replace("Space", "Space");
}
function showSettings() {
  if (playing) {
    paused = true;
    clearInputs();
    sound.music(false);
  }
  modal(
    "Make yourself at home.",
    `<div class="settings-grid"><label class="check"><input type="checkbox" data-setting="controls" ${settings.controls ? "checked" : ""}> On-screen controls</label><label class="check"><input type="checkbox" data-setting="mirror" ${settings.mirror ? "checked" : ""}> Mirror control clusters</label><label class="check"><input type="checkbox" data-setting="reduced" ${settings.reduced ? "checked" : ""}> Reduced motion</label><label class="check"><input type="checkbox" data-setting="contrast" ${settings.contrast ? "checked" : ""}> High contrast</label><label class="check"><input type="checkbox" data-setting="fractal" ${settings.fractal ? "checked" : ""}> Mathematical background</label><label class="field">Effects<input type="range" min="0" max="1" step=".05" data-setting="effects" value="${settings.effects}"></label><label class="field">Ambient sound<input type="range" min="0" max="1" step=".05" data-setting="music" value="${settings.music}"></label><label class="field">Repeat delay (ms)<input type="number" min="80" max="500" data-setting="repeatDelay" value="${settings.repeatDelay}"></label><label class="field">Repeat interval (ms)<input type="number" min="30" max="200" data-setting="repeatInterval" value="${settings.repeatInterval}"></label></div><h3>Keyboard bindings</h3><p class="muted">Select a key to reassign it. Escape cancels reassignment.</p><div class="bindings">${Object.keys(
      DEFAULT_BINDINGS,
    )
      .map(
        (k) =>
          `<button data-bind="${k}"><span>${actionNames[k]}</span><kbd>${formatKey(settings.bindings[k])}</kbd></button>`,
      )
      .join(
        "",
      )}</div><button id="reset-bindings" class="subtle">Reset keyboard bindings</button><h3>Take your progress with you</h3><p class="muted">GitHub Pages and itch.io store progress separately. Export here and import on the other site.</p><div class="modal-actions"><button id="export-backup">Export backup</button><button id="import-backup">Import backup</button></div><p class="license-note">FRAC v0.1.0 · GPL-3.0-only · <a href="https://github.com/kariato/frac" target="_blank" rel="noopener">Source code ↗</a><br>An independent game inspired by Frac (1990), by Per Bergland and Max Shapiro. Original code, graphics, and synthesized audio.</p>`,
    "SETTINGS",
  );
  document
    .querySelectorAll<HTMLInputElement>("[data-setting]")
    .forEach((input) =>
      input.addEventListener("change", () => {
        const key = input.dataset.setting!;
        settings = validateSettings({
          ...settings,
          [key]:
            input.type === "checkbox" ? input.checked : Number(input.value),
        });
        store.settings(settings);
        sound.unlock();
        applySettings();
        if (paused) sound.music(false);
      }),
    );
  document.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach(
    (b) =>
      (b.onclick = () => {
        remapAction = b.dataset.bind;
        b.querySelector("kbd")!.textContent = "Press a key…";
      }),
  );
  $("#reset-bindings").onclick = () => {
    settings.bindings = { ...DEFAULT_BINDINGS };
    store.settings(settings);
    showSettings();
  };
  $("#export-backup").onclick = () => void exportBackup();
  $("#import-backup").onclick = () =>
    $<HTMLInputElement>("#import-file").click();
}
async function showRecords() {
  if (playing) {
    paused = true;
    clearInputs();
    sound.music(false);
  }
  const records = (await store.get<RecordEntry[]>("records")) || [];
  modal(
    "A little personal history.",
    `<p>Local Marathon records. Different well rules have separate best scores.</p><label class="field">Well<select id="record-filter"><option value="all">All wells</option>${PRESETS.map((p) => `<option>${p.name}</option>`).join("")}<option>Custom</option></select></label><div id="record-list"></div>`,
    "YOUR RECORDS",
  );
  const draw = () => {
    const filter = $<HTMLSelectElement>("#record-filter").value;
    const seen = new Set<string>();
    const best = records.filter((r) => {
      if (seen.has(r.rules)) return false;
      seen.add(r.rules);
      return filter === "all" || r.label === filter;
    });
    $("#record-list").innerHTML = best.length
      ? best
          .map(
            (r) =>
              `<div class="record"><div><strong>${escape(r.label)}</strong><small>${escape(r.rules)}<br>${r.layers} layers · ${time(r.ticks)} · seed ${r.seed}</small></div><b>${r.score.toLocaleString()}</b></div>`,
          )
          .join("")
      : '<div class="empty-state">Your first record is still ahead of you.<br>Play Marathon to make your mark.</div>';
  };
  draw();
  $("#record-filter").onchange = draw;
}
function showHelp() {
  if (playing) {
    paused = true;
    clearInputs();
    sound.music(false);
  }
  modal(
    "A familiar idea. Another axis.",
    `<p>Move and rotate each falling piece inside the well. Fill every cell in a horizontal layer to clear it. Keep the stack below the rim.</p><ol class="help-list"><li><b>See where it fits.</b> The outlined ghost shows exactly where a hard drop will land.</li><li><b>Change your perspective.</b> Drag the well, or use Z / X. Your view snaps to four sides; movement follows that side.</li><li><b>Take your time.</b> Practice has no gravity by default and lets you undo your last placement.</li></ol><p class="muted">In Marathon, gravity continues while you rotate the view. Piece controls wait until the view settles. Touch buttons do the same jobs as keyboard keys.</p><div class="bindings">${Object.entries(
      settings.bindings,
    )
      .map(
        ([a, k]) =>
          `<div><span>${actionNames[a]}</span><kbd>${formatKey(k)}</kbd></div>`,
      )
      .join(
        "",
      )}</div><button id="help-tour" class="primary">Try the interactive tour →</button>`,
    "HOW TO PLAY",
  );
  $("#help-tour").onclick = () => {
    if (playing && !engine.state.over) confirmDiscard(startTutorial);
    else {
      closeModal();
      startTutorial();
    }
  };
}
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportBackup() {
  download("frac-backup.json", {
    format: "frac-backup",
    version: 1,
    settings,
    snapshot:
      playing && tutorial < 0 ? engine.snapshot() : await store.get("snapshot"),
    records: (await store.get("records")) || [],
    configs: await store.configs(),
  });
}
$<HTMLInputElement>("#import-file").addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 20_000_000)
      throw new Error("Backup is too large (maximum 20 MB).");
    const data = JSON.parse(await file.text());
    if (data.format !== "frac-backup" || data.version !== 1)
      throw new Error("Choose a version 1 Frac backup.");
    const importedSettings = validateSettings(data.settings);
    const restored = data.snapshot ? Engine.restore(data.snapshot) : undefined;
    if (
      !Array.isArray(data.records) ||
      data.records.length > 100 ||
      !Array.isArray(data.configs) ||
      data.configs.length > 20
    )
      throw new Error("Invalid record or preset data.");
    for (const r of data.records)
      if (
        typeof r.label !== "string" ||
        r.label.length > 100 ||
        typeof r.rules !== "string" ||
        r.rules.length > 300 ||
        !Number.isSafeInteger(r.score) ||
        r.score < 0 ||
        !Number.isSafeInteger(r.layers) ||
        r.layers < 0 ||
        !Number.isSafeInteger(r.ticks) ||
        r.ticks < 0
      )
        throw new Error("Invalid record.");
    for (const c of data.configs) {
      validateConfig(c.config);
      if (typeof c.name !== "string" || c.name.length > 40)
        throw new Error("Invalid saved setup.");
    }
    modal(
      "Bring this progress here?",
      `<p>This replaces saved settings, records, setups, and the suspended run on this site.</p><div class="modal-actions"><button id="cancel-import">Cancel</button><button id="confirm-import" class="primary">Import backup →</button></div>`,
      "IMPORT BACKUP",
    );
    $("#cancel-import").onclick = showSettings;
    $("#confirm-import").onclick = async () => {
      settings = importedSettings;
      store.settings(settings);
      await store.set("records", data.records);
      await store.set("configs", data.configs);
      if (restored) {
        await store.set("snapshot", restored.snapshot());
        saved = restored.snapshot();
      } else {
        await store.remove("snapshot");
        saved = undefined;
      }
      closeModal();
      goHome();
      $("#continue-button").hidden = !saved;
      applySettings();
      void refreshSavedConfigs();
      notify("Backup imported. Resume the saved run or start fresh.");
    };
  } catch (error) {
    notify((error as Error).message);
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
});

const lessons = [
  [
    "Find your footing.",
    "Use the arrows or movement pad to move a piece across the floor. No gravity here.",
    "move",
  ],
  [
    "Give it a turn.",
    "Use Spin or Tip to rotate the bent piece. Q / E, A / D, and W / S work too.",
    "rotate",
  ],
  [
    "Another perspective.",
    "Drag the well or use View left / right. When the view settles, movement follows your new side.",
    "orbit",
  ],
  [
    "Make it all fit.",
    "One cell is missing from this layer. The ghost marks it. Press Hard drop or Space to complete the layer.",
    "hardDrop",
  ],
  [
    "Leave room below.",
    "Covering a gap makes it harder to fill later. The top-down view shows column heights; Practice also lets you inspect individual layers.",
    "read",
  ],
  [
    "A second chance.",
    "Use Hold to set a piece aside, then Hard drop. In Practice, Undo takes you back one placement.",
    "hold",
  ],
];
function startTutorial() {
  closeModal();
  begin(
    new Engine({
      width: 4,
      depth: 4,
      height: 8,
      family: "foundation",
      mode: "practice",
      seed: 1,
      gravity: false,
      startLevel: 1,
      previews: 3,
      hold: true,
    }),
  );
  tutorial = 0;
  $("#tutorial-panel").hidden = false;
  prepareLesson();
  settings.controls = true;
  applySettings();
}
function prepareLesson() {
  const s = engine.state;
  const lesson = lessons[tutorial];
  tutorialDone = lesson[2] === "read";
  $("#tutorial-number").textContent = `LEARN / 0${tutorial + 1} OF 06`;
  $("#tutorial-title").textContent = lesson[0];
  $("#tutorial-text").textContent = lesson[1];
  $<HTMLButtonElement>("#tutorial-next").disabled = !tutorialDone;
  $("#tutorial-next").textContent =
    tutorial === 5 ? "Choose your well →" : "Next →";
  s.board.fill(0);
  s.over = false;
  s.active = {
    id: 3,
    cells: structuredClone(CATALOGS.foundation[3]),
    position: [1, 4, 1],
  };
  s.revision++;
  if (tutorial === 3) {
    for (let z = 0; z < 4; z++)
      for (let x = 0; x < 4; x++)
        if (x !== 1 || z !== 1) s.board[index(s.config, x, 0, z)] = 2;
    s.active = { id: 0, cells: [[0, 0, 0]], position: [1, 4, 1] };
  }
  if (tutorial === 4) {
    s.board[index(s.config, 0, 1, 0)] = 3;
    s.board[index(s.config, 1, 1, 0)] = 3;
    s.board[index(s.config, 1, 0, 0)] = 3;
  }
  updateHud();
}
function checkTutorial(type: string) {
  if (tutorial < 0) return;
  if (lessons[tutorial][2] === type) {
    tutorialDone = true;
    $<HTMLButtonElement>("#tutorial-next").disabled = false;
  }
}
$("#tutorial-next").onclick = () => {
  if (!tutorialDone) return;
  if (tutorial === 5) {
    goHome();
    notify("You’re ready. Choose a well and find your flow.");
  } else {
    tutorial++;
    prepareLesson();
  }
};
$("#tutorial-skip").onclick = goHome;

$("#presets").onclick = (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-preset]",
  );
  if (!b) return;
  selected = Number(b.dataset.preset);
  custom = false;
  const p = PRESETS[selected];
  loadFields({
    ...preview.state.config,
    ...p,
    seed: 1,
    startLevel: 1,
    previews: 3,
    hold: true,
  });
  $<HTMLInputElement>("#seed").value = "";
  refreshSetup();
};
$("#custom-toggle").onclick = () => {
  const panel = $("#custom-panel");
  panel.hidden = !panel.hidden;
  $("#custom-toggle").textContent = panel.hidden ? "Customize ↗" : "Close ↙";
};
$("#custom-panel").addEventListener("input", () => {
  custom = true;
  refreshSetup();
});
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode as Mode;
      document
        .querySelectorAll("[data-mode]")
        .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
      $("#gravity-field").hidden = mode !== "practice";
      refreshSetup();
    }),
);
$("#reset-preset").onclick = () => {
  custom = false;
  loadFields({
    ...preview.state.config,
    ...PRESETS[selected],
    startLevel: 1,
    previews: 3,
    hold: true,
  });
  $<HTMLInputElement>("#seed").value = "";
  refreshSetup();
};
$("#save-preset").onclick = () => {
  try {
    const config = readConfig();
    modal(
      "Name your setup.",
      `<label class="field">Name<input id="preset-name" maxlength="40" value="My ${config.width} × ${config.depth} well"></label><button id="confirm-save-preset" class="primary">Save setup →</button>`,
    );
    $("#confirm-save-preset").onclick = async () => {
      const name = $<HTMLInputElement>("#preset-name").value.trim();
      if (!name) return;
      const configs = await store.configs();
      configs.unshift({ name, config });
      await store.set("configs", configs.slice(0, 20));
      void refreshSavedConfigs();
      closeModal();
      notify("Setup saved.");
    };
  } catch (e) {
    notify((e as Error).message);
  }
};
$("#saved-configs").onchange = async () => {
  const value = $<HTMLSelectElement>("#saved-configs").value;
  if (value === "") return;
  const configs = await store.configs();
  const config = configs[Number(value)].config;
  loadFields(config);
  custom = true;
  mode = config.mode;
  document
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.mode === mode)),
    );
  $("#gravity-field").hidden = mode !== "practice";
  refreshSetup();
};
$("#start-button").onclick = () => begin();
$("#continue-button").onclick = () => {
  try {
    if (saved) {
      begin(Engine.restore(saved));
      pause();
    }
  } catch (e) {
    notify((e as Error).message);
  }
};
$("#restart-button").onclick = () =>
  confirmDiscard(() => begin(new Engine({ ...engine.state.config })));
$("#home-button").onclick = () => confirmDiscard(goHome);
$("#settings-button").onclick = showSettings;
$("#records-button").onclick = () => void showRecords();
$("#how-button").onclick = showHelp;
$("#all-controls").onclick = showHelp;
$("#tutorial-button").onclick = startTutorial;
$("#pause-button").onclick = pause;
$(".brand").onclick = (e) => {
  e.preventDefault();
  if (playing && !engine.state.over) confirmDiscard(goHome);
  else goHome();
};
$("#slice").oninput = () => {
  slice = +$<HTMLInputElement>("#slice").value;
  $("#slice-value").textContent = slice < 0 ? "All" : String(slice + 1);
  if (playing)
    view?.drawInset($<HTMLCanvasElement>("#inset-canvas"), engine.state, slice);
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else
      notify(
        "Fullscreen is managed by your browser. The game also works in this view.",
      );
  } catch {
    notify(
      "Fullscreen isn’t available here. You can keep playing in this view.",
    );
  }
};
window.addEventListener("blur", () => {
  endDrag();
  clearInputs();
  if (playing && !paused) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing && !paused) pause();
});
screen.orientation?.addEventListener("change", () => {
  endDrag();
  clearInputs();
  if (playing) pause();
});
let last = performance.now(),
  accumulator = 0;
function frame(now: number) {
  const dt = now - last;
  last = now;
  if (dt > 1000) {
    accumulator = 0;
    if (playing && !paused) pause();
  }
  const orbiting = view?.cameraState.orbiting || dragging;
  if (
    playing &&
    !paused &&
    !engine.state.over &&
    !(engine.state.config.mode === "practice" && orbiting)
  ) {
    accumulator += Math.min(dt, 100);
    while (accumulator >= 1000 / 60) {
      engine.step();
      accumulator -= 1000 / 60;
    }
    if (!orbiting)
      for (const [name, heldAction] of held)
        if (now >= heldAction.next) {
          action(name);
          heldAction.next = now + settings.repeatInterval;
        }
    updateHud();
  } else accumulator = 0;
  view?.render(dragging);
  $("#board").setAttribute(
    "aria-busy",
    String(view?.cameraState.orbiting || dragging),
  );
  const q = (((view?.cameraState.quadrant || 0) % 4) + 4) % 4;
  $("#view-label").textContent = `VIEW 0${q + 1}`;
  $("#axis-label").textContent = ["X / Z", "−Z / X", "−X / −Z", "Z / −X"][q];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
