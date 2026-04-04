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

    /* Enquadramento loja: GLB com chaminé/fumo precisa de margem no topo; vista simétrica
     * e lookAt ligeiramente à esquerda do pivot corrige modelo “puxado” para a esquerda. */
    this.camera = new THREE.PerspectiveCamera(41, 1, 0.1, 40);
    this.camera.position.set(2.78, 0.98, 2.78);
    this.camera.lookAt(-0.12, 0.34, 0);

    const amb = new THREE.AmbientLight(0xfff0e0, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(3.5, 6, 4);
    const rim = new THREE.DirectionalLight(0xaabbff, 0.28);
    rim.position.set(-2, 2, -3);
    this.scene.add(amb, key, rim);

    this.bunkerModel = createBunkerVisualGroup(0);
    this.root.add(this.bunkerModel);
    /* Desce um pouco no quadro (pivot GLB tende a ficar alto). */
    this.root.position.y = -0.07;
    this.scene.add(this.root);

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
    const s = glb ? 1 : tier === 0 ? 1 : tier === 1 ? 1.06 : 1.12;
    this.root.scale.setScalar(s);
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
