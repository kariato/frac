// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from "three";
import {
  CATALOGS,
  landing,
  worldCells,
  type Family,
  type GameState,
  type Vec,
} from "./engine";
export const COLORS = [
  "#c5e895",
  "#a699ed",
  "#eeae7a",
  "#7dcac6",
  "#e38c9f",
  "#e1cb80",
  "#8eace0",
  "#b1c7a9",
];
export interface CameraState {
  quadrant: number;
  azimuth: number;
  elevation: number;
  orbiting: boolean;
}
export function viewVector(
  q: number,
  dx: number,
  dz: number,
): [number, number] {
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [dx, dz] = [dz, -dx];
  return [dx || 0, dz || 0];
}
export function previewSvg(family: Family, id: number | null): string {
  if (id === null)
    return '<svg viewBox="0 0 100 64" aria-hidden="true"><path d="M39 32h22" stroke="currentColor" opacity=".25"/></svg>';
  const cells = CATALOGS[family][id];
  const points = cells.map(([x, y, z]) => [
    (x - z) * 12,
    -y * 14 + (x + z) * 6,
  ]);
  const minX = Math.min(...points.map((p) => p[0])),
    maxX = Math.max(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1])),
    maxY = Math.max(...points.map((p) => p[1]));
  return `<svg viewBox="0 0 100 64" aria-label="${cells.length}-cube piece"><g transform="translate(${50 - (minX + maxX) / 2},${32 - (minY + maxY) / 2})" fill="${COLORS[id % 8]}" stroke="#18211f" stroke-width="1.2" stroke-linejoin="round">${points.map(([x, y]) => `<g transform="translate(${x},${y})"><path d="M0 -10 12 -4 0 2 -12 -4Z"/><path d="M-12 -4 0 2 0 16 -12 10Z" fill-opacity=".65"/><path d="M0 2 12 -4 12 10 0 16Z" fill-opacity=".85"/></g>`).join("")}</g></svg>`;
}
export class BoardView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera();
  cameraState: CameraState = {
    quadrant: 0,
    azimuth: Math.PI / 4,
    elevation: 0.57,
    orbiting: false,
  };
  private board = new THREE.Group();
  private blocks: THREE.InstancedMesh;
  private cores: THREE.LineSegments;
  private active = new THREE.Group();
  private ghost = new THREE.Group();
  private configKey = "";
  private lastRevision = -1;
  private lastActive = "";
  private demo = false;
  private reduced = false;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private targetAzimuth = Math.PI / 4;
  private target = new THREE.Vector3();
  private config = { width: 5, depth: 5, height: 16 };
  private needsRender = true;
  private projectionDirty = true;
  private fractal?: THREE.Points;
  constructor(
    readonly element: HTMLElement,
    onLost: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        matchMedia("(pointer: coarse)").matches ? 1.5 : 2,
      ),
    );
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Three-dimensional puzzle well. Drag to orbit.",
    );
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      onLost();
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.needsRender = true;
      this.lastRevision = -1;
    });
    this.scene.add(new THREE.AmbientLight(0xd9e7dc, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(8, 20, 12);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(0xadcde0, 1);
    fill.position.set(-10, 6, -8);
    this.scene.add(fill);
    const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    this.blocks = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }),
      3000,
    );
    this.cores = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x17271c }),
    );
    this.blocks.count = 0;
    this.blocks.frustumCulled = this.cores.frustumCulled = false;
    this.scene.add(
      this.board,
      this.cores,
      this.blocks,
      this.active,
      this.ghost,
    );
    this.observer = new ResizeObserver(() => {
      this.width = element.clientWidth;
      this.height = element.clientHeight;
      this.renderer.setSize(this.width, this.height);
      this.projectionDirty = true;
      this.needsRender = true;
    });
    this.observer.observe(element);
  }
  setOptions(reduced: boolean, fractal: boolean, contrast = false) {
    this.reduced = reduced;
    (this.blocks.material as THREE.MeshStandardMaterial).emissive.set(
      contrast ? 0x18231b : 0x000000,
    );
    if (fractal && !this.fractal) {
      const p: number[] = [];
      for (let i = 0; i < 3000; i++) {
        const t = (i / 3000) * 30;
        const r = Math.sqrt(i / 3000) * 13;
        p.push(Math.cos(t * 2.399) * r, -2, Math.sin(t * 2.399) * r);
      }
      this.fractal = new THREE.Points(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(p, 3),
        ),
        new THREE.PointsMaterial({
          color: 0x527c58,
          size: 0.035,
          transparent: true,
          opacity: 0.3,
        }),
      );
      this.scene.add(this.fractal);
    }
    if (this.fractal) this.fractal.visible = fractal;
    this.needsRender = true;
  }
  private disposeGroup(group: THREE.Group) {
    for (const child of [...group.children]) {
      group.remove(child);
      const m = child as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material) {
        for (const mat of Array.isArray(m.material) ? m.material : [m.material])
          mat.dispose();
      }
    }
  }
  private lines(points: number[], color: number, opacity: number) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    this.board.add(
      new THREE.LineSegments(
        g,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      ),
    );
  }
  private buildWell(s: GameState) {
    this.disposeGroup(this.board);
    this.config = s.config;
    const { width: w, depth: d, height: h } = s.config;
    this.target.set((w - 1) / 2, h / 2, (d - 1) / 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({
        color: 0x192623,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((w - 1) / 2, -0.51, (d - 1) / 2);
    this.board.add(floor);
    const grid: number[] = [];
    for (let x = 0; x <= w; x++)
      grid.push(x - 0.5, -0.49, -0.5, x - 0.5, -0.49, d - 0.5);
    for (let z = 0; z <= d; z++)
      grid.push(-0.5, -0.49, z - 0.5, w - 0.5, -0.49, z - 0.5);
    this.lines(grid, 0x759385, 0.32);
    const vertical: number[] = [];
    for (const x of [-0.5, w - 0.5])
      for (const z of [-0.5, d - 0.5]) vertical.push(x, -0.5, z, x, h - 0.5, z);
    this.lines(vertical, 0x7e9a89, 0.45);
    const rim: number[] = [];
    for (const y of [-0.5, h - 0.5])
      rim.push(
        -0.5,
        y,
        -0.5,
        w - 0.5,
        y,
        -0.5,
        w - 0.5,
        y,
        -0.5,
        w - 0.5,
        y,
        d - 0.5,
        w - 0.5,
        y,
        d - 0.5,
        -0.5,
        y,
        d - 0.5,
        -0.5,
        y,
        d - 0.5,
        -0.5,
        y,
        -0.5,
      );
    this.lines(rim, 0xa0bba5, 0.6);
    const marks: number[] = [];
    for (let y = 3.5; y < h - 0.5; y += 4)
      marks.push(
        -0.5,
        y,
        -0.5,
        w - 0.5,
        y,
        -0.5,
        -0.5,
        y,
        -0.5,
        -0.5,
        y,
        d - 0.5,
      );
    this.lines(marks, 0x627c6b, 0.18);
    // Floor axes: their projections remain visible as camera orientation changes.
    const axes: number[] = [
      -0.5,
      -0.46,
      -0.5,
      w - 0.5,
      -0.46,
      -0.5,
      -0.5,
      -0.46,
      -0.5,
      -0.5,
      -0.46,
      d - 0.5,
    ];
    this.lines(axes, 0xc5e895, 0.85);
    this.projectionDirty = true;
    this.lastRevision = -1;
  }
  update(s: GameState, demo = false) {
    const k = `${s.config.width},${s.config.depth},${s.config.height}`;
    if (k !== this.configKey) {
      this.configKey = k;
      this.buildWell(s);
    }
    if (s.revision !== this.lastRevision || this.demo !== demo) {
      this.demo = demo;
      this.lastRevision = s.revision;
      let count = 0;
      const matrix = new THREE.Matrix4();
      const edgePoints: number[] = [];
      const edgeGeometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(0.97, 0.97, 0.97),
      );
      const edge = edgeGeometry.getAttribute("position");
      const place = (x: number, y: number, z: number, id: number) => {
        matrix.makeTranslation(x, y, z);
        this.blocks.setMatrixAt(count, matrix);
        this.blocks.setColorAt(count, new THREE.Color(COLORS[id % 8]));
        for (let i = 0; i < edge.count; i++)
          edgePoints.push(edge.getX(i) + x, edge.getY(i) + y, edge.getZ(i) + z);
        count++;
      };
      if (demo) {
        const { width: w, depth: d } = s.config;
        for (let x = 0; x < w; x++)
          for (let z = 0; z < d; z++) {
            const h = (x * 3 + z * 7) % 4;
            for (let y = 0; y < h; y++) place(x, y, z, (x + z + y) % 8);
          }
      } else {
        const c = s.config;
        for (let y = 0; y < c.height + 4; y++)
          for (let z = 0; z < c.depth; z++)
            for (let x = 0; x < c.width; x++) {
              const id = s.board[(y * c.depth + z) * c.width + x];
              if (id) place(x, y, z, id - 1);
            }
      }
      edgeGeometry.dispose();
      this.cores.geometry.dispose();
      this.cores.geometry = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(edgePoints, 3),
      );
      this.blocks.count = count;
      this.blocks.instanceMatrix.needsUpdate = true;
      if (this.blocks.instanceColor)
        this.blocks.instanceColor.needsUpdate = true;
      this.needsRender = true;
    }
    const activeKey = JSON.stringify([s.active, s.revision, demo, s.over]);
    if (activeKey !== this.lastActive) {
      this.lastActive = activeKey;
      this.disposeGroup(this.active);
      this.disposeGroup(this.ghost);
      if (!demo && !s.over) {
        for (const [x, y, z] of worldCells(s.active)) {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.94, 0.94, 0.94),
            new THREE.MeshStandardMaterial({
              color: COLORS[s.active.id % 8],
              emissive: COLORS[s.active.id % 8],
              emissiveIntensity: 0.15,
              roughness: 0.6,
            }),
          );
          m.position.set(x, y, z);
          this.active.add(m);
          const line = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.96, 0.96)),
            new THREE.LineBasicMaterial({ color: 0xf0ffe3 }),
          );
          line.position.copy(m.position);
          this.active.add(line);
        }
        for (const [x, y, z] of worldCells(landing(s))) {
          const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(0.93, 0.93, 0.93)),
            new THREE.LineBasicMaterial({
              color: 0xd5edb4,
              transparent: true,
              opacity: 0.8,
            }),
          );
          edge.position.set(x, y, z);
          this.ghost.add(edge);
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.91, 0.91, 0.91),
            new THREE.MeshBasicMaterial({
              color: 0xc5e895,
              transparent: true,
              opacity: 0.08,
              depthWrite: false,
            }),
          );
          m.position.set(x, y, z);
          this.ghost.add(m);
        }
      }
      this.needsRender = true;
    }
  }
  orbit(delta: number) {
    this.cameraState.quadrant += delta;
    this.targetAzimuth =
      Math.PI / 4 + (this.cameraState.quadrant * Math.PI) / 2;
    this.cameraState.orbiting = true;
  }
  reset() {
    this.cameraState.elevation = 0.57;
    this.cameraState.quadrant = 0;
    this.targetAzimuth = Math.PI / 4;
    this.cameraState.orbiting = true;
  }
  drag(dx: number, dy: number) {
    this.cameraState.azimuth -= dx * 0.009;
    this.cameraState.elevation = Math.max(
      0.436,
      Math.min(1.222, this.cameraState.elevation + dy * 0.005),
    );
    this.cameraState.orbiting = true;
    this.needsRender = true;
    this.projectionDirty = true;
  }
  snap() {
    this.cameraState.quadrant = Math.round(
      (this.cameraState.azimuth - Math.PI / 4) / (Math.PI / 2),
    );
    this.targetAzimuth =
      Math.PI / 4 + (this.cameraState.quadrant * Math.PI) / 2;
  }
  render(dragging = false) {
    const cs = this.cameraState;
    if (!dragging && cs.orbiting) {
      const distance = this.targetAzimuth - cs.azimuth;
      cs.azimuth += this.reduced ? distance : distance * 0.22;
      if (Math.abs(distance) < 0.003 || this.reduced) {
        cs.azimuth = this.targetAzimuth;
        cs.orbiting = false;
      }
      this.needsRender = true;
      this.projectionDirty = true;
    }
    if (!this.needsRender) return;
    const r = 40;
    this.camera.position.set(
      this.target.x + Math.sin(cs.azimuth) * Math.cos(cs.elevation) * r,
      this.target.y + Math.sin(cs.elevation) * r,
      this.target.z + Math.cos(cs.azimuth) * Math.cos(cs.elevation) * r,
    );
    this.camera.lookAt(this.target);
    if (this.projectionDirty) {
      const { width: w, depth: d, height: h } = this.config;
      this.camera.left = -1;
      this.camera.right = 1;
      this.camera.top = 1;
      this.camera.bottom = -1;
      this.camera.near = 0.1;
      this.camera.far = 200;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
      let mx = 0,
        my = 0;
      for (const x of [-1, w])
        for (const y of [-1, h + 3])
          for (const z of [-1, d]) {
            const p = new THREE.Vector3(x, y, z).project(this.camera);
            mx = Math.max(mx, Math.abs(p.x));
            my = Math.max(my, Math.abs(p.y));
          }
      const aspect = this.width / Math.max(this.height, 1);
      const half = Math.max(my, mx / aspect) * 1.04;
      this.camera.left = -half * aspect;
      this.camera.right = half * aspect;
      this.camera.top = half;
      this.camera.bottom = -half;
      this.camera.updateProjectionMatrix();
      this.projectionDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  }
  drawInset(canvas: HTMLCanvasElement, s: GameState, slice = -1) {
    const ctx = canvas.getContext("2d")!;
    const c = s.config;
    const unit = 120 / Math.max(c.width, c.depth);
    canvas.width = 144;
    canvas.height = 144;
    ctx.fillStyle = "#15201d";
    ctx.fillRect(0, 0, 144, 144);
    const ox = (144 - c.width * unit) / 2,
      oz = (144 - c.depth * unit) / 2;
    for (let z = 0; z < c.depth; z++)
      for (let x = 0; x < c.width; x++) {
        let h = 0,
          id = 0;
        for (let y = 0; y < c.height; y++) {
          const v = s.board[(y * c.depth + z) * c.width + x];
          if (v) {
            h = y + 1;
            id = v;
          }
        }
        if (slice >= 0) {
          id = s.board[(slice * c.depth + z) * c.width + x];
          h = id ? slice + 1 : 0;
        }
        ctx.fillStyle = id ? COLORS[(id - 1) % 8] : "#21312a";
        ctx.globalAlpha = id ? 0.5 + (0.5 * h) / c.height : 1;
        ctx.fillRect(ox + x * unit + 1, oz + z * unit + 1, unit - 2, unit - 2);
        ctx.globalAlpha = 1;
        if (h) {
          ctx.fillStyle = "#0a1510";
          ctx.font = `bold ${Math.min(12, unit * 0.65)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(
            String(h),
            ox + (x + 0.5) * unit,
            oz + (z + 0.65) * unit,
          );
        }
      }
    if (!s.over && slice < 0) {
      ctx.strokeStyle = "#ecffd6";
      ctx.lineWidth = 2;
      for (const [x, , z] of worldCells(landing(s)))
        ctx.strokeRect(
          ox + x * unit + 2,
          oz + z * unit + 2,
          unit - 4,
          unit - 4,
        );
    }
  }
}
