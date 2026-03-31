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

/** Fundo do menu: espada cravada, luz, pétalas; câmera orbita. */
export class MainMenuSword3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  private camAngle = 0;
  private petals: THREE.Mesh[] = [];
  private petalBase: { phase: number; r: number; a0: number }[] = [];
  private onResize = (): void => this.syncSize();

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.pointerEvents = "none";

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.scene.background = new THREE.Color(0x0a0608);
    this.scene.fog = new THREE.Fog(0x0a0608, 8, 22);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2a1c14,
        roughness: 0.92,
        metalness: 0.05,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.22, 16),
      new THREE.MeshStandardMaterial({
        color: 0x3d2a1a,
        roughness: 0.95,
      }),
    );
    mound.position.set(0, 0.08, 0);
    this.scene.add(mound);

    const sword = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({
      color: 0xe5ecf2,
      metalness: 0.96,
      roughness: 0.09,
      emissive: 0x1a1f24,
      emissiveIntensity: 0.04,
    });
    const steelDark = new THREE.MeshStandardMaterial({
      color: 0xc9d2db,
      metalness: 0.92,
      roughness: 0.12,
    });
    const edgeSteel = new THREE.MeshStandardMaterial({
      color: 0xf0f5fa,
      metalness: 0.98,
      roughness: 0.06,
    });
    const bronze = new THREE.MeshStandardMaterial({
      color: 0x8a6a44,
      metalness: 0.56,
      roughness: 0.42,
    });
    const leather = new THREE.MeshStandardMaterial({
      color: 0x3f2a1d,
      roughness: 0.88,
      metalness: 0.08,
    });

    // Lâmina principal bastarda (dois gumes).
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.195, 2.2, 0.05), steel);
    blade.position.set(0, 1.22, 0);
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 2.16, 0.052), edgeSteel);
    edgeL.position.set(-0.1035, 1.22, 0);
    const edgeR = edgeL.clone();
    edgeR.position.x = 0.1035;
    // Canaleta central da lâmina (fuller).
    const fuller = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.55, 0.01),
      new THREE.MeshStandardMaterial({
        color: 0x7f8a94,
        metalness: 0.88,
        roughness: 0.22,
      }),
    );
    fuller.position.set(0, 1.28, 0.028);
    // Ponta separada para silhueta menos “bloco”.
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.36, 8), steelDark);
    tip.rotation.z = Math.PI;
    tip.position.set(0, 2.5, 0);

    // Guarda mais detalhada.
    const guardCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.07, 0.12),
      bronze,
    );
    guardCore.position.set(0, 0.09, 0);
    const guardWingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.05, 0.09),
      bronze,
    );
    guardWingL.position.set(-0.36, 0.1, 0);
    guardWingL.rotation.z = 0.2;
    const guardWingR = guardWingL.clone();
    guardWingR.position.x = 0.36;
    guardWingR.rotation.z = -0.2;
    const ricasso = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.06), steelDark);
    ricasso.position.set(0, 0.2, 0);

    // Cabo mais curto para não dominar visualmente.
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.055, 12), leather);
    grip.position.set(0, -0.03, 0);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 8, 16), bronze);
    ring1.rotation.y = Math.PI / 2;
    ring1.position.set(0, -0.005, 0);
    const ring2 = ring1.clone();
    ring2.position.y = -0.06;

    const pommelNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.07, 10), bronze);
    pommelNeck.position.set(0, -0.14, 0);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), bronze);
    pommel.position.set(0, -0.2, 0);

    sword.add(
      blade,
      edgeL,
      edgeR,
      fuller,
      tip,
      guardCore,
      guardWingL,
      guardWingR,
      ricasso,
      grip,
      ring1,
      ring2,
      pommelNeck,
      pommel,
    );
    sword.rotation.z = Math.PI;
    // Sobe a espada para evitar ocultação da lâmina pelo chão/montículo.
    sword.position.set(0, 1.59, 0);
    this.scene.add(sword);

    const spot = new THREE.SpotLight(0xffffff, 3.8, 42, Math.PI / 2.1, 0.45, 1);
    const elev = THREE.MathUtils.degToRad(80);
    const dist = 7;
    spot.position.set(Math.cos(elev) * dist, Math.sin(elev) * dist, 0.18);
    // Alvo no chão para iluminar a área ao redor da espada.
    spot.target.position.set(0, 0.02, 0);
    this.scene.add(spot);
    this.scene.add(spot.target);

    // Luz dedicada à lâmina (parte superior da espada).
    const bladeSpot = new THREE.SpotLight(
      0xffffff,
      2.4,
      22,
      Math.PI / 4.5,
      0.35,
      1,
    );
    bladeSpot.position.set(0.9, 3.8, 0.7);
    bladeSpot.target.position.set(0, 1.45, 0);
    this.scene.add(bladeSpot);
    this.scene.add(bladeSpot.target);

    const groundWhite = new THREE.PointLight(0xffffff, 0.55, 6.5);
    groundWhite.position.set(0, 0.22, 0);
    this.scene.add(groundWhite);

    const rim = new THREE.PointLight(0xc44a6a, 0.45, 12);
    rim.position.set(-3, 1.2, -2);
    this.scene.add(rim);

    const amb = new THREE.AmbientLight(0x3a3548, 0.35);
    this.scene.add(amb);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.25);
    fill.position.set(-4, 6, 2);
    this.scene.add(fill);

    const n = 48;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.09, 5),
        new THREE.MeshBasicMaterial({
          color: 0xc94a6a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
        }),
      );
      const r = 1.1 + Math.random() * 1.6;
      const a0 = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      m.position.set(Math.cos(a0) * r, 0.02 + Math.random() * 0.08, Math.sin(a0) * r);
      m.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      m.rotation.z = Math.random() * Math.PI;
      this.scene.add(m);
      this.petals.push(m);
      this.petalBase.push({ phase: Math.random() * Math.PI * 2, r, a0 });
    }

    this.syncSize();
    window.addEventListener("resize", this.onResize);
  }

  private syncSize(): void {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t0 = performance.now();
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) * 0.001;
      this.camAngle += 0.0022 / 2.5;
      const rad = 4.2;
      this.camera.position.set(
        Math.sin(this.camAngle) * rad,
        1.35 + Math.sin(t * 0.4) * 0.06,
        Math.cos(this.camAngle) * rad,
      );
      this.camera.lookAt(0, 0.42, 0);

      for (let i = 0; i < this.petals.length; i++) {
        const m = this.petals[i]!;
        const b = this.petalBase[i]!;
        const ang = b.a0 + t * 0.15 + Math.sin(t * 0.8 + b.phase) * 0.08;
        const rr = b.r + Math.sin(t * 1.1 + b.phase) * 0.06;
        m.position.x = Math.cos(ang) * rr;
        m.position.z = Math.sin(ang) * rr;
        m.position.y = 0.015 + Math.abs(Math.sin(t * 1.3 + b.phase)) * 0.06;
        m.rotation.z += 0.004;
      }

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
    window.removeEventListener("resize", this.onResize);
    disposeObject3D(this.scene);
    this.scene.clear();
    this.petals = [];
    this.petalBase = [];
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
