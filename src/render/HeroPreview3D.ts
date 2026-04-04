import * as THREE from "three";
import type { ForgeHeroLoadout, HeroClassId } from "../game/types";
import {
  applyHeroSelectionPreviewAnimations,
  updateHeroUnitAnimations,
} from "./heroUnitAnimations";
import { buildHeroBody, type HeroFormaVisualOpts } from "./unitModels";

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

export type HeroPreview3DOptions = {
  /** Maior = modelo mais afastado (menos cortado nas bordas do quadro). */
  cameraZ?: number;
  /** Ponto de interesse vertical da câmara. */
  lookAtY?: number;
  /** Graus; menor = mais “zoom” no modelo. */
  fov?: number;
};

/** Preview rotativo para ecrãs de setup (não partilha o renderer principal do jogo). */
export class HeroPreview3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private pivot = new THREE.Group();
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  private previewBody: THREE.Object3D | null = null;
  private lastFrameMs = 0;
  private readonly fallbackW: number;
  private readonly fallbackH: number;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    host: HTMLElement,
    width: number,
    height: number,
    opts?: HeroPreview3DOptions,
  ) {
    this.host = host;
    this.fallbackW = Math.max(1, width);
    this.fallbackH = Math.max(1, height);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    const camZ = opts?.cameraZ ?? 2.35;
    const lookY = opts?.lookAtY ?? 0.72;
    const fov = opts?.fov ?? 40;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      this.fallbackW / this.fallbackH,
      0.1,
      50,
    );
    this.camera.position.set(0, 1.05, camZ);
    this.camera.lookAt(0, lookY, 0);

    const amb = new THREE.AmbientLight(0xccccee, 0.58);
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.9);
    dir.position.set(2.2, 5, 3.5);
    this.scene.add(amb, dir);
    this.scene.add(this.pivot);

    this.fitViewport();
    this.resizeObserver = new ResizeObserver(() => this.fitViewport());
    this.resizeObserver.observe(host);
    window.addEventListener("resize", this.onWindowResize);
    requestAnimationFrame(() => this.fitViewport());
  }

  private onWindowResize = (): void => {
    this.fitViewport();
  };

  /** Alinha buffer WebGL ao tamanho CSS do host (evita canvas minúsculo com `setSize` fixo). */
  private fitViewport(): void {
    const cw = this.host.clientWidth;
    const ch = this.host.clientHeight;
    const w = Math.max(cw > 0 ? cw : this.fallbackW, 1);
    const h = Math.max(ch > 0 ? ch : this.fallbackH, 1);
    const pr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    if (this.running) this.renderer.render(this.scene, this.camera);
  }

  setHero(
    heroClass: HeroClassId,
    displayColor: number,
    forgeLoadout?: ForgeHeroLoadout,
    forma?: HeroFormaVisualOpts,
  ): void {
    disposeObject3D(this.pivot);
    this.pivot.clear();
    this.previewBody = null;
    const body = buildHeroBody(heroClass, displayColor, forgeLoadout, forma);
    body.position.set(0, 0, 0);
    applyHeroSelectionPreviewAnimations(body, heroClass);
    this.previewBody = body;
    this.pivot.add(body);
    this.pivot.rotation.y = 0.35;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameMs = performance.now();
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      if (this.previewBody) {
        updateHeroUnitAnimations(this.previewBody, dt);
      }
      this.pivot.rotation.y += this.previewBody?.userData.heroAnimMixer
        ? 0.004
        : 0.012;
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
    window.removeEventListener("resize", this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    disposeObject3D(this.pivot);
    this.pivot.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
