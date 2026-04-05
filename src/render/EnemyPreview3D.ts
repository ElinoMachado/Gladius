import * as THREE from "three";
import { buildEnemyBody } from "./unitModels";

function disposeObject3D(o: THREE.Object3D): void {
  o.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat.dispose();
    }
  });
}

/** Rotação lenta do modelo de inimigo (compendium / ecrãs de menu). */
export class EnemyPreview3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private pivot = new THREE.Group();
  private raf = 0;
  private running = false;

  constructor(host: HTMLElement, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      42,
      width / Math.max(height, 1),
      0.1,
      80,
    );
    this.camera.position.set(0, 1.15, 2.85);
    this.camera.lookAt(0, 0.75, 0);

    const amb = new THREE.AmbientLight(0xccd8ff, 0.52);
    const dir = new THREE.DirectionalLight(0xfff5e6, 0.95);
    dir.position.set(2.4, 5.2, 3.2);
    const rim = new THREE.DirectionalLight(0x6688cc, 0.35);
    rim.position.set(-3, 2, -2);
    this.scene.add(amb, dir, rim);
    this.scene.add(this.pivot);
  }

  setEnemy(archetypeId: string, displayColor: number): void {
    disposeObject3D(this.pivot);
    this.pivot.clear();
    const body = buildEnemyBody(archetypeId, displayColor);
    body.position.set(0, 0, 0);
    this.pivot.add(body);
    this.pivot.rotation.y = 0.4;
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.pivot.rotation.y += 0.01;
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
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }
}
