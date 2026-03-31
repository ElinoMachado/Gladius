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

const woodDark = 0x4e342e;
const woodMid = 0x6d4c41;
const woodLight = 0x8d6e63;
const metal = 0x90a4ae;
const metalDark = 0x546e7a;
const cloth = 0x5d4037;

/** Fundo decorativo: barraca de madeira com armas e armaduras (loja entre waves). */
export class ShopStall3D {
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
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1512, 1);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(2.15, 1.35, 3.2);
    this.camera.lookAt(-0.1, 0.55, -0.2);

    const amb = new THREE.AmbientLight(0xffe8d0, 0.42);
    const key = new THREE.DirectionalLight(0xfff5e6, 0.95);
    key.position.set(4, 8, 5);
    const fill = new THREE.DirectionalLight(0xb8c4ff, 0.22);
    fill.position.set(-3, 2, -2);
    this.scene.add(amb, key, fill);
    this.scene.fog = new THREE.Fog(0x1a1512, 6, 22);

    this.buildStall();
    this.scene.add(this.root);
    this.root.rotation.y = 0.28;
    window.addEventListener("resize", this.onResize);
    this.fit();
  }

  private fit(): void {
    const w = Math.max(this.host.clientWidth, 320);
    const h = Math.max(this.host.clientHeight, 240);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  private box(
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness: 0.08,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    return mesh;
  }

  private buildStall(): void {
    const g = this.root;
    g.add(this.box(2.8, 0.12, 1.5, woodDark, 0, 0.06, -0.15));
    g.add(this.box(2.6, 0.85, 0.14, woodMid, 0, 0.52, -0.78));
    g.add(this.box(0.12, 1.05, 0.12, woodDark, -1.2, 0.62, -0.72));
    g.add(this.box(0.12, 1.05, 0.12, woodDark, 1.2, 0.62, -0.72));
    const roof = this.box(3.2, 0.1, 1.35, woodDark, 0, 1.18, -0.35, -0.12);
    roof.rotation.z = 0.14;
    g.add(roof);
    g.add(this.box(2.75, 0.06, 1.05, woodLight, 0, 0.88, -0.2));
    const awning = this.box(2.4, 0.05, 0.75, cloth, 0, 1.02, 0.42, 0.06);
    awning.rotation.x = 0.35;
    g.add(awning);
    const counter = this.box(2.4, 0.22, 0.65, woodMid, 0, 0.35, 0.35);
    g.add(counter);

    const sword = this.box(0.06, 0.72, 0.12, metal, 0.55, 0.68, 0.32, 0.4);
    g.add(sword);
    const hilt = this.box(0.14, 0.08, 0.08, metalDark, 0.35, 0.32, 0.38);
    g.add(hilt);

    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20),
      new THREE.MeshStandardMaterial({
        color: metalDark,
        roughness: 0.55,
        metalness: 0.35,
      }),
    );
    shield.rotation.z = Math.PI / 2;
    shield.rotation.y = 0.35;
    shield.position.set(-0.65, 0.62, 0.28);
    g.add(shield);
    const boss = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35 }),
    );
    boss.position.set(-0.65, 0.62, 0.34);
    g.add(boss);

    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      new THREE.MeshStandardMaterial({ color: metal, metalness: 0.45, roughness: 0.4 }),
    );
    helm.scale.set(1, 0.72, 1.05);
    helm.position.set(0.05, 0.58, 0.42);
    g.add(helm);

    const axe = this.box(0.35, 0.05, 0.1, metal, -0.35, 0.72, 0.36, 0.85);
    g.add(axe);
    const axeHandle = this.box(0.05, 0.45, 0.05, woodDark, -0.52, 0.5, 0.36, 0.2);
    g.add(axeHandle);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x2d2620, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    g.add(ground);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t0 = performance.now();
    const loop = (now: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const t = (now - t0) * 0.001;
      this.root.rotation.y = 0.28 + Math.sin(t * 0.35) * 0.04;
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
