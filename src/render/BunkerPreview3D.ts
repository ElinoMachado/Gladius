import * as THREE from "three";
import {
  createBunkerVisualGroup,
  disposeBunkerVisualRoot,
  type BunkerRenderTier,
} from "./bunkerMesh";

/** Pivot da rotação Y — sobe o conjunto no canvas da loja. */
const BUNKER_PREVIEW_ROOT_Y = 0.42;
/** Mesh nv.1 (GLB): pivot em baixo; offset forte para centrar volume + fumo no quadro. */
const BUNKER_PREVIEW_MODEL_Y_NV1 = 0.58;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
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
      disposeBunkerVisualRoot(this.bunkerModel);
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
      this.camera.position.set(2.78, 1.42, 2.78);
      this.camera.lookAt(0, 0.95, 0);
    } else {
      this.bunkerModel.position.y = 0.38;
      this.camera.position.set(2.72, 1.48, 2.72);
      this.camera.lookAt(0, 0.92, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 160);
    const h = Math.max(this.host.clientHeight, 140);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
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

  /**
   * Antes de `innerHTML` no painel que continha o host: tira o canvas do DOM sem `renderer.dispose()`.
   * Se o canvas for destruído com o nó pai, o browser pode perder o contexto WebGL.
   */
  detachCanvasPreserveContext(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }

  reattachToHost(newHost: HTMLElement): void {
    this.host = newHost;
    newHost.appendChild(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(newHost);
    this.fit();
    requestAnimationFrame(() => this.fit());
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.stop();
    disposeBunkerVisualRoot(this.bunkerModel);
    this.root.clear();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }
}
