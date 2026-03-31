import * as THREE from "three";

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

const RARITY_COLOR: Record<string, number> = {
  common: 0x9e9e9e,
  uncommon: 0x43a047,
  rare: 0x1976d2,
  legendary: 0xc62828,
  mythic: 0x7b1fa2,
};

/** Mesa vista de cima com leve inclinação (~75° em relação ao plano da mesa). */
export class ArtifactCodex3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  private onResize = (): void => this.fit();

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x141018, 1);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.fitCamera();

    const amb = new THREE.AmbientLight(0xffeedd, 0.45);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(4, 14, 6);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.25);
    fill.position.set(-6, 4, -4);
    this.scene.add(amb, key, fill);
    this.scene.fog = new THREE.Fog(0x141018, 12, 42);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.22, 5.5),
      new THREE.MeshStandardMaterial({
        color: 0x4e342e,
        roughness: 0.88,
        metalness: 0.05,
      }),
    );
    table.position.y = -0.11;
    this.root.add(table);

    const legGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.55, 10);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    for (const [lx, lz] of [
      [-3.8, 2.2],
      [3.8, 2.2],
      [-3.8, -2.2],
      [3.8, -2.2],
    ] as const) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, -0.5, lz);
      this.root.add(leg);
    }

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const cardGeo = new THREE.BoxGeometry(0.42, 0.04, 0.58);
    for (let i = 0; i < 42; i++) {
      const colors = Object.values(RARITY_COLOR);
      const col = colors[Math.floor(Math.random() * colors.length)]!;
      const mesh = new THREE.Mesh(
        cardGeo,
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.55,
          metalness: 0.12,
        }),
      );
      mesh.position.set(rnd(-3.2, 3.2), 0.05 + Math.random() * 0.04, rnd(-2.2, 2.2));
      mesh.rotation.y = rnd(-0.9, 0.9);
      mesh.rotation.x = rnd(-0.12, 0.12);
      mesh.rotation.z = rnd(-0.15, 0.15);
      this.root.add(mesh);
    }

    this.root.rotation.y = 0.08;
    this.scene.add(this.root);
    window.addEventListener("resize", this.onResize);
    this.fit();
  }

  private fitCamera(): void {
    const elevDeg = 75;
    const elev = (elevDeg * Math.PI) / 180;
    const dist = 7.2;
    this.camera.position.set(0.35, dist * Math.sin(elev), dist * Math.cos(elev));
    this.camera.lookAt(0, -0.05, 0);
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 320);
    const h = Math.max(this.host.clientHeight, 240);
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
      this.root.rotation.y = 0.08 + Math.sin(t * 0.22) * 0.03;
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
    disposeObject3D(this.root);
    this.root.clear();
    this.scene.fog = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
