import * as THREE from "three";
import type { ForgeEssenceId, ForgeSlotKind } from "../game/types";
import { buildForgePieceDetailGroup } from "./forgePieceMesh";

function disposeObject3D(o: THREE.Object3D): void {
  o.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
  });
}

/**
 * Rotação Y para a face principal virada à câmara (+Z).
 * Capa: +90° costuma corrigir malha exportada “de perfil” (coluna estreita).
 */
const PIECE_PREVIEW_YAW: Record<ForgeSlotKind, number> = {
  helmo: -Math.PI / 2,
  capa: Math.PI / 2,
  manoplas: -Math.PI / 2,
};

const FIT_MARGIN_BY_KIND: Record<ForgeSlotKind, number> = {
  helmo: 1.22,
  capa: 1.26,
  manoplas: 1.22,
};

/** Rotação Y contínua (rad/s) — lenta para não desenquadrar com a bbox usada na câmara. */
const PREVIEW_SPIN_RAD_PER_SEC = 0.42;

/** Centra a AABB do objeto na origem do pai (correcto com rotação no filho). */
function centerObjectOnOrigin(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const parent = object.parent;
  if (parent) {
    parent.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    center.applyMatrix4(inv);
  }
  object.position.sub(center);
  object.updateMatrixWorld(true);
}

/**
 * Câmara em +Z a olhar para a origem.
 * Usa altura, largura e meia-diagonal da AABB para não cortar cantos no canvas quadrado/largo.
 */
function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  root: THREE.Object3D,
  margin: number,
): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;

  const size = new THREE.Vector3();
  box.getSize(size);
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(camera.aspect, 0.25));

  const distV = ((size.y / 2) * margin) / Math.tan(vFov / 2);
  const distH = ((size.x / 2) * margin) / Math.tan(hFov / 2);
  const halfDiag =
    0.5 * Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
  const distDiagV = (halfDiag * margin) / Math.tan(vFov / 2);
  const distDiagH = (halfDiag * margin) / Math.tan(hFov / 2);
  const distDiag = Math.max(distDiagV, distDiagH);

  const dist = Math.max(distV, distH, distDiag, 0.26);

  const elev = Math.min(size.y * 0.04, 0.1);
  camera.position.set(0, elev, dist);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(0.012, dist * 0.012);
  camera.far = Math.max(56, dist * 6);
  camera.updateProjectionMatrix();
}

/** Preview isolado de uma peça da forja (elmo / capa / manoplas). */
export class ForgePiecePreview3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private pivot = new THREE.Group();
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  private onResize = (): void => this.fit();
  /** Luz pontual pulsante (cor do tier) para realçar bronze/prata/ouro. */
  private tierGlow: THREE.PointLight | null = null;
  private tierGlowBase = 0.9;
  private previewKind: ForgeSlotKind = "helmo";

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 64);
    this.camera.position.set(0, 0.08, 1.35);
    this.camera.lookAt(0, 0, 0);

    const amb = new THREE.AmbientLight(0xf0e8ff, 0.52);
    const key = new THREE.DirectionalLight(0xffffff, 0.92);
    key.position.set(2.2, 4.5, 3.2);
    const fill = new THREE.DirectionalLight(0xb8c8ff, 0.35);
    fill.position.set(-2.8, 1.5, -1.5);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.22);
    rim.position.set(0.5, 2, -3);
    this.scene.add(amb, key, fill, rim);

    this.scene.add(this.pivot);

    window.addEventListener("resize", this.onResize);
    this.fit();
  }

  setKindAndPiece(
    kind: ForgeSlotKind,
    biome: ForgeEssenceId | null,
    level: 1 | 2 | 3,
  ): void {
    this.previewKind = kind;
    this.pivot.rotation.set(0, 0, 0);
    if (this.tierGlow) {
      this.scene.remove(this.tierGlow);
      this.tierGlow = null;
    }
    disposeObject3D(this.pivot);
    this.pivot.clear();
    if (biome != null) {
      const piece = buildForgePieceDetailGroup(kind, biome, level);
      piece.rotation.set(0, PIECE_PREVIEW_YAW[kind], 0);
      this.pivot.add(piece);
      centerObjectOnOrigin(piece);

      const glowColor =
        level === 1 ? 0xff6630 : level === 2 ? 0xb8d8ff : 0xffe566;
      this.tierGlowBase = level === 1 ? 0.92 : level === 2 ? 0.85 : 1.02;
      const lg = new THREE.PointLight(
        glowColor,
        this.tierGlowBase,
        5.5,
        2.2,
      );
      lg.position.set(0.55, 0.4, 0.75);
      this.tierGlow = lg;
      this.scene.add(lg);
    }

    this.refitCamera();
    this.fit();
    this.renderer.render(this.scene, this.camera);
  }

  private refitCamera(): void {
    if (this.pivot.children.length === 0) {
      this.camera.position.set(0, 0.08, 1.35);
      this.camera.lookAt(0, 0, 0);
      this.camera.near = 0.05;
      this.camera.far = 64;
      this.camera.updateProjectionMatrix();
      return;
    }
    const rx = this.pivot.rotation.x;
    const ry = this.pivot.rotation.y;
    const rz = this.pivot.rotation.z;
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true);
    fitCameraToObject(
      this.camera,
      this.pivot,
      FIT_MARGIN_BY_KIND[this.previewKind],
    );
    this.pivot.rotation.set(rx, ry, rz);
    this.pivot.updateMatrixWorld(true);
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 120);
    const h = Math.max(this.host.clientHeight, 120);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.refitCamera();
    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t0 = performance.now();
    const loop = (now: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const elapsedSec = (now - t0) * 0.001;
      this.pivot.rotation.y = elapsedSec * PREVIEW_SPIN_RAD_PER_SEC;
      this.pivot.rotation.x = Math.sin(elapsedSec * 0.55) * 0.035;
      this.pivot.rotation.z = 0;
      if (this.tierGlow) {
        const pulse = 0.86 + 0.14 * Math.sin(elapsedSec * 2.35);
        this.tierGlow.intensity = this.tierGlowBase * pulse;
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.stop();
    disposeObject3D(this.pivot);
    this.pivot.clear();
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
