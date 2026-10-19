// SPDX-License-Identifier: GPL-3.0-only
// Integer-only rules. No DOM, renderer, clocks, or browser storage dependencies.
export type Vec = [number, number, number];
export type Axis = "x" | "y" | "z";
export type Family = "simple" | "foundation" | "standard";
export type Mode = "marathon" | "practice";
export interface GameConfig {
  width: number;
  depth: number;
  height: number;
  family: Family;
  mode: Mode;
  seed: number;
  gravity: boolean;
  startLevel: number;
  previews: number;
  hold: boolean;
}
export interface Piece {
  id: number;
  cells: Vec[];
  position: Vec;
}
export type GameCommand =
  | { type: "move"; dx: number; dz: number }
  | { type: "rotate"; axis: Axis; direction: 1 | -1 }
  | { type: "hardDrop" }
  | { type: "hold" }
  | { type: "softDrop"; active: boolean };
export interface GameState {
  config: GameConfig;
  board: number[];
  active: Piece;
  queue: number[];
  bag: number[];
  rng: number;
  held: number | null;
  canHold: boolean;
  tick: number;
  score: number;
  layers: number;
  level: number;
  placements: number;
  streak: number;
  fallTicks: number;
  lockTicks: number;
  resets: number;
  softDrop: boolean;
  over: boolean;
  revision: number;
  lastClear: number;
}
export interface ReplayEvent {
  tick: number;
  command: GameCommand;
}
export interface Replay {
  version: 1;
  config: GameConfig;
  events: ReplayEvent[];
  endTick: number;
  checksum: string;
}
export const RULES_VERSION = 1;
export const PRESETS = [
  {
    name: "Starter",
    width: 4,
    depth: 4,
    height: 12,
    family: "simple",
    note: "Find your footing",
    tag: "LEARN",
  },
  {
    name: "Standard",
    width: 5,
    depth: 5,
    height: 16,
    family: "simple",
    note: "The original challenge",
    tag: "CLASSIC",
  },
  {
    name: "Narrow Shaft",
    width: 3,
    depth: 3,
    height: 20,
    family: "simple",
    note: "Every cell counts",
    tag: "PRECISE",
  },
  {
    name: "Wide Basin",
    width: 8,
    depth: 8,
    height: 10,
    family: "simple",
    note: "Room to think bigger",
    tag: "EXPLORE",
  },
  {
    name: "Corridor",
    width: 3,
    depth: 8,
    height: 14,
    family: "simple",
    note: "A different perspective",
    tag: "UNUSUAL",
  },
  {
    name: "Tall Well",
    width: 5,
    depth: 5,
    height: 24,
    family: "simple",
    note: "Play the long game",
    tag: "ENDURE",
  },
] as const;
export function rotateCells(cells: Vec[], axis: Axis, d: number): Vec[] {
  return cells.map(([x, y, z]) =>
    axis === "x"
      ? [x, -d * z, d * y]
      : axis === "y"
        ? [d * z, y, -d * x]
        : [-d * y, d * x, z],
  );
}
function normalize(cells: Vec[]): Vec[] {
  const min = [0, 1, 2].map((a) => Math.min(...cells.map((c) => c[a])));
  return cells
    .map((c) => c.map((v, a) => v - min[a]) as Vec)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}
