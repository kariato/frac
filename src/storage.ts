// SPDX-License-Identifier: GPL-3.0-only
import { Engine, rulesId, type GameConfig } from "./engine";
export const DEFAULT_BINDINGS: Record<string, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  forward: "ArrowUp",
  back: "ArrowDown",
  spinLeft: "KeyQ",
  spinRight: "KeyE",
  tipLeft: "KeyA",
  tipRight: "KeyD",
  tipForward: "KeyW",
  tipBack: "KeyS",
  soft: "ShiftLeft",
  drop: "Space",
  hold: "KeyC",
  cameraLeft: "KeyZ",
  cameraRight: "KeyX",
  reset: "KeyR",
  inset: "KeyV",
  undo: "KeyU",
  pause: "Escape",
};
export interface Settings {
  reduced: boolean;
  contrast: boolean;
  fractal: boolean;
  controls: boolean;
  mirror: boolean;
  effects: number;
  music: number;
  repeatDelay: number;
  repeatInterval: number;
  bindings: Record<string, string>;
}
export const DEFAULT_SETTINGS: Settings = {
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  contrast: false,
  fractal: false,
  controls: matchMedia("(pointer: coarse)").matches,
  mirror: false,
  effects: 0.35,
  music: 0,
  repeatDelay: 160,
  repeatInterval: 60,
  bindings: { ...DEFAULT_BINDINGS },
};
export function validateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") throw new Error("Invalid settings.");
  const r = raw as Settings;
  const s = structuredClone(DEFAULT_SETTINGS);
  for (const k of [
    "reduced",
    "contrast",
    "fractal",
    "controls",
    "mirror",
  ] as const)
    if (typeof r[k] === "boolean") s[k] = r[k];
  for (const k of ["effects", "music"] as const)
    if (Number.isFinite(r[k])) s[k] = Math.max(0, Math.min(1, r[k]));
  if (Number.isFinite(r.repeatDelay))
    s.repeatDelay = Math.max(80, Math.min(500, r.repeatDelay));
  if (Number.isFinite(r.repeatInterval))
    s.repeatInterval = Math.max(30, Math.min(200, r.repeatInterval));
  if (
    r.bindings &&
    Object.keys(DEFAULT_BINDINGS).every(
      (k) =>
        typeof r.bindings[k] === "string" &&
        /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Escape|Enter|Backspace|Comma|Period|Slash|Bracket(Left|Right)|Semicolon|Quote|Minus|Equal)$/.test(
          r.bindings[k],
        ),
    ) &&
    new Set(Object.values(r.bindings)).size ===
      Object.keys(DEFAULT_BINDINGS).length
  )
    s.bindings = { ...r.bindings };
  return s;
}
export function loadSettings(): Settings {
  try {
    return validateSettings(
      JSON.parse(localStorage.getItem("frac:settings") || "{}"),
    );
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}
export interface RecordEntry {
  rules: string;
  label: string;
  score: number;
  layers: number;
  ticks: number;
  placements: number;
  seed: number;
  date: string;
  replay: ReturnType<Engine["replay"]>;
}
export class Storage {
  db: Promise<IDBDatabase>;
  available = true;
  private notified = false;
  constructor(private notify: (message: string) => void) {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open("frac", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("data");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Storage blocked"));
    });
    this.db.catch(() => this.failure());
  }
  private failure() {
    this.available = false;
    if (!this.notified) {
      this.notify(
        "Storage unavailable. This session still works; export a backup before leaving.",
      );
      this.notified = true;
    }
  }
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const db = await this.db;
      return await new Promise<T | undefined>((resolve, reject) => {
        const req = db.transaction("data").objectStore("data").get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.failure();
      return undefined;
    }
  }
  async set(key: string, value: unknown) {
    try {
      const db = await this.db;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("data", "readwrite");
        tx.objectStore("data").put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.failure();
    }
  }
  async remove(key: string) {
    try {
      const db = await this.db;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("data", "readwrite");
        tx.objectStore("data").delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.failure();
    }
  }
  settings(s: Settings) {
    try {
      localStorage.setItem("frac:settings", JSON.stringify(s));
    } catch {
      this.failure();
    }
  }
  async record(engine: Engine, label: string) {
    const s = engine.state;
    if (s.config.mode === "practice") return;
    const records = (await this.get<RecordEntry[]>("records")) || [];
    records.unshift({
      rules: rulesId(s.config),
      label,
      score: s.score,
      layers: s.layers,
      ticks: s.tick,
      placements: s.placements,
      seed: s.config.seed,
      date: new Date().toISOString(),
      replay: engine.replay(),
    });
    records.sort((a, b) => b.score - a.score);
    await this.set("records", records.slice(0, 100));
  }
  async configs(): Promise<{ name: string; config: GameConfig }[]> {
    return (await this.get("configs")) || [];
  }
}
export class Sound {
  private ctx?: AudioContext;
  private musicTimer?: ReturnType<typeof setInterval>;
  private note = 0;
  settings: Settings = DEFAULT_SETTINGS;
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      /* Audio is optional. */
    }
  }
  tone(kind: "move" | "lock" | "clear" | "fail" | "over" | "level") {
    if (!this.ctx || !this.settings.effects) return;
    const freq = {
      move: 220,
      lock: 110,
      clear: 660,
      fail: 80,
      over: 65,
      level: 880,
    }[kind];
    this.play(
      freq,
      kind === "clear" ? 0.3 : 0.07,
      this.settings.effects * 0.12,
      kind === "lock" ? "triangle" : "sine",
    );
  }
  private play(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  music(active: boolean) {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (active && this.settings.music)
      this.musicTimer = setInterval(() => {
        const notes = [130.81, 164.81, 196, 261.63, 196, 164.81, 146.83, 196];
        this.play(
          notes[this.note++ % notes.length],
          1.4,
          this.settings.music * 0.06,
        );
      }, 850);
  }
}
