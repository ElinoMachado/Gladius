import * as THREE from "three";
import { createBunkerVisualGroup, type BunkerRenderTier } from "./bunkerMesh";

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

/** Pivot da rotação Y — elevado para o bunker ficar centrado no canvas da loja. */
const BUNKER_PREVIEW_ROOT_Y = 0.14;
/** Mesh nv.1 (GLB): pivot baixo; sobe para o corpo ficar no meio do quadro (não só chaminé em baixo). */
const BUNKER_PREVIEW_MODEL_Y_NV1 = 0.22;
/** Escala extra na loja (GLB + procedural). */
const BUNKER_PREVIEW_SHOP_SCALE_MUL = 1.32;

/** Preview do bunker na loja (mesmo modelo da arena, escala por tier). */
export class BunkerPreview3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private bunkerModel: THREE.Group;
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  private previewTier: BunkerRenderTier = 0;
  private onResize = (): void => this.fit();
  private resizeObserver: ResizeObserver | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);

    const amb = new THREE.AmbientLight(0xfff0e0, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(3.5, 6, 4);
    const rim = new THREE.DirectionalLight(0xaabbff, 0.28);
    rim.position.set(-2, 2, -3);
    this.scene.add(amb, key, rim);

    this.bunkerModel = createBunkerVisualGroup(0);
    this.root.add(this.bunkerModel);
    this.root.position.y = BUNKER_PREVIEW_ROOT_Y;
    this.scene.add(this.root);
    this.applyPreviewFraming(0);

    window.addEventListener("resize", this.onResize);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(host);
    this.fit();
    requestAnimationFrame(() => this.fit());
  }

  setTier(tier: BunkerRenderTier): void {
    if (this.previewTier !== tier) {
      this.root.remove(this.bunkerModel);
      disposeObject3D(this.bunkerModel);
      this.bunkerModel = createBunkerVisualGroup(tier);
      this.root.add(this.bunkerModel);
      this.previewTier = tier;
    }
    const glb = !!this.bunkerModel.userData.bunkerGlb;
    const base = glb ? 1 : tier === 0 ? 1 : tier === 1 ? 1.06 : 1.12;
    this.root.scale.setScalar(base * BUNKER_PREVIEW_SHOP_SCALE_MUL);
    this.applyPreviewFraming(tier);
    this.host.dataset.bunkerPreviewTier = String(tier);
  }

  /** Câmara + Y do mesh por tier (nv.1 precisa de mais margem ao fumo). */
  private applyPreviewFraming(tier: BunkerRenderTier): void {
    this.root.position.y = BUNKER_PREVIEW_ROOT_Y;
    this.bunkerModel.position.x = 0;
    this.bunkerModel.position.z = 0;
    if (tier === 0) {
      this.bunkerModel.position.y = BUNKER_PREVIEW_MODEL_Y_NV1;
      this.camera.position.set(2.75, 1.12, 2.75);
      this.camera.lookAt(0, 0.62, 0);
    } else {
      this.bunkerModel.position.y = 0.06;
      this.camera.position.set(2.68, 1.18, 2.68);
      this.camera.lookAt(0, 0.58, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 160);
    const h = Math.max(this.host.clientHeight, 140);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
      this.root.rotation.y = Math.sin(t * 0.55) * 0.18;
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
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.stop();
    disposeObject3D(this.root);
    this.root.clear();
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
