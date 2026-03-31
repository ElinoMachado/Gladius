import * as THREE from "three";
import { axialToWorld, axialKey } from "../game/hex";
import type { HexCell } from "../game/grid";
import type { BiomeId } from "../game/types";
import { COMBAT_BIOMES } from "../game/data/biomes";

const HEX_SIZE = 2.18;

const BIOME_HEX_COLOR: Record<BiomeId, number> = {
  hub: 0x6b5a4a,
  floresta: 0x2d5a3d,
  pantano: 0x3d4a2a,
  montanhoso: 0x5a5a62,
  deserto: 0xc9b060,
  rochoso: 0x7a7068,
  vulcanico: 0x8b3a2a,
};

function createHexShape(size: number): THREE.Shape {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = size * Math.cos(a);
    const y = size * Math.sin(a);
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  sh.closePath();
  return sh;
}

function biomeCentroid(
  grid: Map<string, HexCell>,
  biome: BiomeId,
): { x: number; z: number } {
  let sq = 0;
  let sr = 0;
  let n = 0;
  for (const c of grid.values()) {
    if (c.biome !== biome) continue;
    sq += c.q;
    sr += c.r;
    n++;
  }
  if (n === 0) return { x: 0, z: 0 };
  return axialToWorld(sq / n, sr / n, HEX_SIZE);
}

function makeBadgeSprite(letter: string, hexColor: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;
  const ctx = canvas.getContext("2d")!;
  const c = `#${(hexColor & 0xffffff).toString(16).padStart(6, "0")}`;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(36, 36, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f8f6f2";
  ctx.font = "bold 38px Segoe UI,system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 36, 38);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(5.2, 5.2, 1);
  return sp;
}

export interface TakenBiomeMark {
  biome: BiomeId;
  letter: string;
  color: number;
}

export class BiomePicker3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly baseColor = new Map<string, THREE.Color>();
  private readonly markerRoot = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private hoverKey: string | null = null;
  private taken = new Map<BiomeId, TakenBiomeMark>();
  private raf = 0;
  private running = false;
  private readonly grid: Map<string, HexCell>;

  constructor(canvas: HTMLCanvasElement, grid: Map<string, HexCell>) {
    this.canvas = canvas;
    this.grid = grid;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x121018);

    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 400;
    const aspect = w / Math.max(h, 1);
    const fr = 62;
    this.camera = new THREE.OrthographicCamera(
      (-fr * aspect) / 2,
      (fr * aspect) / 2,
      fr / 2,
      -fr / 2,
      0.1,
      400,
    );
    this.camera.position.set(0, 135, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 0, -1);

    const amb = new THREE.AmbientLight(0xddd8f0, 0.62);
    const dir = new THREE.DirectionalLight(0xfff6ee, 0.55);
    dir.position.set(0.3, 1, 0.2);
    this.scene.add(amb, dir);

    const shape = createHexShape(HEX_SIZE * 0.998);

    for (const cell of grid.values()) {
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const col = new THREE.Color(BIOME_HEX_COLOR[cell.biome]);
      const mat = new THREE.MeshStandardMaterial({
        color: col.clone(),
        roughness: 0.82,
        flatShading: true,
        metalness: 0.04,
        emissive: new THREE.Color(0),
      });
      const mesh = new THREE.Mesh(geo, mat);
      const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
      mesh.position.set(x, 0.02, z);
      mesh.userData.hexKey = axialKey(cell.q, cell.r);
      mesh.userData.biome = cell.biome;
      this.scene.add(mesh);
      const k = mesh.userData.hexKey as string;
      this.meshes.set(k, mesh);
      this.baseColor.set(k, col.clone());
    }

    this.scene.add(this.markerRoot);
    this.resize();
    this.applyMeshColors();
    window.addEventListener("resize", this.onWinResize);
  }

  private onWinResize = (): void => {
    this.resize();
  };

  resize(): void {
    const w = this.canvas.clientWidth || 400;
    const h = this.canvas.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(h, 1);
    const fr = 62;
    this.camera.left = (-fr * aspect) / 2;
    this.camera.right = (fr * aspect) / 2;
    this.camera.top = fr / 2;
    this.camera.bottom = -fr / 2;
    this.camera.updateProjectionMatrix();
  }

  setTaken(marks: TakenBiomeMark[]): void {
    this.taken.clear();
    for (const m of marks) {
      if (m.biome !== "hub") this.taken.set(m.biome, m);
    }
    this.rebuildMarkers();
    this.applyMeshColors();
  }

  private rebuildMarkers(): void {
    for (const ch of [...this.markerRoot.children]) {
      const sp = ch as THREE.Sprite;
      this.markerRoot.remove(sp);
      const mat = sp.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.markerRoot.clear();
    for (const b of COMBAT_BIOMES) {
      const m = this.taken.get(b);
      if (!m) continue;
      const { x, z } = biomeCentroid(this.grid, b);
      const sp = makeBadgeSprite(m.letter, m.color);
      sp.position.set(x, 1.35, z);
      this.markerRoot.add(sp);
    }
  }

  private applyMeshColors(): void {
    this.applyHoverTint();
  }

  setHoverKey(hexKey: string | null): void {
    this.hoverKey = hexKey;
    this.applyHoverTint();
  }

  private applyHoverTint(): void {
    for (const [k, mesh] of this.meshes) {
      const bio = mesh.userData.biome as BiomeId;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const base = this.baseColor.get(k)!.clone();
      const claimed = bio !== "hub" && this.taken.has(bio);
      if (claimed) {
        base.multiplyScalar(0.28);
      }
      if (k === this.hoverKey) {
        base.multiplyScalar(claimed ? 1.35 : 1.22);
        mat.emissive.setRGB(0.12, 0.14, 0.18);
      } else {
        mat.emissive.setHex(0);
      }
      mat.color.copy(base);
    }
  }

  clientToNdc(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(r.width, 1);
    const h = Math.max(r.height, 1);
    return {
      x: ((clientX - r.left) / w) * 2 - 1,
      y: -((clientY - r.top) / h) * 2 + 1,
    };
  }

  pickHex(clientX: number, clientY: number): {
    biome: BiomeId;
    hexKey: string;
  } | null {
    const { x, y } = this.clientToNdc(clientX, clientY);
    this.ndc.set(x, y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects([...this.meshes.values()]);
    if (!hits.length) return null;
    const mesh = hits[0]!.object as THREE.Mesh;
    const bio = mesh.userData.biome as BiomeId;
    const hexKey = mesh.userData.hexKey as string;
    return { biome: bio, hexKey };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onWinResize);
    for (const sp of this.markerRoot.children) {
      const mat = (sp as THREE.Sprite).material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.markerRoot.clear();
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.meshes.clear();
    this.renderer.dispose();
  }
}
