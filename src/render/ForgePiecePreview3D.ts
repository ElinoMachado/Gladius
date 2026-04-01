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

function cameraSetupForKind(kind: ForgeSlotKind): {
  pos: THREE.Vector3;
  target: THREE.Vector3;
} {
  if (kind === "helmo") {
    return {
      pos: new THREE.Vector3(0.05, 0.2, 1.45),
      target: new THREE.Vector3(0, 0.05, 0),
    };
  }
  if (kind === "capa") {
    return {
      pos: new THREE.Vector3(0, 0.42, 1.55),
      target: new THREE.Vector3(0, 0.1, -0.05),
    };
  }
  return {
    pos: new THREE.Vector3(0, 0.12, 1.52),
    target: new THREE.Vector3(0, 0.02, 0),
  };
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
  private kind: ForgeSlotKind = "helmo";
  /** Luz pontual pulsante (cor do tier) para realçar bronze/prata/ouro. */
  private tierGlow: THREE.PointLight | null = null;
  private tierGlowBase = 0.9;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.08, 24);
    const { pos, target } = cameraSetupForKind(this.kind);
    this.camera.position.copy(pos);
    this.camera.lookAt(target);

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
    this.kind = kind;
    if (this.tierGlow) {
      this.scene.remove(this.tierGlow);
      this.tierGlow = null;
    }
    disposeObject3D(this.pivot);
    this.pivot.clear();
    if (biome != null) {
      const piece = buildForgePieceDetailGroup(kind, biome, level);
      if (kind === "helmo") piece.scale.setScalar(1.05);
      else if (kind === "capa") piece.scale.setScalar(1.02);
      else piece.scale.setScalar(0.92);
      this.pivot.add(piece);

      const glowColor =
        level === 1 ? 0xff6630 : level === 2 ? 0xb8d8ff : 0xffe566;
      this.tierGlowBase = level === 1 ? 0.92 : level === 2 ? 0.85 : 1.02;
      const lg = new THREE.PointLight(
        glowColor,
        this.tierGlowBase,
        4.2,
        1.85,
      );
      lg.position.set(0.48, 0.34, 0.58);
      this.tierGlow = lg;
      this.scene.add(lg);
    }

    const { pos, target } = cameraSetupForKind(kind);
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.fit();
    this.renderer.render(this.scene, this.camera);
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 120);
    const h = Math.max(this.host.clientHeight, 120);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t0 = performance.now();
    const loop = (now: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const t = (now - t0) * 0.001;
      this.pivot.rotation.y = Math.sin(t * 0.5) * 0.22;
      this.pivot.rotation.x = Math.sin(t * 0.35) * 0.06;
      if (this.tierGlow) {
        const pulse = 0.86 + 0.14 * Math.sin(t * 2.35);
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
