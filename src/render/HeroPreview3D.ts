import * as THREE from "three";
import type { ForgeHeroLoadout, HeroClassId } from "../game/types";
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

  constructor(
    host: HTMLElement,
    width: number,
    height: number,
    opts?: HeroPreview3DOptions,
  ) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    const camZ = opts?.cameraZ ?? 2.35;
    const lookY = opts?.lookAtY ?? 0.72;
    this.camera = new THREE.PerspectiveCamera(40, width / Math.max(height, 1), 0.1, 50);
    this.camera.position.set(0, 1.05, camZ);
    this.camera.lookAt(0, lookY, 0);

    const amb = new THREE.AmbientLight(0xccccee, 0.58);
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.9);
    dir.position.set(2.2, 5, 3.5);
    this.scene.add(amb, dir);
    this.scene.add(this.pivot);
  }

  setHero(
    heroClass: HeroClassId,
    displayColor: number,
    forgeLoadout?: ForgeHeroLoadout,
    forma?: HeroFormaVisualOpts,
  ): void {
    disposeObject3D(this.pivot);
    this.pivot.clear();
    const body = buildHeroBody(heroClass, displayColor, forgeLoadout, forma);
    body.position.set(0, 0, 0);
    this.pivot.add(body);
    this.pivot.rotation.y = 0.35;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.pivot.rotation.y += 0.012;
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
    disposeObject3D(this.pivot);
    this.pivot.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
