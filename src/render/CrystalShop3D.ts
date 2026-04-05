import * as THREE from "three";

function disposeMeshResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geometries.add(obj.geometry);
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => materials.add(x));
      else materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

/** Cristal estilizado (octaedro) com brilho frio. */
function diamondMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc8f0ff,
    emissive: 0x1a3048,
    emissiveIntensity: 0.12,
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.96,
  });
}

/**
 * Fundo da loja de cristais: mesa vista em ~45° (câmera elevada na diagonal),
 * bolsas de diamantes na mesa e gemas espalhadas no chão.
 */
export class CrystalShop3D {
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
    this.renderer.setClearColor(0x120e14, 1);
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    const target = new THREE.Vector3(0, 0.72, 0);
    const elev = THREE.MathUtils.degToRad(45);
    const azim = THREE.MathUtils.degToRad(42);
    const dist = 5.4;
    const ch = dist * Math.cos(elev);
    this.camera.position.set(
      target.x + ch * Math.cos(azim),
      target.y + dist * Math.sin(elev),
      target.z + ch * Math.sin(azim),
    );
    this.camera.lookAt(target);

    const amb = new THREE.AmbientLight(0x4a3a58, 0.38);
    const key = new THREE.DirectionalLight(0xffeed8, 0.88);
    key.position.set(5, 9, 4);
    const fill = new THREE.DirectionalLight(0xa8b8e8, 0.28);
    fill.position.set(-4, 3, -3);
    const gem = new THREE.PointLight(0x88ccff, 0.55, 8);
    gem.position.set(0.3, 1.15, 0.5);
    this.scene.add(amb, key, fill, gem);
    this.scene.fog = new THREE.Fog(0x120e14, 7, 26);

    this.buildScene();
    this.scene.add(this.root);
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

  private buildScene(): void {
    const g = this.root;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({
        color: 0x1f1a22,
        roughness: 0.94,
        metalness: 0.06,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);

    const wood = new THREE.MeshStandardMaterial({
      color: 0x4a3528,
      roughness: 0.82,
      metalness: 0.05,
    });
    const goldTrim = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.35,
      metalness: 0.72,
    });

    const topW = 2.35;
    const topD = 1.35;
    const topY = 0.68;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.07, topD), wood);
    top.position.set(0, topY, 0);
    g.add(top);

    const rimT = 0.04;
    const rimH = 0.02;
    const rimY = topY + 0.035 + rimH / 2;
    const rimZ = new THREE.Mesh(
      new THREE.BoxGeometry(topW + rimT * 2, rimH, rimT),
      goldTrim,
    );
    rimZ.position.set(0, rimY, topD / 2 + rimT / 2);
    g.add(rimZ);
    const rimZ2 = new THREE.Mesh(
      new THREE.BoxGeometry(topW + rimT * 2, rimH, rimT),
      goldTrim,
    );
    rimZ2.position.set(0, rimY, -topD / 2 - rimT / 2);
    g.add(rimZ2);
    const rimX = new THREE.Mesh(
      new THREE.BoxGeometry(rimT, rimH, topD),
      goldTrim,
    );
    rimX.position.set(topW / 2 + rimT / 2, rimY, 0);
    g.add(rimX);
    const rimX2 = new THREE.Mesh(
      new THREE.BoxGeometry(rimT, rimH, topD),
      goldTrim,
    );
    rimX2.position.set(-topW / 2 - rimT / 2, rimY, 0);
    g.add(rimX2);

    const legH = 0.62;
    const legY = topY - 0.035 - legH / 2;
    const lx = topW / 2 - 0.12;
    const lz = topD / 2 - 0.1;
    for (const [sx, sz] of [
      [lx, lz],
      [-lx, lz],
      [lx, -lz],
      [-lx, -lz],
    ] as const) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.065, legH, 10),
        wood,
      );
      leg.position.set(sx, legY, sz);
      g.add(leg);
    }

    const sackMat = new THREE.MeshStandardMaterial({
      color: 0x6d4e3a,
      roughness: 0.9,
      metalness: 0.02,
    });
    const addBag = (x: number, z: number, ry: number, sy: number): void => {
      const bag = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 12),
        sackMat,
      );
      bag.scale.set(0.95, sy, 0.78);
      bag.position.set(x, topY + 0.05 + sy * 0.1, z);
      bag.rotation.y = ry;
      g.add(bag);
      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.018, 8, 16),
        new THREE.MeshStandardMaterial({
          color: 0x3d2a1f,
          roughness: 0.88,
          metalness: 0.04,
        }),
      );
      tie.rotation.x = Math.PI / 2;
      tie.position.set(x, topY + 0.12 + sy * 0.06, z);
      tie.rotation.z = ry * 0.3;
      g.add(tie);
      const peek = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.055, 0),
        diamondMat(),
      );
      peek.position.set(x + 0.04, topY + 0.2 + sy * 0.08, z + 0.02);
      peek.rotation.set(0.35, ry, 0.2);
      g.add(peek);
      const peek2 = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.048, 0),
        diamondMat(),
      );
      peek2.position.set(x - 0.03, topY + 0.18 + sy * 0.07, z - 0.04);
      peek2.rotation.set(0.28, ry - 0.2, -0.4);
      g.add(peek2);
    };
    addBag(-0.55, 0.12, 0.4, 1.15);
    addBag(0.42, -0.08, -0.25, 1.05);
    addBag(0.08, 0.28, 1.1, 0.92);

    const loose = diamondMat();
    const scatter: Array<{ x: number; z: number; s: number; ry: number }> = [
      { x: -0.95, z: 0.55, s: 0.09, ry: 0.2 },
      { x: -1.15, z: -0.35, s: 0.07, ry: 1.1 },
      { x: 0.88, z: 0.62, s: 0.08, ry: 0.7 },
      { x: 1.05, z: -0.5, s: 0.065, ry: 2.2 },
      { x: -0.35, z: -0.85, s: 0.055, ry: 0.9 },
      { x: 0.55, z: -0.72, s: 0.07, ry: 1.6 },
      { x: -1.25, z: 0.15, s: 0.05, ry: 0.4 },
      { x: 1.2, z: 0.2, s: 0.06, ry: 2.8 },
      { x: 0.15, z: 0.95, s: 0.052, ry: 1.3 },
    ];
    for (const d of scatter) {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(d.s, 0),
        loose,
      );
      gem.position.set(d.x, d.s * 0.72, d.z);
      gem.rotation.y = d.ry;
      gem.rotation.x = 0.25 + (d.ry % 1) * 0.3;
      g.add(gem);
    }

    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14),
      goldTrim,
    );
    coin.position.set(0.72, 0.006, 0.45);
    coin.rotation.y = 0.4;
    g.add(coin);
    const coin2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14),
      goldTrim,
    );
    coin2.position.set(-0.62, 0.006, -0.38);
    coin2.rotation.y = 1.2;
    g.add(coin2);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t0 = performance.now();
    const loop = (now: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const t = (now - t0) * 0.001;
      this.root.rotation.y = Math.sin(t * 0.22) * 0.035;
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
    disposeMeshResources(this.root);
    this.root.clear();
    this.scene.fog = null;
    this.renderer.dispose();
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }
}
