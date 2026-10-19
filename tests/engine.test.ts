import { describe, it, expect } from "vitest";
import {
  CATALOGS,
  Engine,
  PRESETS,
  checksum,
  clearLayers,
  index,
  landing,
  orientations,
  playReplay,
  rotateCells,
  rulesId,
  valid,
  validateConfig,
  worldCells,
  type Axis,
  type GameConfig,
} from "../src/engine";
import { viewVector } from "../src/view";
const config: GameConfig = {
  width: 5,
  depth: 5,
  height: 16,
  family: "standard",
  mode: "marathon",
  seed: 42,
  gravity: true,
  startLevel: 1,
  previews: 3,
  hold: true,
};
function single(e: Engine, x = 0, y = 0, z = 0) {
  e.state.active = { id: 0, cells: [[0, 0, 0]], position: [x, y, z] };
}
describe("piece catalogs and transforms", () => {
  it("defaults every well to only single cubes and short straight bars", () => {
    expect(CATALOGS.simple.map((cells) => cells.length)).toEqual([1, 2, 3]);
    for (const cells of CATALOGS.simple) {
      expect(cells.every(([x, y, z], i) => x === i && y === 0 && z === 0)).toBe(
        true,
      );
    }
    expect(PRESETS.every((preset) => preset.family === "simple")).toBe(true);
  });
  it("deals the complete simple catalog once per bag and restores simple saves", () => {
    const e = new Engine({ ...config, family: "simple" });
    expect(
      new Set([e.state.active.id, ...e.state.queue.slice(0, 2)]).size,
    ).toBe(3);
    e.command({ type: "hardDrop" });
    expect(Engine.restore(e.snapshot()).state).toEqual(e.state);
    expect(playReplay(e.replay())).toEqual(e.state);
    expect(rulesId(e.state.config)).not.toBe(rulesId(config));
  });
  it("enumerates exactly eight distinct tetracubes and four foundation pieces", () => {
    expect(CATALOGS.standard).toHaveLength(8);
    expect(CATALOGS.foundation).toHaveLength(4);
    for (const cells of CATALOGS.standard) expect(cells).toHaveLength(4);
  });
  it("contains face-connected unique cubes", () => {
    for (const family of Object.values(CATALOGS))
      for (const cells of family) {
        const reached = new Set([0]);
        while (true) {
          const before = reached.size;
          cells.forEach((c, i) => {
            if (
              [...reached].some(
                (j) =>
                  c.reduce((n, v, a) => n + Math.abs(v - cells[j][a]), 0) === 1,
              )
            )
              reached.add(i);
          });
          if (before === reached.size) break;
        }
        expect(reached.size).toBe(cells.length);
        expect(new Set(cells.map(String)).size).toBe(cells.length);
      }
  });
  for (const axis of ["x", "y", "z"] as Axis[])
    it(`four ${axis} quarter turns and inverse return exact cells`, () => {
      for (const cells of CATALOGS.standard) {
        let rotated = cells;
        for (let i = 0; i < 4; i++) rotated = rotateCells(rotated, axis, 1);
        expect(rotated).toEqual(cells);
        expect(rotateCells(rotateCells(cells, axis, 1), axis, -1)).toEqual(
          cells,
        );
      }
    });
  it("generates at most 24 unique orientations", () => {
    for (const cs of CATALOGS.standard) {
      const all = orientations(cs);
      expect(all.length).toBeLessThanOrEqual(24);
      expect(new Set(all.map((c) => JSON.stringify(c))).size).toBe(all.length);
    }
  });
});
describe("dimensions and placement", () => {
  for (const p of PRESETS)
    it(`spawns every catalog shape in ${p.name}`, () => {
      const e = new Engine({ ...config, ...p });
      for (let n = 0; n < 40; n++) {
        expect(valid(e.state, e.state.active)).toBe(true);
        e.state.board.fill(0);
        e.command({ type: "hardDrop" });
        e.state.over = false;
      }
    });
  it("supports minimum and maximum custom dimensions", () => {
    for (const [w, d, h] of [
      [3, 3, 8],
      [10, 10, 24],
    ]) {
      const e = new Engine({ ...config, width: w, depth: d, height: h });
      expect(e.state.board).toHaveLength(w * d * (h + 4));
      expect(valid(e.state, e.state.active)).toBe(true);
    }
  });
  it("rejects invalid and non-integer configurations", () => {
    for (const patch of [
      { width: 2 },
      { width: 3.5 },
      { height: 25 },
      { depth: NaN },
      { seed: -1 },
      { family: "unknown" },
      { previews: 4 },
      { startLevel: 0 },
    ])
      expect(() => validateConfig({ ...config, ...patch })).toThrow();
  });
  it("rejects every boundary and settled collision atomically", () => {
    const e = new Engine(config);
    single(e);
    const before = structuredClone(e.state.active);
    expect(e.command({ type: "move", dx: -1, dz: 0 })).toBe(false);
    expect(e.state.active).toEqual(before);
    for (const position of [
      [-1, 0, 0],
      [5, 0, 0],
      [0, -1, 0],
      [0, 20, 0],
      [0, 0, 5],
    ])
      expect(
        valid(e.state, {
          ...e.state.active,
          position: position as [number, number, number],
        }),
      ).toBe(false);
    e.state.board[0] = 1;
    expect(valid(e.state, e.state.active)).toBe(false);
  });
  it("finds exact hard-drop landing without changing state", () => {
    const e = new Engine(config);
    single(e, 2, 16, 2);
    e.state.board[index(config, 2, 3, 2)] = 1;
    const before = checksum(e.state);
    expect(landing(e.state).position).toEqual([2, 4, 2]);
    expect(checksum(e.state)).toBe(before);
    e.command({ type: "hardDrop" });
    expect(e.state.board[index(config, 2, 4, 2)]).toBe(1);
    expect(e.state.score).toBe(24);
  });
  it("blocked rotation does not translate the piece", () => {
    const e = new Engine(config);
    e.state.active = {
      id: 0,
      cells: [
        [0, 0, 0],
        [1, 0, 0],
      ],
      position: [0, 0, 0],
    };
    const before = structuredClone(e.state.active);
    expect(e.command({ type: "rotate", axis: "y", direction: 1 })).toBe(false);
    expect(e.state.active).toEqual(before);
  });
});
describe("clearing, score, and top-out", () => {
  it("clears simultaneous layers and compacts whole layers, not clusters", () => {
    const e = new Engine(config);
    const area = 25;
    e.state.board.fill(1, 0, area * 2);
    e.state.board[index(config, 2, 4, 3)] = 3;
    expect(clearLayers(e.state)).toBe(2);
    expect(e.state.board[index(config, 2, 2, 3)]).toBe(3);
    expect(e.state.board[index(config, 2, 1, 3)]).toBe(0);
    expect(e.state.board).toHaveLength(500);
  });
  it("does not clear a full hidden buffer layer", () => {
    const e = new Engine(config);
    e.state.board.fill(1, 16 * 25, 17 * 25);
    expect(clearLayers(e.state)).toBe(0);
  });
  it("awards layer score and advances level after scoring at old level", () => {
    const e = new Engine({ ...config, family: "foundation" });
    e.state.layers = 7;
    e.state.board.fill(1, 0, 25);
    e.state.board[index(config, 0, 0, 0)] = 0;
    single(e);
    e.command({ type: "hardDrop" });
    expect(e.state.score).toBe(100);
    expect(e.state.layers).toBe(8);
    expect(e.state.level).toBe(2);
  });
  it("rescues buffer cells with a clearing layer before testing top-out", () => {
    const e = new Engine({ ...config, family: "foundation" });
    e.state.board.fill(1, 0, 25);
    e.state.board[0] = 0;
    e.state.board[index(config, 4, 16, 4)] = 1;
    single(e);
    e.command({ type: "hardDrop" });
    expect(e.state.over).toBe(false);
    expect(e.state.board[index(config, 4, 15, 4)]).toBe(1);
  });
  it("ends when settled cells remain above rim", () => {
    const e = new Engine({ ...config, family: "foundation" });
    e.state.board[index(config, 4, 16, 4)] = 1;
    single(e);
    e.command({ type: "hardDrop" });
    expect(e.state.over).toBe(true);
  });
  it("does not allow commands after top-out", () => {
    const e = new Engine(config);
    e.state.over = true;
    expect(e.command({ type: "hardDrop" })).toBe(false);
    const c = checksum(e.state);
    e.step();
    expect(checksum(e.state)).toBe(c);
  });
});
describe("timing and hold", () => {
  it("uses fixed tick gravity", () => {
    const e = new Engine(config);
    const y = e.state.active.position[1];
    for (let i = 0; i < 59; i++) e.step();
    expect(e.state.active.position[1]).toBe(y);
    e.step();
    expect(e.state.active.position[1]).toBe(y - 1);
  });
  it("disables automatic falling and locking in untimed practice", () => {
    const e = new Engine({ ...config, mode: "practice", gravity: false });
    const before = structuredClone(e.state.active);
    for (let i = 0; i < 600; i++) e.step();
    expect(e.state.active).toEqual(before);
    single(e);
    for (let i = 0; i < 60; i++) e.step();
    expect(e.state.placements).toBe(0);
  });
  it("soft drop moves and scores only actual cells", () => {
    const e = new Engine(config);
    e.command({ type: "softDrop", active: true });
    for (let i = 0; i < 3; i++) e.step();
    expect(e.state.score).toBe(1);
    e.command({ type: "softDrop", active: false });
    expect(e.state.softDrop).toBe(false);
  });
  it("locks after 30 grounded ticks", () => {
    const e = new Engine({ ...config, family: "foundation" });
    single(e);
    for (let i = 0; i < 29; i++) e.step();
    expect(e.state.placements).toBe(0);
    e.step();
    expect(e.state.placements).toBe(1);
  });
  it("limits grounded lock resets to eight", () => {
    const e = new Engine({ ...config, family: "foundation" });
    single(e, 2);
    for (let i = 0; i < 12; i++) {
      e.step();
      e.command({ type: "move", dx: i % 2 ? 1 : -1, dz: 0 });
    }
    expect(e.state.resets).toBe(8);
    expect(e.state.lockTicks).toBe(4);
  });
  it("failed movement does not reset locking", () => {
    const e = new Engine({ ...config, family: "foundation" });
    single(e);
    e.step();
    e.command({ type: "move", dx: -1, dz: 0 });
    expect(e.state.lockTicks).toBe(1);
    expect(e.state.resets).toBe(0);
  });
  it("permits hold once per placement and restores it after locking", () => {
    const e = new Engine(config);
    const id = e.state.active.id;
    expect(e.command({ type: "hold" })).toBe(true);
    expect(e.state.held).toBe(id);
    expect(e.command({ type: "hold" })).toBe(false);
    e.command({ type: "hardDrop" });
    expect(e.state.canHold).toBe(true);
    expect(e.command({ type: "hold" })).toBe(true);
    expect(e.state.active.id).toBe(id);
  });
  it("honors disabled hold", () => {
    const e = new Engine({ ...config, hold: false });
    expect(e.command({ type: "hold" })).toBe(false);
  });
});
describe("determinism, saves, and undo", () => {
  it("deals each catalog exactly once per bag", () => {
    const e = new Engine(config);
    const sequence = [e.state.active.id, ...e.state.queue];
    for (let i = 0; i < 3; i++) {
      e.state.board.fill(0);
      e.command({ type: "hardDrop" });
      sequence.push(e.state.queue.at(-1)!);
    }
    expect(new Set(sequence).size).toBe(8);
  });
  it("replays inputs at exact ticks including multiple commands on one tick", () => {
    const e = new Engine(config);
    for (let t = 0; t < 400; t++) {
      if (t % 80 === 0) e.command({ type: "move", dx: 1, dz: 0 });
      if (t % 100 === 0) {
        e.command({ type: "rotate", axis: "y", direction: 1 });
        e.command({ type: "hardDrop" });
      }
      e.step();
    }
    expect(playReplay(e.replay())).toEqual(e.state);
  });
  it("snapshot round-trips and resumes identically", () => {
    const a = new Engine(config);
    a.command({ type: "hold" });
    for (let i = 0; i < 100; i++) a.step();
    const b = Engine.restore(JSON.parse(JSON.stringify(a.snapshot())));
    for (let i = 0; i < 80; i++) {
      a.step();
      b.step();
    }
    expect(b.state).toEqual(a.state);
  });
  it("snapshot is detached from future mutation", () => {
    const e = new Engine(config);
    const snapshot = e.snapshot();
    e.command({ type: "hardDrop" });
    expect(snapshot.state.placements).toBe(0);
    expect(snapshot.events).toHaveLength(0);
  });
  it("undo restores start of last piece, queue, bag, hold, score and event history", () => {
    const e = new Engine({ ...config, mode: "practice", gravity: false });
    const initial = e.snapshot();
    e.command({ type: "hold" });
    e.command({ type: "hardDrop" });
    expect(e.undo()).toBe(true);
    expect(e.state).toEqual(initial.state);
    expect(playReplay(e.replay())).toEqual(e.state);
    expect(e.undo()).toBe(false);
  });
  it("undo retains earlier placements made at the same tick", () => {
    const e = new Engine({ ...config, mode: "practice", gravity: false });
    e.command({ type: "hardDrop" });
    const previous = structuredClone(e.state);
    e.command({ type: "hardDrop" });
    e.undo();
    expect(e.state).toEqual(previous);
    expect(playReplay(e.replay())).toEqual(previous);
  });
  it("rejects corrupted save boards and commands", () => {
    const e = new Engine(config);
    const a = e.snapshot();
    a.state.board[0] = 999;
    expect(() => Engine.restore(a)).toThrow();
    const b = e.snapshot();
    b.events.push({ tick: 0, command: { type: "move", dx: 999, dz: 0 } });
    expect(() => Engine.restore(b)).toThrow();
  });
  it("separates records by rules but not seed", () => {
    expect(rulesId(config)).toBe(rulesId({ ...config, seed: 9 }));
    expect(rulesId(config)).not.toBe(rulesId({ ...config, width: 6 }));
    expect(rulesId(config)).not.toBe(rulesId({ ...config, hold: false }));
  });
  it("preserves voxel counts through all orientations", () => {
    const e = new Engine(config);
    for (const cells of CATALOGS.standard)
      for (const cs of orientations(cells)) {
        expect(worldCells({ ...e.state.active, cells: cs })).toHaveLength(4);
      }
  });
});
describe("camera command mapping", () => {
  it("maps view directions to orthogonal board cells in each quadrant", () => {
    expect([0, 1, 2, 3].map((q) => viewVector(q, 1, 0))).toEqual([
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ]);
    expect(viewVector(-1, 1, 0)).toEqual([0, 1]);
    expect(viewVector(4, 1, 0)).toEqual([1, 0]);
  });
});
