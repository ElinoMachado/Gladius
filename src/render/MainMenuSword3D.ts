import * as THREE from "three";
import {
  createCartoonRosePetalTextures,
  createMainMenuTextureSet,
  disposeMainMenuTextures,
  disposeRosePetalTextures,
  type MainMenuTextureSet,
} from "./mainMenuTextures";

function disposeObject3D(o: THREE.Object3D): void {
  o.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    } else if (obj instanceof THREE.Sprite) {
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
  });
}

/** Fundo do menu: espada cravada, luz, pétalas (planos quase horizontais com textura de pétala); câmera orbita. */
export class MainMenuSword3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private host: HTMLElement;
  private raf = 0;
  private running = false;
  /** π = câmera no −Z a olhar para o centro → portão (+Z) em frente. */
  private camAngle = Math.PI;
  private petals: THREE.Mesh[] = [];
  private petalBase: {
    phase: number;
    r: number;
    a0: number;
    hOff: number;
    hAmp1: number;
    hAmp2: number;
    hAmp3: number;
    hF1: number;
    hF2: number;
    hF3: number;
    hP1: number;
    hP2: number;
    hP3: number;
    rx0: number;
    ry0: number;
    rz0: number;
    wobbleXF: number;
    wobbleXAmp: number;
    wobbleYF: number;
    wobbleYAmp: number;
    spinRate: number;
  }[] = [];
  private onResize = (): void => this.syncSize();
  private menuTextures: MainMenuTextureSet;
  private rosePetalTextures: THREE.CanvasTexture[] = [];
  /** AABB reutilizado para evitar que cantos do plano inclinado fiquem abaixo do chão (y≈0). */
  private readonly petalWorldBox = new THREE.Box3();

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
    this.scene.fog = new THREE.Fog(0x100c0a, 7.5, 24);

    this.menuTextures = createMainMenuTextureSet();
    this.rosePetalTextures = createCartoonRosePetalTextures();
    const T = this.menuTextures;

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshStandardMaterial({
        map: T.sand,
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.22, 20),
      new THREE.MeshStandardMaterial({
        map: T.rock,
        bumpMap: T.rock,
        bumpScale: 0.07,
        color: 0xffffff,
        roughness: 0.93,
        metalness: 0.04,
      }),
    );
    mound.position.set(0, 0.08, 0);
    this.scene.add(mound);

    /** Coliseu: muro cilíndrico (face interior), pilares e portão de ferro no +Z. */
    T.coliseumWall.repeat.set(12, 2.65);
    const wallR = 8.62;
    const wallH = 4.45;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(wallR, wallR, wallH, 72, 1, true),
      new THREE.MeshStandardMaterial({
        map: T.coliseumWall,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    );
    wall.position.y = wallH / 2;
    this.scene.add(wall);

    const mkPillarMat = (): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({
        color: 0x6a5c52,
        roughness: 0.88,
        metalness: 0.06,
      });
    const gapRad = THREE.MathUtils.degToRad(58);
    const pillarCount = 14;
    const arcLen = Math.PI * 2 - gapRad;
    const arcStart = gapRad / 2;
    const pillarInset = wallR - 0.26;
    for (let i = 0; i < pillarCount; i++) {
      const a = arcStart + ((i + 0.5) / pillarCount) * arcLen;
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.26, 3.68, 10),
        mkPillarMat(),
      );
      pil.position.set(
        Math.sin(a) * pillarInset,
        3.68 / 2,
        Math.cos(a) * pillarInset,
      );
      this.scene.add(pil);
    }

    const zFrame = wallR - 0.36;
    const jambW = 0.52;
    const jambD = 0.64;
    const jambH = 2.92;
    const mkFrameMat = (): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({
        color: 0x7d6b5f,
        roughness: 0.9,
        metalness: 0.05,
      });
    const leftJamb = new THREE.Mesh(
      new THREE.BoxGeometry(jambW, jambH, jambD),
      mkFrameMat(),
    );
    leftJamb.position.set(-1.08, jambH / 2, zFrame);
    this.scene.add(leftJamb);
    const rightJamb = new THREE.Mesh(
      new THREE.BoxGeometry(jambW, jambH, jambD),
      mkFrameMat(),
    );
    rightJamb.position.set(1.08, jambH / 2, zFrame);
    this.scene.add(rightJamb);
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(2.92, 0.5, jambD),
      mkFrameMat(),
    );
    lintel.position.set(0, jambH + 0.25, zFrame);
    this.scene.add(lintel);

    for (let k = 0; k < 5; k++) {
      const wv = 2.35 - k * 0.24;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(wv, 0.2, jambD * 0.88),
        mkFrameMat(),
      );
      step.position.set(
        0,
        jambH + 0.5 + 0.1 + k * 0.19,
        zFrame - k * 0.025,
      );
      this.scene.add(step);
    }

    const gateDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(2.12, 2.48),
      new THREE.MeshStandardMaterial({
        map: T.ironGate,
        color: 0xffffff,
        roughness: 0.68,
        metalness: 0.38,
        side: THREE.DoubleSide,
      }),
    );
    gateDoor.position.set(0, 1.3, zFrame - jambD / 2 - 0.14);
    gateDoor.rotation.y = Math.PI;
    this.scene.add(gateDoor);

    const gateWarm = new THREE.PointLight(0xffc8b0, 0.38, 11);
    gateWarm.position.set(0, 1.85, wallR - 2.2);
    this.scene.add(gateWarm);

    const sword = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({
      map: T.bladeSteel,
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.14,
      emissive: 0x1a1f24,
      emissiveIntensity: 0.035,
    });
    const steelDark = new THREE.MeshStandardMaterial({
      map: T.bladeSteel,
      color: 0xd8e2ea,
      metalness: 0.88,
      roughness: 0.18,
    });
    const edgeSteel = new THREE.MeshStandardMaterial({
      map: T.bladeEdge,
      color: 0xffffff,
      metalness: 0.96,
      roughness: 0.08,
    });
    const bronze = new THREE.MeshStandardMaterial({
      map: T.bronze,
      color: 0xffffff,
      metalness: 0.52,
      roughness: 0.48,
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
        map: T.fuller,
        color: 0xffffff,
        metalness: 0.82,
        roughness: 0.28,
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

    // Cabo: comprimento ~espada real, secção oval (empunhadura), cordame em bronze, pomo em roda.
    const gripLen = 0.38;
    const guardYBottom = 0.09 - 0.035;
    const gripCenterY = guardYBottom - gripLen / 2;
    T.gripLeather.repeat.set(3.4, 1.9);
    const gripMat = new THREE.MeshStandardMaterial({
      map: T.gripLeather,
      color: 0xffffff,
      roughness: 0.91,
      metalness: 0.04,
    });
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.049, 0.042, gripLen, 28, 1),
      gripMat,
    );
    grip.position.set(0, gripCenterY, 0);
    grip.scale.set(1.15, 1, 0.76);

    const gripCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.051, 0.048, 0.018, 20),
      bronze,
    );
    gripCollar.position.set(0, guardYBottom - 0.009, 0);
    gripCollar.scale.set(1.15, 1, 0.76);

    const gripWireYs = [0.025, -0.06, -0.145, -0.23, -0.3];
    const gripWires = gripWireYs.map((wy) => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.005, 8, 26), bronze);
      w.rotation.x = Math.PI / 2;
      w.position.set(0, wy, 0);
      w.scale.set(1.15, 1, 0.76);
      return w;
    });

    const lowerFerruleY = guardYBottom - gripLen - 0.012;
    const lowerFerrule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.051, 0.048, 0.024, 20),
      bronze,
    );
    lowerFerrule.position.set(0, lowerFerruleY, 0);
    lowerFerrule.scale.set(1.15, 1, 0.76);

    const pommelNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.037, 0.043, 0.056, 18),
      bronze,
    );
    pommelNeck.position.set(0, -0.377, 0);
    pommelNeck.scale.set(1.08, 1, 0.82);

    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.032, 28), bronze);
    pommel.position.set(0, -0.421, 0);
    pommel.scale.set(1.04, 1, 0.98);

    const pommelPeen = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), bronze);
    pommelPeen.position.set(0, -0.44, 0);

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
      gripCollar,
      grip,
      ...gripWires,
      lowerFerrule,
      pommelNeck,
      pommel,
      pommelPeen,
    );
    sword.rotation.z = Math.PI;
    // Sobe a espada para evitar ocultação da lâmina pelo chão/montículo.
    sword.position.set(0, 1.59, 0);
    this.scene.add(sword);

    /** Direção da luz-chave: 45° acima do horizonte (melhor leitura da lâmina). */
    const swordLightTarget = new THREE.Vector3(0, 1.42, 0);
    const lightElev = THREE.MathUtils.degToRad(45);
    const lightAzim = THREE.MathUtils.degToRad(38);
    const keyLightDir = new THREE.Vector3(
      Math.cos(lightElev) * Math.cos(lightAzim),
      Math.sin(lightElev),
      Math.cos(lightElev) * Math.sin(lightAzim),
    ).normalize();

    const spot = new THREE.SpotLight(0xffffff, 3.8, 42, Math.PI / 2.1, 0.45, 1);
    spot.position.copy(swordLightTarget).addScaledVector(keyLightDir, 7.4);
    spot.target.position.copy(swordLightTarget);
    this.scene.add(spot);
    this.scene.add(spot.target);

    // Reforço na lâmina: mesma inclinação (45°), mais próximo e cone mais fechado.
    const bladeSpot = new THREE.SpotLight(
      0xffffff,
      2.4,
      22,
      Math.PI / 4.5,
      0.35,
      1,
    );
    bladeSpot.position.copy(swordLightTarget).addScaledVector(keyLightDir, 5.6);
    bladeSpot.target.position.copy(swordLightTarget);
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

    /**
     * Pétalas: planos com textura de silhueta real (não sprites).
     * Rotação YXZ + X ≈ −90° deixa a pétala quase no plano do chão (horizontal), com leve inclinação.
     */
    const n = 72;
    const nTex = this.rosePetalTextures.length;
    for (let i = 0; i < n; i++) {
      const petalMap = this.rosePetalTextures[i % nTex]!;
      const pw = 0.15 + Math.random() * 0.12;
      const ph = 0.2 + Math.random() * 0.16;
      const geo = new THREE.PlaneGeometry(pw, ph);
      const mat = new THREE.MeshBasicMaterial({
        map: petalMap,
        color: 0xffffff,
        transparent: true,
        opacity: 0.84 + Math.random() * 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.order = "YXZ";
      m.rotation.y = Math.random() * Math.PI * 2;
      m.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.52;
      m.rotation.z = (Math.random() - 0.5) * 0.75;
      const r = 1.05 + Math.random() * 1.75;
      const a0 = (i / n) * Math.PI * 2 + Math.random() * 0.55;
      m.position.set(
        Math.cos(a0) * r,
        0.02 + Math.random() * 0.09,
        Math.sin(a0) * r,
      );
      this.scene.add(m);
      this.petals.push(m);
      const phase = Math.random() * Math.PI * 2;
      this.petalBase.push({
        phase,
        r,
        a0,
        hOff: 0.016 + Math.random() * 0.052,
        hAmp1: 0.045 + Math.random() * 0.095,
        hAmp2: 0.022 + Math.random() * 0.068,
        hAmp3: 0.012 + Math.random() * 0.048,
        hF1: 0.55 + Math.random() * 1.15,
        hF2: 0.95 + Math.random() * 1.35,
        hF3: 1.4 + Math.random() * 1.8,
        hP1: Math.random() * Math.PI * 2,
        hP2: Math.random() * Math.PI * 2,
        hP3: Math.random() * Math.PI * 2,
        rx0: m.rotation.x,
        ry0: m.rotation.y,
        rz0: m.rotation.z,
        wobbleXF: 0.65 + Math.random() * 1.5,
        wobbleXAmp: 0.07 + Math.random() * 0.14,
        wobbleYF: 0.45 + Math.random() * 1.0,
        wobbleYAmp: 0.1 + Math.random() * 0.16,
        spinRate: 0.0012 + Math.random() * 0.007,
      });
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
        const rr =
          b.r +
          Math.sin(t * 1.1 + b.phase) * 0.07 +
          Math.sin(t * 0.55 + b.phase * 1.3) * 0.04;
        m.position.x = Math.cos(ang) * rr;
        m.position.z = Math.sin(ang) * rr;
        const y =
          b.hOff +
          Math.sin(t * b.hF1 + b.hP1) * b.hAmp1 +
          Math.sin(t * b.hF2 + b.hP2) * b.hAmp2 +
          Math.sin(t * b.hF3 + b.hP3) * b.hAmp3;
        m.position.y = Math.max(0.02, y);
        m.rotation.order = "YXZ";
        m.rotation.x =
          b.rx0 + Math.sin(t * b.wobbleXF + b.hP1) * b.wobbleXAmp;
        m.rotation.y =
          b.ry0 +
          Math.sin(t * b.wobbleYF + b.phase) * b.wobbleYAmp +
          t * b.spinRate * 0.28;
        m.rotation.z = b.rz0 + t * b.spinRate;
        m.updateMatrixWorld(true);
        this.petalWorldBox.setFromObject(m);
        const floorClear = 0.014;
        const bottom = this.petalWorldBox.min.y;
        if (bottom < floorClear) {
          m.position.y += floorClear - bottom;
        }
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
    disposeMainMenuTextures(this.menuTextures);
    disposeRosePetalTextures(this.rosePetalTextures);
    this.rosePetalTextures = [];
    this.petals = [];
    this.petalBase = [];
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}