const key = (cells: Vec[]) => JSON.stringify(normalize(cells));
export function orientations(cells: Vec[]): Vec[][] {
  const found = new Map<string, Vec[]>();
  const work = [normalize(cells)];
  while (work.length) {
    const current = work.pop()!;
    const k = key(current);
    if (found.has(k)) continue;
    found.set(k, current);
    for (const axis of ["x", "y", "z"] as Axis[])
      work.push(normalize(rotateCells(current, axis, 1)));
  }
  return [...found.values()];
}
function canonical(cells: Vec[]): string {
  return orientations(cells).map(key).sort()[0];
}
function tetracubes(): Vec[][] {
  let shapes: Vec[][] = [[[0, 0, 0]]];
  for (let size = 2; size <= 4; size++) {
    const next = new Map<string, Vec[]>();
    for (const shape of shapes)
      for (const [x, y, z] of shape)
        for (const [dx, dy, dz] of [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ]) {
          const cell: Vec = [x + dx, y + dy, z + dz];
          if (shape.some((c) => c.every((v, i) => v === cell[i]))) continue;
          const k = canonical([...shape, cell]);
          next.set(k, JSON.parse(k));
        }
    shapes = [...next.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, v]) => v);
  }
  return shapes;
}
export const CATALOGS: Record<Family, Vec[][]> = {
  // Default play deliberately uses only short straight pieces.
  simple: [
    [[0, 0, 0]],
    [
      [0, 0, 0],
      [1, 0, 0],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ],
  ],
  foundation: [
    [[0, 0, 0]],
    [
      [0, 0, 0],
      [1, 0, 0],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
  ],
  standard: tetracubes(),
};
export function validateConfig(value: unknown): GameConfig {
  const c = value as GameConfig;
  if (
    !c ||
    !Number.isInteger(c.width) ||
    c.width < 3 ||
    c.width > 10 ||
    !Number.isInteger(c.depth) ||
    c.depth < 3 ||
    c.depth > 10 ||
    !Number.isInteger(c.height) ||
    c.height < 8 ||
    c.height > 24 ||
    !["simple", "foundation", "standard"].includes(c.family) ||
    !["marathon", "practice"].includes(c.mode) ||
    !Number.isInteger(c.seed) ||
    c.seed < 0 ||
    c.seed > 0xffffffff ||
    !Number.isInteger(c.startLevel) ||
    c.startLevel < 1 ||
    c.startLevel > 20 ||
    !Number.isInteger(c.previews) ||
    c.previews < 0 ||
    c.previews > 3 ||
    typeof c.hold !== "boolean" ||
    typeof c.gravity !== "boolean"
  )
    throw new Error("Invalid game configuration.");
  return {
    width: c.width,
    depth: c.depth,
    height: c.height,
    family: c.family,
    mode: c.mode,
    seed: c.seed,
    gravity: c.gravity,
    startLevel: c.startLevel,
    previews: c.previews,
    hold: c.hold,
  };
}
export function index(c: GameConfig, x: number, y: number, z: number) {
  return (y * c.depth + z) * c.width + x;
}
export function worldCells(p: Piece): Vec[] {
  return p.cells.map((c) => c.map((v, i) => v + p.position[i]) as Vec);
}
export function valid(s: GameState, piece: Piece): boolean {
  const c = s.config;
  return worldCells(piece).every(
    ([x, y, z]) =>
      x >= 0 &&
      x < c.width &&
      z >= 0 &&
      z < c.depth &&
      y >= 0 &&
      y < c.height + 4 &&
      !s.board[index(c, x, y, z)],
  );
}
export function landing(s: GameState): Piece {
  const p = structuredClone(s.active);
  while (
    valid(s, {
      ...p,
      position: [p.position[0], p.position[1] - 1, p.position[2]],
    })
  )
    p.position[1]--;
  return p;
}
export function clearLayers(s: GameState): number {
  const { width: w, depth: d, height: h } = s.config;
  const area = w * d;
  const surviving: number[] = [];
  let cleared = 0;
  for (let y = 0; y < h + 4; y++) {
    const row = s.board.slice(y * area, (y + 1) * area);
    if (y < h && row.every((v) => v !== 0)) cleared++;
    else surviving.push(...row);
  }
  s.board = surviving.concat(Array(cleared * area).fill(0));
  return cleared;
}
function rng(s: GameState): number {
  let x = s.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rng = x >>> 0;
  return s.rng / 4294967296;
}
function next(s: GameState): number {
  if (!s.bag.length) {
    s.bag = CATALOGS[s.config.family].map((_, i) => i);
    for (let i = s.bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng(s) * (i + 1));
      [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]];
    }
  }
  return s.bag.pop()!;
}
function spawn(s: GameState, id: number) {
  const c = s.config;
  // Choose a low, fitting canonical pose deterministically, independent of the stack.
  const candidates = orientations(CATALOGS[c.family][id]).filter(
    (cs) =>
      Math.max(...cs.map((v) => v[0])) < c.width &&
      Math.max(...cs.map((v) => v[2])) < c.depth,
  );
  candidates.sort(
    (a, b) =>
      Math.max(...a.map((v) => v[1])) - Math.max(...b.map((v) => v[1])) ||
      (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0),
  );
  const cells = candidates[0];
  const width = Math.max(...cells.map((v) => v[0])) + 1,
    depth = Math.max(...cells.map((v) => v[2])) + 1;
  s.active = {
    id,
    cells: structuredClone(cells),
    position: [
      Math.floor((c.width - width) / 2),
      c.height,
      Math.floor((c.depth - depth) / 2),
    ],
  };
  s.fallTicks = 0;
  s.lockTicks = 0;
  s.resets = 0;
  s.softDrop = false;
  s.canHold = true;
  if (!valid(s, s.active)) s.over = true;
}
export function newState(config: GameConfig): GameState {
  const c = validateConfig(config);
  const s: GameState = {
    config: c,
    board: Array(c.width * c.depth * (c.height + 4)).fill(0),
    active: { id: 0, cells: [], position: [0, 0, 0] },
    queue: [],
    bag: [],
    rng: c.seed || 0x9e3779b9,
    held: null,
    canHold: true,
    tick: 0,
    score: 0,
    layers: 0,
    level: c.startLevel,
    placements: 0,
    streak: -1,
    fallTicks: 0,
    lockTicks: 0,
    resets: 0,
    softDrop: false,
    over: false,
    revision: 0,
    lastClear: 0,
  };
  for (let i = 0; i < 4; i++) s.queue.push(next(s));
  spawn(s, s.queue.shift()!);
  s.queue.push(next(s));
  return s;
}
export function rulesId(c: GameConfig): string {
  return `v${RULES_VERSION}:${c.mode}:${c.width}x${c.depth}x${c.height}:${c.family}:L${c.startLevel}:g${+c.gravity}:p${c.previews}:h${+c.hold}`;
}
export function checksum(s: GameState): string {
  let h = 2166136261;
  for (const ch of JSON.stringify(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
export class Engine {
  state: GameState;
  events: ReplayEvent[] = [];
  undoState: GameState | null = null;
  private startOfPiece: GameState;
  private startEventCount = 0;
  private undoEventCount = 0;
  constructor(config: GameConfig) {
    this.state = newState(config);
    this.startOfPiece = structuredClone(this.state);
  }
  private lock() {
    const s = this.state;
    this.undoState = structuredClone(this.startOfPiece);
    this.undoEventCount = this.startEventCount;
    for (const [x, y, z] of worldCells(s.active))
      s.board[index(s.config, x, y, z)] = s.active.id + 1;
    const count = clearLayers(s);
    s.lastClear = count;
    s.placements++;
    if (count) {
      s.streak++;
      s.score += 100 * count * count * s.level + 50 * s.streak * s.level;
      s.layers += count;
    } else s.streak = -1;
    s.level = s.config.startLevel + Math.floor(s.layers / 8);
    s.revision++;
    const area = s.config.width * s.config.depth;
    if (s.board.slice(s.config.height * area).some(Boolean)) {
      s.over = true;
      return;
    }
    spawn(s, s.queue.shift()!);
    s.queue.push(next(s));
    this.startOfPiece = structuredClone(s);
    this.startEventCount = this.events.length;
  }
  command(cmd: GameCommand, record = true): boolean {
    const s = this.state;
    if (s.over) return false;
    if (record)
      this.events.push({ tick: s.tick, command: structuredClone(cmd) });
    if (cmd.type === "softDrop") {
      s.softDrop = cmd.active;
      return true;
    }
    if (cmd.type === "hardDrop") {
      const p = landing(s);
      s.score += 2 * (s.active.position[1] - p.position[1]);
      s.active = p;
      this.lock();
      return true;
    }
    if (cmd.type === "hold") {
      if (!s.canHold || !s.config.hold) return false;
      const id = s.active.id;
      if (s.held === null) {
        spawn(s, s.queue.shift()!);
        s.queue.push(next(s));
      } else spawn(s, s.held);
      s.held = id;
      s.canHold = false;
      return true;
    }
    const wasGrounded = !valid(s, {
      ...s.active,
      position: [
        s.active.position[0],
        s.active.position[1] - 1,
        s.active.position[2],
      ],
    });
    const p = structuredClone(s.active);
    if (cmd.type === "move") {
      p.position[0] += cmd.dx;
      p.position[2] += cmd.dz;
    } else p.cells = rotateCells(p.cells, cmd.axis, cmd.direction);
    if (!valid(s, p)) return false;
    s.active = p;
    if (wasGrounded && s.resets < 8) {
      s.lockTicks = 0;
      s.resets++;
    }
    return true;
  }
  step() {
    const s = this.state;
    if (s.over) return;
    s.tick++;
    const gravity = s.config.mode === "marathon" || s.config.gravity;
    const interval = Math.max(6, Math.round(60 * Math.pow(0.85, s.level - 1)));
    if (gravity || s.softDrop) {
      s.fallTicks++;
      if (s.fallTicks >= (s.softDrop ? 3 : interval)) {
        s.fallTicks = 0;
        const p = structuredClone(s.active);
        p.position[1]--;
        if (valid(s, p)) {
          s.active = p;
          if (s.softDrop) s.score++;
        }
      }
    }
    if (
      !valid(s, {
        ...s.active,
        position: [
          s.active.position[0],
          s.active.position[1] - 1,
          s.active.position[2],
        ],
      }) &&
      (gravity || s.softDrop)
    ) {
      s.lockTicks++;
      if (s.lockTicks >= 30) this.lock();
    }
  }
  undo(): boolean {
    if (this.state.config.mode !== "practice" || !this.undoState) return false;
    this.state = structuredClone(this.undoState);
    this.startOfPiece = structuredClone(this.state);
    this.undoState = null;
    // Replay is restarted from the beginning of the undone piece; events after it are discarded.
    this.events = this.events.slice(0, this.undoEventCount);
    this.startEventCount = this.events.length;
    return true;
  }
  replay(): Replay {
    return {
      version: 1,
      config: this.state.config,
      events: this.events,
      endTick: this.state.tick,
      checksum: checksum(this.state),
    };
  }
  snapshot() {
    return structuredClone({
      version: 1 as const,
      state: this.state,
      events: this.events,
      undo: this.undoState,
      start: this.startOfPiece,
      startEventCount: this.startEventCount,
      undoEventCount: this.undoEventCount,
    });
  }
  static restore(value: unknown): Engine {
    const data = value as ReturnType<Engine["snapshot"]>;
    if (!data || data.version !== 1)
      throw new Error("This save uses an unsupported version.");
    const validate = (s: GameState) => {
      validateConfig(s.config);
      const n = CATALOGS[s.config.family].length;
      if (
        !Array.isArray(s.board) ||
        s.board.length !==
          s.config.width * s.config.depth * (s.config.height + 4) ||
        s.board.some((v) => !Number.isInteger(v) || v < 0 || v > n)
      )
        throw new Error("Invalid board data.");
      for (const k of [
        "tick",
        "score",
        "layers",
        "level",
        "placements",
        "fallTicks",
        "lockTicks",
        "resets",
        "revision",
        "lastClear",
        "rng",
      ] as const)
        if (!Number.isSafeInteger(s[k]) || s[k] < 0)
          throw new Error("Invalid save counters.");
      if (
        !Number.isInteger(s.streak) ||
        s.streak < -1 ||
        s.streak > 1000000 ||
        typeof s.over !== "boolean" ||
        typeof s.canHold !== "boolean" ||
        typeof s.softDrop !== "boolean"
      )
        throw new Error("Invalid save state.");
      const ids = (a: number[]) =>
        Array.isArray(a) &&
        a.every((id) => Number.isInteger(id) && id >= 0 && id < n);
      if (
        !ids(s.queue) ||
        s.queue.length !== 4 ||
        !ids(s.bag) ||
        s.bag.length > n ||
        !(s.held === null || ids([s.held]))
      )
        throw new Error("Invalid piece queue.");
      if (
        !s.active ||
        !ids([s.active.id]) ||
        !Array.isArray(s.active.position) ||
        s.active.position.length !== 3 ||
        !s.active.position.every(
          (v) => Number.isInteger(v) && Math.abs(v) < 64,
        ) ||
        !Array.isArray(s.active.cells) ||
        s.active.cells.length !==
          CATALOGS[s.config.family][s.active.id].length ||
        !s.active.cells.every(
          (c) =>
            Array.isArray(c) &&
            c.length === 3 &&
            c.every((v) => Number.isInteger(v) && Math.abs(v) < 5),
        )
      )
        throw new Error("Invalid active piece.");
      if (
        canonical(s.active.cells) !==
        canonical(CATALOGS[s.config.family][s.active.id])
      )
        throw new Error("Invalid piece shape.");
      if (!s.over && !valid(s, s.active))
        throw new Error("Active piece overlaps the board.");
    };
    validate(data.state);
    validate(data.start);
    if (data.undo) validate(data.undo);
    if (!Array.isArray(data.events) || data.events.length > 1000000)
      throw new Error("Invalid replay history.");
    for (const e of data.events)
      if (
        !Number.isInteger(e.tick) ||
        e.tick < 0 ||
        e.tick > data.state.tick ||
        !validCommand(e.command)
      )
        throw new Error("Invalid replay command.");
    if (
      !Number.isInteger(data.startEventCount) ||
      data.startEventCount < 0 ||
      data.startEventCount > data.events.length ||
      !Number.isInteger(data.undoEventCount) ||
      data.undoEventCount < 0 ||
      data.undoEventCount > data.events.length
    )
      throw new Error("Invalid undo history.");
    const engine = new Engine(data.state.config);
    engine.state = structuredClone(data.state);
    engine.events = structuredClone(data.events);
    engine.undoState = structuredClone(data.undo);
    engine.startOfPiece = structuredClone(data.start);
    engine.startEventCount = data.startEventCount;
    engine.undoEventCount = data.undoEventCount;
    return engine;
  }
}
export function validCommand(cmd: GameCommand): boolean {
  if (!cmd) return false;
  switch (cmd.type) {
    case "hardDrop":
    case "hold":
      return true;
    case "softDrop":
      return typeof cmd.active === "boolean";
    case "move":
      return (
        Number.isInteger(cmd.dx) &&
        Number.isInteger(cmd.dz) &&
        Math.abs(cmd.dx) + Math.abs(cmd.dz) === 1
      );
    case "rotate":
      return (
        ["x", "y", "z"].includes(cmd.axis) && [1, -1].includes(cmd.direction)
      );
    default:
      return false;
  }
}
export function playReplay(replay: Replay): GameState {
  if (
    replay.version !== 1 ||
    !Number.isInteger(replay.endTick) ||
    replay.endTick < 0 ||
    replay.endTick > 60 * 60 * 60 * 24 ||
    replay.events.length > 1000000
  )
    throw new Error("Invalid replay.");
  const e = new Engine(replay.config);
  let i = 0;
  let last = -1;
  for (const event of replay.events) {
    if (
      !validCommand(event.command) ||
      event.tick < last ||
      event.tick > replay.endTick
    )
      throw new Error("Invalid replay order.");
    last = event.tick;
  }
  while (e.state.tick <= replay.endTick) {
    while (i < replay.events.length && replay.events[i].tick === e.state.tick)
      e.command(replay.events[i++].command, false);
    if (e.state.tick === replay.endTick) break;
    if (e.state.over) throw new Error("Replay continues after top-out.");
    e.step();
  }
  if (checksum(e.state) !== replay.checksum)
    throw new Error("Replay checksum mismatch.");
  return e.state;
}
