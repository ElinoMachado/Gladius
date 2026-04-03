import * as THREE from "three";
import {
  FURACAO_ULT_JUMP_MS,
  UNIT_MOVE_SEGMENT_MS,
} from "../game/combatTiming";
import { axialToWorld, axialKey, hexDistance, type Axial } from "../game/hex";
import type { HexCell } from "../game/grid";
import type { Unit } from "../game/types";
import {
  bleedInstanceCount,
  burnInstanceCount,
  dotTickConsumeCount,
  hotInstanceCount,
  poisonInstanceCount,
  sumNextBleedTickDamage,
  sumNextBurnTickDamage,
  sumNextHotTickHeal,
  sumNextPoisonTickDamage,
} from "../game/dotInstances";
import { deslumbroInstancesCount } from "../game/effectInstances";

export type HitFlashTone = "normal" | "blood" | "heal_swirl" | "electric_chain";
import { BIOME_LABELS } from "../game/data/biomes";
import { enemyTierFromId, waveConfigFromIndex } from "../game/data/enemies";
import type { BiomeId } from "../game/types";
import { buildUnitBodyGroup, modelKeyForUnit } from "./unitModels";
import {
  applyBunkerTierMaterials,
  createBunkerStructureGroup,
  type BunkerRenderTier,
} from "./bunkerMesh";
import {
  connectToSfxOut,
  ensureAudioContext,
  playCometaArcanoImpact,
  resume as resumeWebAudio,
} from "../audio/combatSounds";

const BIOME_HEX_COLOR: Record<BiomeId, number> = {
  hub: 0x6b5a4a,
  floresta: 0x2d5a3d,
  pantano: 0x3d4a2a,
  montanhoso: 0x5a5a62,
  deserto: 0xc9b060,
  rochoso: 0x7a7068,
  vulcanico: 0x8b3a2a,
};

/**
 * Raio centro→vértice no grid axial (vizinhos a distância √3·HEX_SIZE; mesh com o mesmo raio encosta sem folga).
 */
const HEX_SIZE = 2.18;
/** Heróis com `flying`: altura base acima do hex (~4× a elevação inicial). */
const HERO_FLY_BASE_Y = 1.2;
/** Oscilação vertical (flutuar) em torno da base. */
const HERO_FLY_BOB_AMP = 0.26;
/** Sombra no chão (voo): ~metade do apotema; suavização nas bordas via textura radial. */
const FLYING_HERO_SHADOW_R =
  HEX_SIZE * (Math.sqrt(3) / 2) * 0.86 * 0.5;
const ARENA_HEX_RADIUS = 25;
/** Borda do pan: extensão do grid + folga (sem o anel decorativo removido). */
const COLISEUM_XZ_MAX = HEX_SIZE * Math.sqrt(3) * ARENA_HEX_RADIUS + 10;
const COLISEUM_XZ_MIN = -COLISEUM_XZ_MAX;
/** Frustum base ajustado ao tamanho da arena com hexes mais juntos. */
const ORTHO_FRUSTUM = 108;
/** Manter mesh de inimigo morto (invisível) até os números de dano usarem a posição (float ~950ms). */
const ENEMY_DEATH_MESH_HOLD_MS = 1050;

function createHexShape(size: number): THREE.Shape {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = size * Math.cos(a);
    const y = size * Math.sin(a);
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  sh.closePath();
  return sh;
}

/** Textura circular com alpha em gradiente (sombra “desfocada” sem shader). */
function createFlyingHeroShadowRadialTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, "rgba(0,0,0,0.4)");
  g.addColorStop(0.38, "rgba(0,0,0,0.22)");
  g.addColorStop(0.68, "rgba(0,0,0,0.08)");
  g.addColorStop(0.9, "rgba(0,0,0,0.02)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function isTypingTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement
  );
}

export class GameRenderer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  private hexMeshes = new Map<string, THREE.Mesh>();
  private unitMeshes = new Map<string, THREE.Group>();
  private readonly arenaRoot: THREE.Group;
  private throneGroup: THREE.Group;
  private roseParticles: THREE.Points | null = null;
  private animRose = 0;
  private moveOverlayGroup: THREE.Group | null = null;
  private attackOverlayGroup: THREE.Group | null = null;
  private enemyInspectMoveOverlayGroup: THREE.Group | null = null;
  private enemyInspectAttackOverlayGroup: THREE.Group | null = null;

  private readonly unitMoveAnims = new Map<
    string,
    { cells: Axial[]; segIndex: number; t: number; segSeconds: number }
  >();

  private readonly hitFlashState = new Map<
    string,
    { until: number; playerVictim: boolean; tone: HitFlashTone }
  >();
  private readonly atirarBursts: { group: THREE.Group; until: number }[] = [];
  private readonly plasmaBeamFx: { group: THREE.Group; until: number }[] = [];
  private readonly flyingProjectiles: {
    mesh: THREE.Mesh;
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y: number;
    t: number;
    T: number;
    style: "bullet" | "magic";
  }[] = [];
  /** Efeito estilo HQ (POW) no impacto da bala do pistoleiro. */
  private readonly comicPowBursts: {
    sprite: THREE.Sprite;
    baseScale: THREE.Vector3;
    t: number;
    T: number;
  }[] = [];
  private readonly golpeRelampagoBolts: {
    group: THREE.Group;
    t: number;
    T: number;
  }[] = [];
  private readonly sentencaOrbs: {
    mesh: THREE.Mesh;
    priestId: string;
    targetId: string;
    sx: number;
    sy: number;
    sz: number;
    t: number;
    T: number;
  }[] = [];
  private readonly sentencaExplosions: {
    group: THREE.Group;
    t: number;
    T: number;
    rings: THREE.Mesh[];
  }[] = [];
  private readonly duelFlameByUnit = new Map<string, THREE.Group>();
  /** Salto visual (ultimate pistoleiro): Y animado em `tick`; XZ atualizados em `syncUnits`. */
  private readonly heroUltJumpById = new Map<
    string,
    { startMs: number; durationMs: number; peakY: number; baseX: number; baseZ: number }
  >();
  private readonly bunkerRoots = new Map<string, THREE.Group>();
  private readonly bunkerHitFlashUntil = new Map<string, number>();
  /** Quando (ms perf.now) o herói deve ficar oculto ao entrar no bunker. */
  private readonly bunkerHideAtByHeroId = new Map<string, number>();
  /** Inimigo já removido do modelo: `perf.now` alvo para apagar a mesh (até lá fica invisível). */
  private readonly enemyDeathMeshRemoveAt = new Map<string, number>();
  /** Sombra circular no hex (herói com `flying`). */
  private readonly flyingHeroGroundShadows = new Map<string, THREE.Mesh>();
  private flyingHeroShadowSharedGeo: THREE.PlaneGeometry | null = null;
  private flyingHeroShadowSharedMat: THREE.MeshBasicMaterial | null = null;
  private readonly meleeSlashFx: { mesh: THREE.Mesh; until: number }[] = [];
  private readonly mortarShots: {
    mesh: THREE.Mesh;
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y0: number;
    arcH: number;
    t: number;
    T: number;
  }[] = [];
  private heroSelectionCone: THREE.Mesh | null = null;
  private heroSelectionTargetId: string | null = null;
  private readonly headScreenScratch = new THREE.Vector3();
  private readonly pointerNdcScratch = new THREE.Vector2();
  private readonly flashEmissiveScratch = new THREE.Color();

  private readonly clock = new THREE.Clock();
  private shieldPulsePhase = 0;
  /** Cometa arcano: cinemático de início de wave (câmera + VFX). */
  private cometaArcanoCinematic: null | {
    startMs: number;
    zoom0: number;
    pan0X: number;
    pan0Y: number;
    zoomWide: number;
    hubPanX: number;
    hubPanY: number;
    heroQ: number;
    heroR: number;
    comet: THREE.Group;
    shockRing: THREE.Mesh | null;
    anticipation: THREE.Group;
    hubLight: THREE.PointLight;
    glowMesh: THREE.Mesh;
    impactDone: boolean;
    onImpact: () => void;
    onComplete: () => void;
    camEnabledRestore: boolean;
  } = null;
  private readonly cometaHubPanScratch = new THREE.Vector2();
  /** Foco no plano XZ (lookAt). */
  private readonly pan = new THREE.Vector2(0, 0);
  /** Velocidade de pan no plano XZ (unidades mundo / s). */
  private readonly panVelocity = new THREE.Vector2(0, 0);
  /** >1 aproxima (frustum menor). Valor inicial mais alto = vista mais perto do herói. */
  private zoom = 1.55;
  private readonly keysDown = new Set<string>();
  private domCanvas: HTMLCanvasElement | null = null;
  /** Foco suave no plano XZ (world x, world z em .y). */
  private focusTarget: THREE.Vector2 | null = null;
  private fitCheckAcc = 0;
  private readonly camOffsetDir = new THREE.Vector3(85, 92, 85).normalize();
  private readonly camDistance = 152;
  /** Rotação Y da arena: alinha o setor do herói com a vista (radial → diagonal +X/+Z na tela). */
  private arenaYaw = 0;
  /** WASD + zoom só no combate (evita mexer na câmera atrás dos menus). */
  private cameraInputEnabled = false;

  private readonly rayGround = new THREE.Raycaster();
  private readonly rayStatus = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hitGround = new THREE.Vector3();
  private readonly panDragHitScratch = new THREE.Vector3();
  private readonly panDragBase = new THREE.Vector3();
  private readonly panDragHx = new THREE.Vector3();
  private readonly panDragHy = new THREE.Vector3();
  private readonly groundHitC = new THREE.Vector3();
  private readonly groundHitR = new THREE.Vector3();
  private readonly groundHitU = new THREE.Vector3();
  /** Arrastar com botão esquerdo no canvas (combate). */
  private panPointerDown = false;
  private panDragMoved = false;
  private panDragStartClientX = 0;
  private panDragStartClientY = 0;
  /** Última posição de ponteiro aplicada ao pan (delta em pixels → estável vs raycast em cadeia). */
  private panDragLastAppliedClientX = 0;
  private panDragLastAppliedClientY = 0;
  private suppressCanvasClick = false;
  private readonly ndcGroundCorners = [
    new THREE.Vector2(-1, -1),
    new THREE.Vector2(1, -1),
    new THREE.Vector2(1, 1),
    new THREE.Vector2(-1, 1),
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1520);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const fr = ORTHO_FRUSTUM;
    this.camera = new THREE.OrthographicCamera(
      (-fr * aspect) / 2,
      (fr * aspect) / 2,
      fr / 2,
      -fr / 2,
      0.1,
      720,
    );
    this.domCanvas = canvas;
    this.applyCameraPose();

    const amb = new THREE.AmbientLight(0xccc4dc, 0.55);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.95);
    dir.position.set(36, 88, 28);
    this.scene.add(dir);

    this.arenaRoot = new THREE.Group();
    this.scene.add(this.arenaRoot);

    this.throneGroup = this.buildThrone();
    this.arenaRoot.add(this.throneGroup);
    this.buildColiseumRing();

    window.addEventListener("resize", () => this.resize(canvas));
    this.resize(canvas);
    this.attachCameraControls(canvas);
  }

  setCameraInputEnabled(enabled: boolean): void {
    this.cameraInputEnabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.panVelocity.set(0, 0);
      this.focusTarget = null;
      this.panPointerDown = false;
      this.panDragMoved = false;
      this.suppressCanvasClick = false;
    }
  }

  /** Se o último gesto foi arrastar a câmera, o combate deve ignorar o `click` seguinte. */
  consumeCameraDragClick(): boolean {
    if (!this.suppressCanvasClick) return false;
    this.suppressCanvasClick = false;
    return true;
  }

  /**
   * Centraliza a vista no hex (combate); cancela com WASD.
   * @param alignArena — se true, roda a arena para alinhar o bioma desse hex à câmera (ex.: herói).
   */
  focusOnAxial(q: number, r: number, alignArena = false): void {
    if (alignArena) this.setArenaYawFromAxial(q, r);
    if (!this.focusTarget) this.focusTarget = new THREE.Vector2();
    this.worldPanInto(q, r, this.focusTarget);
  }

  /** Centraliza na hora (sem lerp), ex.: início do turno do jogador; alinha bioma ao herói. */
  snapCameraToAxial(q: number, r: number): void {
    this.setArenaYawFromAxial(q, r);
    this.worldPanInto(q, r, this.pan);
    this.focusTarget = null;
    this.panVelocity.set(0, 0);
    if (this.domCanvas) {
      this.applyCameraPose();
      this.clampPanIntoColiseum();
      this.applyCameraPose();
    }
  }

  /**
   * Mesma convenção que `Object3D.rotation.y` no Three.js: x' = x c + z s, z' = -x s + z c.
   * Pan da câmera fica neste espaço de mundo (hexes rodados com a arena).
   */
  private worldPanInto(q: number, r: number, out: THREE.Vector2): void {
    const { x, z } = axialToWorld(q, r, HEX_SIZE);
    const c = Math.cos(this.arenaYaw);
    const s = Math.sin(this.arenaYaw);
    out.set(x * c + z * s, -x * s + z * c);
  }

  /**
   * Cada bioma é um setor (ponta no hub, base no anel externo). A base é ~perpendicular ao raio hub→hex.
   * Rodamos a arena para o raio (profundidade do triângulo, em direção à base) coincidir com a “vertical”
   * do ecrã no chão — assim a base fica alinhada (horizontal na vista), não em diagonal.
   */
  private setArenaYawFromAxial(q: number, r: number): void {
    const { x, z } = axialToWorld(q, r, HEX_SIZE);
    const len = Math.hypot(x, z);
    if (len < 0.55) {
      this.arenaYaw = 0;
      this.arenaRoot.rotation.y = this.arenaYaw;
      return;
    }
    const alpha = Math.atan2(z, x);
    this.applyCameraPose();
    const ndcEps = 0.07;
    const c = this.intersectGroundNdc(0, 0, this.groundHitC);
    const uHit = this.intersectGroundNdc(0, ndcEps, this.groundHitU);
    let thetaU = Math.PI / 4;
    if (c && uHit) {
      const ux = uHit.x - c.x;
      const uz = uHit.z - c.z;
      const uLen = Math.hypot(ux, uz);
      if (uLen > 1e-7) {
        thetaU = Math.atan2(uz, ux);
      }
    }
    // Raio lógico tem ângulo α; após rotação Y da arena fica α − φ. Igualamos a “cima” no ecrã (θ_u).
    this.arenaYaw = alpha - thetaU;
    this.arenaRoot.rotation.y = this.arenaYaw;
  }

  clearCameraFocus(): void {
    this.focusTarget = null;
  }

  /**
   * Cometa arcano: afasta a câmera para o centro, cometa no hub, onda branca; `onImpact` ao tocar o chão;
   * depois foco no herói. Desativa input de câmera até ao fim (restaura o estado anterior).
   */
  startCometaArcanoCinematic(opts: {
    canvas: HTMLCanvasElement;
    heroQ: number;
    heroR: number;
    onImpact: () => void;
    onComplete: () => void;
  }): void {
    if (this.cometaArcanoCinematic) return;
    const camEnabledRestore = this.cameraInputEnabled;
    this.setCameraInputEnabled(false);
    this.focusTarget = null;
    this.panVelocity.set(0, 0);

    const S = 3;
    const { x, z } = axialToWorld(0, 0, HEX_SIZE);
    const g = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1.15 * S, 22, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd8e8ff,
        emissiveIntensity: 1.05,
        metalness: 0.12,
        roughness: 0.28,
      }),
    );
    g.add(ball);
    for (let i = 0; i < 6; i++) {
      const sm = new THREE.Mesh(
        new THREE.SphereGeometry((0.42 - i * 0.055) * S, 12, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.52 - i * 0.065,
        }),
      );
      sm.position.set(0, (2.1 + i * 1.05) * S, (-0.35 - i * 0.62) * S);
      g.add(sm);
    }
    g.position.set(x, 46 * S, z);
    g.visible = false;
    this.arenaRoot.add(g);

    const ant = new THREE.Group();
    ant.position.set(x, 0, z);
    const hubLight = new THREE.PointLight(0xffffff, 0, 70, 2);
    hubLight.position.set(0, 2.1, 0);
    ant.add(hubLight);
    const glowGeo = new THREE.CircleGeometry(7.5, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.12;
    ant.add(glowMesh);
    const pillarGeo = new THREE.CylinderGeometry(0.15, 2.8, 14, 24, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xf5f8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 7;
    ant.add(pillar);
    glowMesh.userData.pillar = pillar;
    this.arenaRoot.add(ant);

    const zoom0 = this.zoom;
    const hub = this.cometaHubPanScratch;
    this.worldPanInto(0, 0, hub);
    const zoomWide = Math.max(0.28, zoom0 * 0.38);

    this.cometaArcanoCinematic = {
      startMs: performance.now(),
      zoom0,
      pan0X: this.pan.x,
      pan0Y: this.pan.y,
      zoomWide,
      hubPanX: hub.x,
      hubPanY: hub.y,
      heroQ: opts.heroQ,
      heroR: opts.heroR,
      comet: g,
      shockRing: null,
      anticipation: ant,
      hubLight,
      glowMesh,
      impactDone: false,
      onImpact: opts.onImpact,
      onComplete: opts.onComplete,
      camEnabledRestore,
    };
    this.applyOrthoFrustum(opts.canvas);
  }

  private updateCometaArcanoCinematic(): void {
    const fx = this.cometaArcanoCinematic;
    if (!fx || !this.domCanvas) return;
    const canvas = this.domCanvas;
    const t = (performance.now() - fx.startMs) / 1000;
    const ease = (a: number, b: number, w: number) => a + (b - a) * w;
    const sm = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1);

    const T_ZOOM = 0.52;
    const T_LIGHT_START = 0.1;
    const T_FALL_START = 0.56;
    const T_IMPACT = 1.34;
    const T_SHAKE_END = T_IMPACT + 0.48;
    const T_RESTORE = 2.08;
    const T_DONE = 2.78;

    const S = 3;
    const fallH0 = 46 * S;
    const fallH1 = 1.25 * S;

    let zoomV = fx.zoom0;
    let basePanX = fx.pan0X;
    let basePanY = fx.pan0Y;

    if (t < T_ZOOM) {
      const w = sm(t / T_ZOOM);
      zoomV = ease(fx.zoom0, fx.zoomWide, w);
      basePanX = ease(fx.pan0X, fx.hubPanX, w);
      basePanY = ease(fx.pan0Y, fx.hubPanY, w);
    } else if (t < T_RESTORE) {
      zoomV = fx.zoomWide;
      basePanX = fx.hubPanX;
      basePanY = fx.hubPanY;
    } else {
      const w2 = sm(Math.min(1, (t - T_RESTORE) / Math.max(0.05, T_DONE - T_RESTORE)));
      const heroPan = this.cometaHubPanScratch;
      this.worldPanInto(fx.heroQ, fx.heroR, heroPan);
      zoomV = ease(fx.zoomWide, fx.zoom0, w2);
      basePanX = ease(fx.hubPanX, heroPan.x, w2);
      basePanY = ease(fx.hubPanY, heroPan.y, w2);
    }

    let panX = basePanX;
    let panY = basePanY;

    if (t < T_LIGHT_START) {
      fx.hubLight.intensity = 0;
      (fx.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      const pillar = fx.glowMesh.userData.pillar as THREE.Mesh | undefined;
      if (pillar) (pillar.material as THREE.MeshBasicMaterial).opacity = 0;
    } else if (t < T_FALL_START) {
      const w = sm((t - T_LIGHT_START) / (T_FALL_START - T_LIGHT_START));
      fx.hubLight.intensity = w * 6.2;
      (fx.glowMesh.material as THREE.MeshBasicMaterial).opacity = w * 0.42;
      const pillar = fx.glowMesh.userData.pillar as THREE.Mesh | undefined;
      if (pillar) (pillar.material as THREE.MeshBasicMaterial).opacity = w * 0.22;
    } else if (t < T_IMPACT) {
      const pulse = 1 + Math.sin(t * 26) * 0.08;
      fx.hubLight.intensity = 6.2 * pulse;
      (fx.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * pulse;
      const pillar = fx.glowMesh.userData.pillar as THREE.Mesh | undefined;
      if (pillar) (pillar.material as THREE.MeshBasicMaterial).opacity = 0.24 * pulse;
    } else {
      const fade = Math.max(0, 1 - (t - T_IMPACT) / 0.35);
      fx.hubLight.intensity = 6.2 * fade;
      (fx.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * fade;
      const pillar = fx.glowMesh.userData.pillar as THREE.Mesh | undefined;
      if (pillar) (pillar.material as THREE.MeshBasicMaterial).opacity = 0.24 * fade;
    }

    const falling = t >= T_FALL_START && t < T_IMPACT;
    fx.comet.visible = falling;
    if (falling) {
      const w = (t - T_FALL_START) / (T_IMPACT - T_FALL_START);
      const fe = w * w;
      fx.comet.position.y = ease(fallH0, fallH1, fe);
    }

    if (t >= T_IMPACT && !fx.impactDone) {
      fx.impactDone = true;
      try {
        resumeWebAudio();
        playCometaArcanoImpact();
      } catch {
        /* ignore */
      }
      fx.onImpact();
      fx.comet.visible = false;
      const { x: rx, z: rz } = axialToWorld(0, 0, HEX_SIZE);
      const geo = new THREE.RingGeometry(2.7, 4.65, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(rx, 0.14, rz);
      this.arenaRoot.add(ring);
      fx.shockRing = ring;
    }

    if (t >= T_IMPACT && t < T_SHAKE_END) {
      const age = t - T_IMPACT;
      const dec = Math.exp(-age * 8.5);
      panX += Math.sin(age * 118) * dec * 1.35;
      panY += Math.cos(age * 96) * dec * 1.1;
      panX += Math.sin(age * 203 + 0.7) * dec * 0.55;
      panY += Math.cos(age * 177 + 1.1) * dec * 0.5;
    }

    this.zoom = zoomV;
    this.pan.x = panX;
    this.pan.y = panY;
    this.applyOrthoFrustum(canvas);

    if (fx.shockRing) {
      const tr = t - T_IMPACT;
      if (tr >= 0) {
        const wr = Math.min(1, tr / 0.82);
        const s = 1 + wr * 36;
        fx.shockRing.scale.set(s, s, s);
        (fx.shockRing.material as THREE.MeshBasicMaterial).opacity =
          0.78 * (1 - wr);
      }
    }

    if (t >= T_DONE) {
      this.arenaRoot.remove(fx.comet);
      fx.comet.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      if (fx.shockRing) {
        this.arenaRoot.remove(fx.shockRing);
        fx.shockRing.geometry.dispose();
        (fx.shockRing.material as THREE.Material).dispose();
      }
      this.arenaRoot.remove(fx.anticipation);
      fx.anticipation.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      this.snapCameraToAxial(fx.heroQ, fx.heroR);
      this.setCameraInputEnabled(fx.camEnabledRestore);
      const done = fx.onComplete;
      this.cometaArcanoCinematic = null;
      done();
    }
  }

  queueUnitMoveAlongCells(
    unitId: string,
    cells: { q: number; r: number }[],
    segmentMs?: number,
  ): void {
    if (cells.length < 2) return;
    const ms = segmentMs ?? UNIT_MOVE_SEGMENT_MS;
    const segSeconds = Math.min(0.75, ms / 1000);
    this.unitMoveAnims.set(unitId, {
      cells: cells.map((c) => ({ q: c.q, r: c.r })),
      segIndex: 0,
      t: 0,
      segSeconds,
    });
  }

  isUnitMoveAnimating(unitId?: string): boolean {
    if (unitId === undefined) return this.unitMoveAnims.size > 0;
    return this.unitMoveAnims.has(unitId);
  }

  /** Flash no corpo da unidade (atingida, sangue no duelo, aura de cura). */
  triggerUnitHitFlash(
    unitId: string,
    playerVictim: boolean,
    tone: HitFlashTone = "normal",
  ): void {
    const now = performance.now();
    const cur = this.hitFlashState.get(unitId);
    const dur =
      tone === "heal_swirl"
        ? 2000
        : tone === "blood"
          ? 280
          : tone === "electric_chain"
            ? 520
            : 240;
    const until = Math.max(cur?.until ?? 0, now + dur);
    this.hitFlashState.set(unitId, { until, playerVictim, tone });
  }

  /**
   * Posição na tela acima do modelo (segue animação de movimento).
   * Chamar após `applyCameraPose` no mesmo frame (ex.: dentro de `tick`).
   */
  /** Topo do bunker (números de dano na estrutura). */
  worldBunkerTopToScreen(
    canvas: HTMLCanvasElement,
    bunkerQ?: number,
    bunkerR?: number,
    headY = 1.05,
  ): { x: number; y: number } | null {
    let root: THREE.Group | null = null;
    if (bunkerQ !== undefined && bunkerR !== undefined) {
      root = this.bunkerRoots.get(axialKey(bunkerQ, bunkerR)) ?? null;
    } else {
      root = this.bunkerRoots.values().next().value ?? null;
    }
    if (!root) return null;
    this.headScreenScratch.set(0, headY, 0);
    root.localToWorld(this.headScreenScratch);
    this.headScreenScratch.project(this.camera);
    if (this.headScreenScratch.z < -1 || this.headScreenScratch.z > 1)
      return null;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return {
      x: (this.headScreenScratch.x * 0.5 + 0.5) * w,
      y: (-this.headScreenScratch.y * 0.5 + 0.5) * h,
    };
  }

  /** Piscada vermelha no bunker ao receber dano. */
  triggerBunkerHitFlashAt(q: number, r: number): void {
    const k = axialKey(q, r);
    if (!this.bunkerRoots.has(k)) return;
    const now = performance.now();
    const prev = this.bunkerHitFlashUntil.get(k) ?? 0;
    this.bunkerHitFlashUntil.set(k, Math.max(prev, now + 280));
  }

  private clearBunkerMaterialFlash(root: THREE.Group): void {
    root.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial
      ) {
        obj.material.emissive.setHex(0);
        obj.material.emissiveIntensity = 0;
      }
    });
  }

  private updateBunkerHitFlash(now: number): void {
    const dur = 280;
    this.flashEmissiveScratch.setHex(0xff1a1a);
    for (const [k, root] of this.bunkerRoots) {
      const until = this.bunkerHitFlashUntil.get(k) ?? 0;
      if (until <= 0) continue;
      if (now >= until) {
        this.clearBunkerMaterialFlash(root);
        this.bunkerHitFlashUntil.delete(k);
        continue;
      }
      const phase = (until - now) / dur;
      const w = phase * phase;
      root.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial
        ) {
          obj.material.emissive.copy(this.flashEmissiveScratch);
          obj.material.emissiveIntensity = w * 1.45;
        }
      });
    }
  }

  /** Traço de corte rápido entre atacante e alvo (ex.: escravo com correntes). */
  triggerMeleeSlashBetween(attackerId: string, targetId: string): void {
    const a = this.unitMeshes.get(attackerId);
    const b = this.unitMeshes.get(targetId);
    if (!a || !b) return;
    const ax = a.position.x;
    const az = a.position.z;
    const bx = b.position.x;
    const bz = b.position.z;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 0.01;
    const midX = (ax + bx) * 0.5;
    const midZ = (az + bz) * 0.5;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(2.8, len * 0.92), 0.07, 0.42),
      new THREE.MeshBasicMaterial({
        color: 0xff5533,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
      }),
    );
    mesh.position.set(midX, 0.72, midZ);
    mesh.lookAt(bx, 0.72, bz);
    this.arenaRoot.add(mesh);
    this.meleeSlashFx.push({ mesh, until: performance.now() + 145 });
  }

  worldUnitHeadToScreen(
    canvas: HTMLCanvasElement,
    unitId: string,
    headY = 2.12,
  ): { x: number; y: number } | null {
    const g = this.unitMeshes.get(unitId);
    if (!g) return null;
    this.headScreenScratch.set(0, headY, 0);
    g.localToWorld(this.headScreenScratch);
    this.headScreenScratch.project(this.camera);
    if (this.headScreenScratch.z < -1 || this.headScreenScratch.z > 1)
      return null;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return {
      x: (this.headScreenScratch.x * 0.5 + 0.5) * w,
      y: (-this.headScreenScratch.y * 0.5 + 0.5) * h,
    };
  }

  /** Mesma altura que `worldUnitHeadToScreen`, sem depender da mesh (ex.: alvo já removido ao morrer). */
  worldAxialHeadToScreen(
    canvas: HTMLCanvasElement,
    q: number,
    r: number,
    headY = 2.12,
  ): { x: number; y: number } | null {
    const { x, z } = axialToWorld(q, r, HEX_SIZE);
    this.headScreenScratch.set(x, headY, z);
    this.headScreenScratch.project(this.camera);
    if (this.headScreenScratch.z < -1 || this.headScreenScratch.z > 1)
      return null;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return {
      x: (this.headScreenScratch.x * 0.5 + 0.5) * w,
      y: (-this.headScreenScratch.y * 0.5 + 0.5) * h,
    };
  }

  private clearUnitHitFlashMaterials(g: THREE.Group): void {
    g.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.userData?.role !== "bars" &&
        obj.userData?.role !== "shieldBubble" &&
        obj.userData?.role !== "bunkerPickProxy"
      ) {
        const m = obj.material;
        if (m instanceof THREE.MeshStandardMaterial) {
          m.emissive.setHex(0);
          m.emissiveIntensity = 0;
        }
      }
    });
  }

  private applyUnitHitFlashMaterials(
    g: THREE.Group,
    intensity: number,
    playerVictim: boolean,
    tone: HitFlashTone,
  ): void {
    if (tone === "blood") {
      this.flashEmissiveScratch.setHex(0xaa1520);
    } else if (tone === "heal_swirl") {
      this.flashEmissiveScratch.setHex(0x44dd88);
    } else if (tone === "electric_chain") {
      this.flashEmissiveScratch.setHex(0x88ddff);
    } else {
      this.flashEmissiveScratch.setHex(playerVictim ? 0x5599ff : 0xff7733);
    }
    g.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.userData?.role !== "bars" &&
        obj.userData?.role !== "shieldBubble" &&
        obj.userData?.role !== "bunkerPickProxy"
      ) {
        const m = obj.material;
        if (m instanceof THREE.MeshStandardMaterial) {
          m.emissive.copy(this.flashEmissiveScratch);
          m.emissiveIntensity =
            intensity * (tone === "electric_chain" ? 2.15 : 1.35);
        }
      }
    });
  }

  /** Inimigo morto: esconde o modelo mas mantém o grupo na cena para `worldUnitHeadToScreen` durante o float. */
  private scheduleEnemyDeathMeshInvisible(group: THREE.Group, id: string): void {
    this.clearEnemyTierLabel(group.userData.barRoot as THREE.Group | undefined);
    this.clearStatusVisuals(group);
    group.visible = false;
    if (!this.enemyDeathMeshRemoveAt.has(id)) {
      this.enemyDeathMeshRemoveAt.set(
        id,
        performance.now() + ENEMY_DEATH_MESH_HOLD_MS,
      );
    }
  }

  private removeUnitMeshCompletely(id: string, group: THREE.Group): void {
    this.clearEnemyTierLabel(group.userData.barRoot as THREE.Group | undefined);
    this.clearStatusVisuals(group);
    this.unitMoveAnims.delete(id);
    this.hitFlashState.delete(id);
    this.heroUltJumpById.delete(id);
    this.enemyDeathMeshRemoveAt.delete(id);
    this.removeFlyingHeroGroundShadow(id);
    this.arenaRoot.remove(group);
    this.unitMeshes.delete(id);
  }

  private ensureFlyingShadowTemplate(): {
    geo: THREE.PlaneGeometry;
    mat: THREE.MeshBasicMaterial;
  } {
    if (!this.flyingHeroShadowSharedGeo) {
      const d = FLYING_HERO_SHADOW_R * 2;
      this.flyingHeroShadowSharedGeo = new THREE.PlaneGeometry(d, d);
      const map = createFlyingHeroShadowRadialTexture();
      this.flyingHeroShadowSharedMat = new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        toneMapped: false,
      });
    }
    return {
      geo: this.flyingHeroShadowSharedGeo,
      mat: this.flyingHeroShadowSharedMat!,
    };
  }

  private removeFlyingHeroGroundShadow(unitId: string): void {
    const sh = this.flyingHeroGroundShadows.get(unitId);
    if (!sh) return;
    this.arenaRoot.remove(sh);
    this.flyingHeroGroundShadows.delete(unitId);
  }

  /** Projecta no chão a posição XZ do herói em voo (hex de apoio). */
  private updateFlyingHeroGroundShadows(): void {
    for (const [id, g] of this.unitMeshes) {
      const baseY = Number(g.userData.heroFlyBaseY) || 0;
      if (baseY <= 0) {
        this.removeFlyingHeroGroundShadow(id);
        continue;
      }
      const { geo, mat } = this.ensureFlyingShadowTemplate();
      let sh = this.flyingHeroGroundShadows.get(id);
      if (!sh) {
        sh = new THREE.Mesh(geo, mat);
        sh.rotation.x = -Math.PI / 2;
        sh.renderOrder = -2;
        sh.userData.role = "flyingHeroGroundShadow";
        this.arenaRoot.add(sh);
        this.flyingHeroGroundShadows.set(id, sh);
      }
      sh.position.set(g.position.x, 0.02, g.position.z);
    }
    for (const sid of [...this.flyingHeroGroundShadows.keys()]) {
      if (!this.unitMeshes.has(sid)) {
        this.removeFlyingHeroGroundShadow(sid);
      }
    }
  }

  private disposeStatusBadge(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const m = mesh.material as THREE.MeshBasicMaterial;
    if (m.map) {
      m.map.dispose();
    }
    m.dispose();
  }

  private disposeEnemyTierLabelMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const m = mesh.material as THREE.MeshBasicMaterial;
    if (m.map) m.map.dispose();
    m.dispose();
  }

  private makeEnemyTierLabelMesh(text: string, fillCss: string): THREE.Mesh {
    const isElite = text === "Elite";
    const fontPx = isElite ? 170 : 34;
    const c = document.createElement("canvas");
    c.width = isElite ? 800 : 160;
    c.height = isElite ? 280 : 56;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = fillCss;
    ctx.font = `bold ${fontPx}px Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, c.width / 2, c.height / 2 + (isElite ? 8 : 2));
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const gw = isElite ? 2.1 : 0.42;
    const gh = isElite ? 0.75 : 0.15;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), mat);
    mesh.renderOrder = 11;
    mesh.userData.role = "enemyTierLabel";
    return mesh;
  }

  private enemyTierLabelSpec(
    u: Unit,
    waveIndex: number | null,
  ): { text: string; fill: string } | null {
    if (u.isPlayer || !u.enemyArchetypeId || waveIndex == null || waveIndex < 1) {
      return null;
    }
    const cfg = waveConfigFromIndex(waveIndex);
    const tier = enemyTierFromId(u.enemyArchetypeId);
    if (tier === "emperor") return { text: "Boss", fill: "#a855f7" };
    if (tier === "boss") return { text: "Boss", fill: "#f97316" };
    if (tier === "elite" && cfg.isElite) return { text: "Elite", fill: "#3b82f6" };
    return null;
  }

  private ensureEnemyTierLabel(
    barRoot: THREE.Group,
    u: Unit,
    waveIndex: number | null,
  ): void {
    const spec = u.hp > 0 ? this.enemyTierLabelSpec(u, waveIndex) : null;
    const sig = spec ? `${spec.text}-${spec.fill}` : "";
    if (barRoot.userData.tierLabelSig === sig) return;
    const prev = barRoot.userData.tierLabelMesh as THREE.Mesh | undefined;
    if (prev) {
      barRoot.remove(prev);
      this.disposeEnemyTierLabelMesh(prev);
      delete barRoot.userData.tierLabelMesh;
    }
    barRoot.userData.tierLabelSig = sig;
    if (!spec) return;
    const mesh = this.makeEnemyTierLabelMesh(spec.text, spec.fill);
    mesh.position.set(0, 0.86, 0.02);
    barRoot.add(mesh);
    barRoot.userData.tierLabelMesh = mesh;
  }

  private clearEnemyTierLabel(barRoot: THREE.Group | undefined): void {
    if (!barRoot) return;
    const tl = barRoot.userData.tierLabelMesh as THREE.Mesh | undefined;
    if (!tl) return;
    barRoot.remove(tl);
    this.disposeEnemyTierLabelMesh(tl);
    delete barRoot.userData.tierLabelMesh;
    delete barRoot.userData.tierLabelSig;
  }

  private clearStatusVisuals(g: THREE.Group): void {
    const br = g.userData.barRoot as THREE.Group | undefined;
    const stack = br?.userData?.statusStack as THREE.Group | undefined;
    if (stack) {
      for (const ch of [...stack.children]) {
        this.disposeStatusBadge(ch as THREE.Mesh);
        stack.remove(ch);
      }
    }
    if (br?.userData) delete br.userData.statusSig;
    const hot = g.userData.hotGlowRing as THREE.Mesh | undefined;
    if (hot) {
      g.remove(hot);
      hot.geometry.dispose();
      (hot.material as THREE.Material).dispose();
      g.userData.hotGlowRing = undefined;
    }
    const pg = g.userData.poisonGlowRing as THREE.Mesh | undefined;
    if (pg) {
      g.remove(pg);
      pg.geometry.dispose();
      (pg.material as THREE.Material).dispose();
      g.userData.poisonGlowRing = undefined;
    }
    const bg = g.userData.bleedGlowRing as THREE.Mesh | undefined;
    if (bg) {
      g.remove(bg);
      bg.geometry.dispose();
      (bg.material as THREE.Material).dispose();
      g.userData.bleedGlowRing = undefined;
    }
    const dg = g.userData.deslumbroGlowRing as THREE.Mesh | undefined;
    if (dg) {
      g.remove(dg);
      dg.geometry.dispose();
      (dg.material as THREE.Material).dispose();
      g.userData.deslumbroGlowRing = undefined;
    }
    const bnr = g.userData.burnGlowRing as THREE.Mesh | undefined;
    if (bnr) {
      g.remove(bnr);
      bnr.geometry.dispose();
      (bnr.material as THREE.Material).dispose();
      g.userData.burnGlowRing = undefined;
    }
  }

  private makeStatusGlowRing(color: number, inner: number, outer: number): THREE.Mesh {
    const geo = new THREE.RingGeometry(inner, outer, 40);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData.role = "statusGlow";
    mesh.renderOrder = 3;
    return mesh;
  }

  private makeStatusBadgeMesh(
    label: string,
    turns: number,
    bg: string,
    fg: string,
    tooltipHtml: string,
  ): THREE.Mesh {
    const c = document.createElement("canvas");
    c.width = 112;
    c.height = 44;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);
    ctx.fillStyle = fg;
    ctx.font = "bold 20px Segoe UI, system-ui, sans-serif";
    ctx.fillText(`${label}  ${turns}`, 8, 30);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.15), mat);
    mesh.renderOrder = 12;
    mesh.userData.role = "statusBadge";
    mesh.userData.tooltipHtml = tooltipHtml;
    return mesh;
  }

  private updateStatusVisuals(g: THREE.Group, u: Unit): void {
    const barRoot = g.userData.barRoot as THREE.Group | undefined;
    if (!barRoot) return;
    if (u.hp <= 0) {
      this.clearEnemyTierLabel(barRoot);
      this.clearStatusVisuals(g);
      return;
    }
    const wantHot = !!(u.hot && u.hot.instances.length > 0);
    const wantPoison = !!(u.poison && u.poison.instances.length > 0);
    const wantBurn = !!(u.burn && u.burn.instances.length > 0);
    const wantBleed = !!(u.bleed && u.bleed.instances.length > 0);
    const wantDeslumbro = !u.isPlayer && deslumbroInstancesCount(u) > 0;
    const desN = deslumbroInstancesCount(u);
    const sig = `${wantHot ? 1 : 0}-${hotInstanceCount(u)}-${sumNextHotTickHeal(u)}-${wantPoison ? 1 : 0}-${poisonInstanceCount(u)}-${sumNextPoisonTickDamage(u)}-${wantBurn ? 1 : 0}-${burnInstanceCount(u)}-${sumNextBurnTickDamage(u)}-${wantBleed ? 1 : 0}-${bleedInstanceCount(u)}-${sumNextBleedTickDamage(u)}-${dotTickConsumeCount(u)}-${wantDeslumbro ? 1 : 0}-${desN}`;
    if (barRoot.userData.statusSig === sig) return;
    barRoot.userData.statusSig = sig;
    this.clearStatusVisuals(g);

    if (wantHot) {
      const ring = this.makeStatusGlowRing(0x44dd88, 0.46, 0.58);
      ring.position.y = 0.02;
      g.add(ring);
      g.userData.hotGlowRing = ring;
    }
    if (wantPoison) {
      const ring = this.makeStatusGlowRing(0xaa44dd, 0.58, 0.72);
      ring.position.y = 0.022;
      g.add(ring);
      g.userData.poisonGlowRing = ring;
    }
    if (wantBleed) {
      const ring = this.makeStatusGlowRing(0xc62828, 0.52, 0.66);
      ring.position.y = 0.023;
      g.add(ring);
      g.userData.bleedGlowRing = ring;
    }
    if (wantBurn) {
      const ring = this.makeStatusGlowRing(0xff6e40, 0.56, 0.7);
      ring.position.y = 0.024;
      g.add(ring);
      g.userData.burnGlowRing = ring;
    }
    if (wantDeslumbro) {
      const ring = this.makeStatusGlowRing(0x66b3ff, 0.62, 0.78);
      ring.position.y = 0.026;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.48;
      g.add(ring);
      g.userData.deslumbroGlowRing = ring;
    }

    let stack = barRoot.userData.statusStack as THREE.Group | undefined;
    if (!stack) {
      stack = new THREE.Group();
      stack.userData.role = "statusStack";
      stack.position.set(0, 0.52, 0);
      barRoot.add(stack);
      barRoot.userData.statusStack = stack;
    }
    let ix = 0;
    if (wantHot && u.hot) {
      const hi = hotInstanceCount(u);
      const hn = sumNextHotTickHeal(u);
      const hr = dotTickConsumeCount(u);
      const tip = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Cura contínua</div><p class="game-ui-tooltip-passive">${hi} instância(s) na fila. Próximo tick: +${hn} PV (consome ${hr}).</p></div>`;
      const m = this.makeStatusBadgeMesh(
        "♥",
        hi,
        "#143020",
        "#7dffb0",
        tip,
      );
      m.position.set(-0.2 + ix * 0.42, 0, 0.02);
      stack.add(m);
      ix++;
    }
    if (wantPoison && u.poison) {
      const pi = poisonInstanceCount(u);
      const pn = sumNextPoisonTickDamage(u);
      const pr = dotTickConsumeCount(u);
      const tip = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Veneno</div><p class="game-ui-tooltip-passive">${pi} instância(s) na fila. Próximo tick: ${pn} dano (consome ${pr}). Ignora defesa.</p></div>`;
      const m = this.makeStatusBadgeMesh(
        "☠",
        pi,
        "#2a1030",
        "#e8aaff",
        tip,
      );
      m.position.set(-0.2 + ix * 0.42, 0, 0.02);
      stack.add(m);
      ix++;
    }
    if (wantBleed && u.bleed) {
      const bi = bleedInstanceCount(u);
      const bn = sumNextBleedTickDamage(u);
      const br = dotTickConsumeCount(u);
      const tip = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Sangramento</div><p class="game-ui-tooltip-passive">${bi} instância(s) na fila. Próximo tick: ${bn} dano (consome ${br}).</p></div>`;
      const m = this.makeStatusBadgeMesh(
        "†",
        bi,
        "#301010",
        "#ff8a80",
        tip,
      );
      m.position.set(-0.2 + ix * 0.42, 0, 0.02);
      stack.add(m);
      ix++;
    }
    if (wantBurn && u.burn) {
      const bi = burnInstanceCount(u);
      const bn = sumNextBurnTickDamage(u);
      const br = dotTickConsumeCount(u);
      const tip = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Labareda</div><p class="game-ui-tooltip-passive">${bi} instância(s) na fila. Próximo tick: ${bn} dano (consome ${br}).</p></div>`;
      const m = this.makeStatusBadgeMesh(
        "♨",
        bi,
        "#3a1510",
        "#ffb088",
        tip,
      );
      m.position.set(-0.2 + ix * 0.42, 0, 0.02);
      stack.add(m);
      ix++;
    }
    if (wantDeslumbro) {
      const dn = deslumbroInstancesCount(u);
      const tip = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Deslumbro</div><p class="game-ui-tooltip-passive">${dn} instância(s) de efeito. +50% de dano recebido de todas as fontes. −1 após cada fase inimiga (não é DoT; ignora Amplicador/Dobra).</p></div>`;
      const m = this.makeStatusBadgeMesh(
        "✦",
        dn,
        "#0a1830",
        "#b8e0ff",
        tip,
      );
      m.position.set(-0.2 + ix * 0.42, 0, 0.02);
      stack.add(m);
    }
  }

  /** Tooltip HTML ao pairar nos ícones de status na barra da unidade. */
  pickStatusTooltip(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): { html: string } | null {
    const r = canvas.getBoundingClientRect();
    const mx = ((clientX - r.left) / r.width) * 2 - 1;
    const my = -((clientY - r.top) / r.height) * 2 + 1;
    this.pointerNdcScratch.set(mx, my);
    this.rayStatus.setFromCamera(this.pointerNdcScratch, this.camera);
    const objs: THREE.Object3D[] = [];
    for (const g of this.unitMeshes.values()) {
      const br = g.userData.barRoot as THREE.Group | undefined;
      const stack = br?.userData?.statusStack as THREE.Group | undefined;
      if (!stack) continue;
      for (const ch of stack.children) {
        if (ch.userData?.role === "statusBadge") objs.push(ch);
      }
    }
    const hits = this.rayStatus.intersectObjects(objs, false);
    if (hits.length === 0) return null;
    const html = hits[0]!.object.userData.tooltipHtml as string | undefined;
    if (!html) return null;
    return { html };
  }

  private updateHitFlashes(): void {
    const now = performance.now();
    for (const [id, st] of [...this.hitFlashState]) {
      const g = this.unitMeshes.get(id);
      if (!g || now >= st.until) {
        if (g) this.clearUnitHitFlashMaterials(g);
        this.hitFlashState.delete(id);
        continue;
      }
      const baseDur =
        st.tone === "heal_swirl"
          ? 2000
          : st.tone === "blood"
            ? 280
            : st.tone === "electric_chain"
              ? 520
              : 240;
      const phase = (st.until - now) / baseDur;
      let int = phase * phase;
      if (st.tone === "electric_chain") {
        int =
          0.35 +
          0.65 * (0.5 + 0.5 * Math.sin(now * 0.055 + phase * 6.2));
      }
      this.applyUnitHitFlashMaterials(g, int, st.playerVictim, st.tone);
    }
  }

  /** Altura Y total no ar: base + vai-e-vem (flutuar). */
  private heroFlyTotalY(nowMs: number, unitId: string, baseY: number): number {
    if (baseY <= 0) return 0;
    let h = 0;
    for (let i = 0; i < unitId.length; i++) {
      h = (h * 31 + unitId.charCodeAt(i)) | 0;
    }
    const phase = nowMs * 0.00185 + (h & 0x1ff) * 0.012;
    return baseY + HERO_FLY_BOB_AMP * Math.sin(phase);
  }

  /**
   * Referência: duas “pétalas” por lado, mesmo pivô na lateral do corpo —
   * superior grande (borda superior convexa, inferior mais recta, ponta aguda);
   * inferior menor, ligeiramente por baixo, mais horizontal.
   * Plano XY: charneira em (0,0), vão para +X (espelhar com scale.x negativo no lado esquerdo).
   */
  private createGoldenWingUpperLobeGeometry(): THREE.BufferGeometry {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(0.035, 0.08);
    sh.bezierCurveTo(0.32, 0.78, 0.72, 1.05, 1.08, 0.9);
    sh.lineTo(0.98, 0.38);
    sh.quadraticCurveTo(0.42, 0.04, 0, 0);
    sh.closePath();
    return new THREE.ShapeGeometry(sh, 18);
  }

  private createGoldenWingLowerLobeGeometry(): THREE.BufferGeometry {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(0.045, -0.05);
    sh.bezierCurveTo(0.52, 0.05, 0.95, -0.12, 1.12, -0.36);
    sh.lineTo(0.88, -0.34);
    sh.quadraticCurveTo(0.38, -0.14, 0, 0);
    sh.closePath();
    return new THREE.ShapeGeometry(sh, 16);
  }

  private buildGoldenFlyingWingsGroup(): THREE.Group {
    const root = new THREE.Group();
    root.userData.role = "flyingWings";
    /** Atrás do torso; alinhado ~altura média como no desenho. */
    root.position.set(0, 0.36, -0.58);

    const solidMat = new THREE.MeshStandardMaterial({
      color: 0xf5d24a,
      emissive: 0xffe9a8,
      emissiveIntensity: 0.62,
      metalness: 0.88,
      roughness: 0.12,
      side: THREE.DoubleSide,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c8,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const addWingSide = (side: -1 | 1): THREE.Group => {
      const pivot = new THREE.Group();
      /* Pivôs perto da coluna + maior abertura em Y: asas mais abertas e silhueta mais junta. */
      const spread = 0.26;
      pivot.position.set(side * spread, 1.0, 0.06);
      pivot.rotation.set(-0.11, side * 0.44, side * 0.04);

      const addLobePair = (
        geoFn: () => THREE.BufferGeometry,
        scaleX: number,
        scaleY: number,
        posY: number,
        zSolid: number,
        zGlow: number,
      ): void => {
        const g0 = geoFn();
        const solid = new THREE.Mesh(g0.clone(), solidMat);
        solid.scale.set(side * scaleX, scaleY, 1);
        solid.position.set(0, posY, zSolid);
        solid.userData.wingPulse = true;
        const glow = new THREE.Mesh(g0.clone(), glowMat);
        glow.scale.set(side * scaleX * 1.1, scaleY * 1.06, 1);
        glow.position.set(0, posY, zGlow);
        glow.userData.wingPulse = true;
        g0.dispose();
        pivot.add(glow);
        pivot.add(solid);
      };

      addLobePair(() => this.createGoldenWingUpperLobeGeometry(), 1.14, 1.36, 0.02, 0.04, -0.05);
      addLobePair(() => this.createGoldenWingLowerLobeGeometry(), 1.02, 1.18, -0.05, 0.025, -0.055);

      return pivot;
    };

    const pivotL = addWingSide(-1);
    const pivotR = addWingSide(1);
    root.add(pivotL);
    root.add(pivotR);
    root.userData.wingPivotL = pivotL;
    root.userData.wingPivotR = pivotR;
    return root;
  }

  /** Voo de herói: offset Y base em `heroFlyBaseY`; asas douradas (animação em sync). */
  private updateHeroFlyingVisual(
    g: THREE.Group,
    u: Unit,
    nowMs: number,
  ): void {
    const baseY =
      u.isPlayer && u.hp > 0 && u.flying ? HERO_FLY_BASE_Y : 0;
    g.userData.heroFlyBaseY = baseY;

    const wantWings = u.isPlayer && u.hp > 0 && u.flying;
    let wings = g.userData.flyingWingsRoot as THREE.Group | undefined;
    if (!wantWings) {
      if (wings) {
        g.remove(wings);
        this.disposeObject3D(wings);
        g.userData.flyingWingsRoot = undefined;
      }
      return;
    }
    if (!wings) {
      wings = this.buildGoldenFlyingWingsGroup();
      g.userData.flyingWingsRoot = wings;
      g.add(wings);
    }

    this.applyGoldenWingFlapAndPulse(wings, nowMs);
  }

  private applyGoldenWingFlapAndPulse(wings: THREE.Group, nowMs: number): void {
    const t = nowMs * 0.0011;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.15);
    const pivotL = wings.userData.wingPivotL as THREE.Group | undefined;
    const pivotR = wings.userData.wingPivotR as THREE.Group | undefined;
    if (pivotL && pivotR) {
      const f = 0.085 * Math.sin(t * 2.05);
      pivotL.rotation.z = 0.06 - f;
      pivotR.rotation.z = -0.06 + f;
    }
    wings.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.userData.wingPulse) return;
      const m = obj.material;
      if (m instanceof THREE.MeshStandardMaterial) {
        m.emissiveIntensity = 0.48 + 0.62 * pulse;
      } else if (m instanceof THREE.MeshBasicMaterial) {
        m.opacity = 0.26 + 0.36 * pulse;
      }
    });
  }

  /**
   * Flutuar e batimento das asas rodam no `tick`; `syncUnits` só corre em mudanças de estado.
   */
  private updateFlyingHeroPerFrameMotion(nowMs: number): void {
    for (const [id, g] of this.unitMeshes) {
      if (this.unitMoveAnims.has(id) || this.heroUltJumpById.has(id)) continue;
      const baseY = Number(g.userData.heroFlyBaseY) || 0;
      if (baseY <= 0) continue;
      const { x, z } = g.position;
      g.position.set(x, this.heroFlyTotalY(nowMs, id, baseY), z);
      const wings = g.userData.flyingWingsRoot as THREE.Group | undefined;
      if (wings) this.applyGoldenWingFlapAndPulse(wings, nowMs);
    }
  }

  private updateUnitMoveAnims(dt: number): void {
    for (const id of [...this.unitMoveAnims.keys()]) {
      const a = this.unitMoveAnims.get(id);
      if (!a) continue;
      const g = this.unitMeshes.get(id);
      if (!g) {
        this.unitMoveAnims.delete(id);
        continue;
      }
      const i = a.segIndex;
      if (i >= a.cells.length - 1) {
        this.unitMoveAnims.delete(id);
        continue;
      }
      const u = a.cells[i]!;
      const v = a.cells[i + 1]!;
      const p0 = axialToWorld(u.q, u.r, HEX_SIZE);
      const p1 = axialToWorld(v.q, v.r, HEX_SIZE);
      a.t += dt;
      const p = Math.min(1, a.t / a.segSeconds);
      const now = performance.now();
      const flyY = this.heroFlyTotalY(
        now,
        id,
        Number(g.userData.heroFlyBaseY) || 0,
      );
      g.position.set(
        THREE.MathUtils.lerp(p0.x, p1.x, p),
        flyY,
        THREE.MathUtils.lerp(p0.z, p1.z, p),
      );
      if (p >= 1) {
        a.segIndex++;
        a.t = 0;
        if (a.segIndex >= a.cells.length - 1) {
          this.unitMoveAnims.delete(id);
        }
      }
    }
  }

  private clientToNdc(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(r.width, 1);
    const h = Math.max(r.height, 1);
    return {
      x: ((clientX - r.left) / w) * 2 - 1,
      y: -((clientY - r.top) / h) * 2 + 1,
    };
  }

  /** Interseção do raio (NDC) com o plano do chão Y=0; escreve em `out` se fornecido. */
  private intersectGroundNdc(
    ndcX: number,
    ndcY: number,
    out?: THREE.Vector3,
  ): THREE.Vector3 | null {
    this.rayGround.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const dst = out ?? this.panDragHitScratch;
    if (!this.rayGround.ray.intersectPlane(this.groundPlane, dst)) return null;
    return dst;
  }

  /**
   * Pan a partir do deslocamento em pixels entre dois eventos de ponteiro.
   * Usa a derivada (∂world/∂ndc) no plano Y=0 em vez de “hit anterior − hit atual” após cada
   * reposição da câmera — evita erro numérico e sacudidela com vista ortográfica oblíqua.
   */
  private applyPanDeltaFromClientPixels(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
    prevClientX: number,
    prevClientY: number,
  ): void {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(r.width, 1);
    const h = Math.max(r.height, 1);
    const dndcX = ((clientX - prevClientX) / w) * 2;
    const dndcY = -((clientY - prevClientY) / h) * 2;
    if (Math.abs(dndcX) < 1e-8 && Math.abs(dndcY) < 1e-8) return;

    this.applyCameraPose();

    const ndc = this.clientToNdc(canvas, clientX, clientY);
    const hNdc = 0.002;
    const base = this.intersectGroundNdc(ndc.x, ndc.y, this.panDragBase);
    const hx = this.intersectGroundNdc(ndc.x + hNdc, ndc.y, this.panDragHx);
    const hy = this.intersectGroundNdc(ndc.x, ndc.y + hNdc, this.panDragHy);
    if (!base || !hx || !hy) return;

    const invH = 1 / hNdc;
    const jxx = (hx.x - base.x) * invH;
    const jzx = (hx.z - base.z) * invH;
    const jxy = (hy.x - base.x) * invH;
    const jzy = (hy.z - base.z) * invH;

    const dWx = jxx * dndcX + jxy * dndcY;
    const dWz = jzx * dndcX + jzy * dndcY;

    this.pan.x -= dWx;
    this.pan.y -= dWz;
  }

  /** Pan (WASD) + zoom (roda) + arrastar botão esquerdo no plano da arena. */
  private attachCameraControls(canvas: HTMLCanvasElement): void {
    const dragThresholdPx = 6;

    canvas.addEventListener("pointerdown", (e) => {
      if (!this.cameraInputEnabled || isTypingTarget(e.target)) return;
      if (e.button !== 0) return;
      const ndc = this.clientToNdc(canvas, e.clientX, e.clientY);
      const hit = this.intersectGroundNdc(ndc.x, ndc.y);
      if (!hit) return;
      this.panPointerDown = true;
      this.panDragMoved = false;
      this.panDragStartClientX = e.clientX;
      this.panDragStartClientY = e.clientY;
      this.panDragLastAppliedClientX = e.clientX;
      this.panDragLastAppliedClientY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.panPointerDown) return;
      const dx = e.clientX - this.panDragStartClientX;
      const dy = e.clientY - this.panDragStartClientY;

      if (!this.panDragMoved) {
        if (Math.hypot(dx, dy) < dragThresholdPx) {
          this.panDragLastAppliedClientX = e.clientX;
          this.panDragLastAppliedClientY = e.clientY;
          return;
        }
        this.panVelocity.set(0, 0);
        this.panDragMoved = true;
      }

      const lx = this.panDragLastAppliedClientX;
      const ly = this.panDragLastAppliedClientY;
      this.applyPanDeltaFromClientPixels(canvas, e.clientX, e.clientY, lx, ly);
      this.panDragLastAppliedClientX = e.clientX;
      this.panDragLastAppliedClientY = e.clientY;
      this.focusTarget = null;
      this.applyCameraPose();
    });

    const endPanPointer = (e: PointerEvent) => {
      if (!this.panPointerDown) return;
      if (e.type === "pointerup" && e.button !== 0) return;
      const hadDrag = this.panDragMoved;
      this.panPointerDown = false;
      if (hadDrag) this.suppressCanvasClick = true;
      this.panDragMoved = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      /** Após arrastar: um único clamp (evita lutar com o pan em cada `tick`). */
      if (hadDrag) {
        this.applyCameraPose();
        this.clampPanIntoColiseum();
        this.applyCameraPose();
      }
    };
    canvas.addEventListener("pointerup", endPanPointer);
    canvas.addEventListener("pointercancel", endPanPointer);

    window.addEventListener("keydown", (e) => {
      if (!this.cameraInputEnabled || isTypingTarget(e.target)) return;
      if (
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD"
      ) {
        e.preventDefault();
        this.keysDown.add(e.code);
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keysDown.delete(e.code);
    });
    window.addEventListener(
      "wheel",
      (e) => {
        if (!this.cameraInputEnabled || isTypingTarget(e.target)) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0018);
        this.zoom = THREE.MathUtils.clamp(this.zoom * factor, 0.12, 5.5);
        this.applyOrthoFrustum(canvas);
        this.applyCameraPose();
        this.clampZoomOutToColiseumFit(canvas);
        this.applyCameraPose();
        this.clampPanIntoColiseum();
        this.applyCameraPose();
      },
      { passive: false },
    );
  }

  private applyOrthoFrustum(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const aspect = w / Math.max(h, 1);
    const fr = ORTHO_FRUSTUM / this.zoom;
    this.camera.left = (-fr * aspect) / 2;
    this.camera.right = (fr * aspect) / 2;
    this.camera.top = fr / 2;
    this.camera.bottom = -fr / 2;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Menor `fr` (altura total ortográfica, como em applyOrthoFrustum) em que o coliseu
   * ainda fica inteiro no chão; zoom out não pode usar fr maior que isso.
   */
  private computeTightFrForFullColiseum(): number {
    if (!this.domCanvas) return 400;
    const w = this.domCanvas.clientWidth;
    const h = Math.max(this.domCanvas.clientHeight, 1);
    const aspect = w / h;
    const lo = COLISEUM_XZ_MIN;
    const hi = COLISEUM_XZ_MAX;
    const eps = 1.1;

    let low = 12;
    let high = 420;
    for (let i = 0; i < 28; i++) {
      const mid = (low + high) / 2;
      this.camera.left = (-mid * aspect) / 2;
      this.camera.right = (mid * aspect) / 2;
      this.camera.top = mid / 2;
      this.camera.bottom = -mid / 2;
      this.camera.updateProjectionMatrix();
      this.applyCameraPose();
      const b = this.getViewBoundsOnGround();
      const ok =
        b !== null &&
        b.minX <= lo + eps &&
        b.maxX >= hi - eps &&
        b.minZ <= lo + eps &&
        b.maxZ >= hi - eps;
      if (ok) high = mid;
      else low = mid;
    }
    return high;
  }

  private clampZoomOutToColiseumFit(canvas: HTMLCanvasElement): void {
    const frCap = this.computeTightFrForFullColiseum();
    this.applyOrthoFrustum(canvas);
    const frWant = ORTHO_FRUSTUM / this.zoom;
    if (frWant > frCap + 0.02) {
      this.zoom = ORTHO_FRUSTUM / frCap;
      this.applyOrthoFrustum(canvas);
    }
  }

  private applyCameraPose(): void {
    const target = new THREE.Vector3(this.pan.x, 0, this.pan.y);
    this.camera.position
      .copy(target)
      .addScaledVector(this.camOffsetDir, this.camDistance);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
  }

  /** Interseção dos cantos do frustum com o plano do chão (Y=0). */
  private getViewBoundsOnGround(): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const ndc of this.ndcGroundCorners) {
      this.rayGround.setFromCamera(ndc, this.camera);
      if (!this.rayGround.ray.intersectPlane(this.groundPlane, this.hitGround))
        continue;
      minX = Math.min(minX, this.hitGround.x);
      maxX = Math.max(maxX, this.hitGround.x);
      minZ = Math.min(minZ, this.hitGround.z);
      maxZ = Math.max(maxZ, this.hitGround.z);
    }
    if (!Number.isFinite(minX)) return null;
    return { minX, maxX, minZ, maxZ };
  }

  /** Impede a vista de mostrar fora da arena (ajusta pan até encostar nas bordas). */
  private clampPanIntoColiseum(): void {
    /** Arena rodada: caixa alinhada aos eixos precisa de folga extra (~√2). */
    const extent = COLISEUM_XZ_MAX * 1.42;
    const lo = -extent;
    const hi = extent;
    const allow = hi - lo;
    let bumped = false;

    for (let iter = 0; iter < 12; iter++) {
      const b = this.getViewBoundsOnGround();
      if (!b) break;

      let dx = 0;
      const spanX = b.maxX - b.minX;
      if (spanX >= allow) {
        const cx = (b.minX + b.maxX) * 0.5;
        const mid = (lo + hi) * 0.5;
        dx = mid - cx;
      } else {
        if (b.minX < lo) dx += lo - b.minX;
        if (b.maxX > hi) dx -= b.maxX - hi;
      }

      let dz = 0;
      const spanZ = b.maxZ - b.minZ;
      if (spanZ >= allow) {
        const cz = (b.minZ + b.maxZ) * 0.5;
        const mid = (lo + hi) * 0.5;
        dz = mid - cz;
      } else {
        if (b.minZ < lo) dz += lo - b.minZ;
        if (b.maxZ > hi) dz -= b.maxZ - hi;
      }

      if (Math.abs(dx) < 0.02 && Math.abs(dz) < 0.02) break;

      bumped = true;
      this.pan.x += dx;
      this.pan.y += dz;
      this.applyCameraPose();
    }

    if (bumped) {
      this.panVelocity.multiplyScalar(0.18);
    }
  }

  private updateFocusLerp(dt: number): void {
    if (!this.focusTarget || !this.cameraInputEnabled) return;
    if (this.panDragMoved) return;
    if (this.keysDown.size > 0) {
      this.focusTarget = null;
      return;
    }
    const k = 1 - Math.exp(-11 * dt);
    this.pan.x += (this.focusTarget.x - this.pan.x) * k;
    this.pan.y += (this.focusTarget.y - this.pan.y) * k;
    if (
      Math.hypot(this.focusTarget.x - this.pan.x, this.focusTarget.y - this.pan.y) <
      0.14
    ) {
      this.pan.x = this.focusTarget.x;
      this.pan.y = this.focusTarget.y;
      this.focusTarget = null;
    }
  }

  private updateCameraPan(dt: number): void {
    if (!this.cameraInputEnabled || !this.domCanvas) return;

    /** Câmera alinhada ao pan atual para o raycast bater com o frame visível. */
    this.applyCameraPose();

    const fr = ORTHO_FRUSTUM / this.zoom;
    const maxSpeed = 34 * (fr / ORTHO_FRUSTUM);

    const ix =
      (this.keysDown.has("KeyD") ? 1 : 0) - (this.keysDown.has("KeyA") ? 1 : 0);
    const iy =
      (this.keysDown.has("KeyW") ? 1 : 0) - (this.keysDown.has("KeyS") ? 1 : 0);

    let tx = 0;
    let tz = 0;
    const ndcEps = 0.07;
    const c = this.intersectGroundNdc(0, 0, this.groundHitC);
    const r = this.intersectGroundNdc(ndcEps, 0, this.groundHitR);
    const u = this.intersectGroundNdc(0, ndcEps, this.groundHitU);
    if (c && r && u) {
      let rx = r.x - c.x;
      let rz = r.z - c.z;
      let ux = u.x - c.x;
      let uz = u.z - c.z;
      const rLen = Math.hypot(rx, rz);
      const uLen = Math.hypot(ux, uz);
      if (rLen > 1e-7 && uLen > 1e-7) {
        rx /= rLen;
        rz /= rLen;
        ux /= uLen;
        uz /= uLen;
        tx = rx * ix + ux * iy;
        tz = rz * ix + uz * iy;
        const vLen = Math.hypot(tx, tz);
        if (vLen > 1e-7) {
          tx /= vLen;
          tz /= vLen;
        }
      }
    }
    if (Math.hypot(tx, tz) < 1e-7) {
      if (this.keysDown.has("KeyW")) tz -= 1;
      if (this.keysDown.has("KeyS")) tz += 1;
      if (this.keysDown.has("KeyA")) tx -= 1;
      if (this.keysDown.has("KeyD")) tx += 1;
      const len = Math.hypot(tx, tz);
      if (len > 1e-6) {
        tx /= len;
        tz /= len;
      }
    }

    const targetVx = tx * maxSpeed;
    const targetVz = tz * maxSpeed;
    const follow = 1 - Math.exp(-5.2 * dt);
    this.panVelocity.x += (targetVx - this.panVelocity.x) * follow;
    this.panVelocity.y += (targetVz - this.panVelocity.y) * follow;

    const anyKey =
      this.keysDown.has("KeyW") ||
      this.keysDown.has("KeyA") ||
      this.keysDown.has("KeyS") ||
      this.keysDown.has("KeyD");
    if (!anyKey) {
      const damp = Math.exp(-9 * dt);
      this.panVelocity.x *= damp;
      this.panVelocity.y *= damp;
    }

    this.pan.x += this.panVelocity.x * dt;
    this.pan.y += this.panVelocity.y * dt;
  }

  resize(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.applyOrthoFrustum(canvas);
    this.applyCameraPose();
    this.clampZoomOutToColiseumFit(canvas);
    this.applyCameraPose();
    this.clampPanIntoColiseum();
    this.applyCameraPose();
  }

  private buildThrone(): THREE.Group {
    const g = new THREE.Group();
    g.position.set(COLISEUM_XZ_MIN * 0.9, 0, COLISEUM_XZ_MIN * 0.78);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.6 }),
    );
    seat.position.y = 0.7;
    g.add(seat);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3d2818 }),
    );
    back.position.set(0, 1.8, -0.5);
    g.add(back);
    const emperor = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4af7a }),
    );
    emperor.position.set(0, 1.35, 0.2);
    g.add(emperor);
    return g;
  }

  private buildColiseumRing(): void {
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const count = 220;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    let i = 0;
    const crowdR = COLISEUM_XZ_MAX * 0.92;
    for (; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const r = crowdR + Math.random() * 2.2;
      p.set(Math.cos(t) * r, Math.random() * 0.4, Math.sin(t) * r);
      e.set(0, Math.random() * 0.3, 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.arenaRoot.add(mesh);
  }

  buildHexGrid(grid: Map<string, HexCell>): void {
    for (const m of this.hexMeshes.values()) this.arenaRoot.remove(m);
    this.hexMeshes.clear();
    /* Mesmo raio do passo do grid — hexes compartilham arestas (ligeiro inset evita z-fight). */
    const shape = createHexShape(HEX_SIZE * 0.998);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    for (const cell of grid.values()) {
      const mat = new THREE.MeshStandardMaterial({
        color: BIOME_HEX_COLOR[cell.biome],
        roughness: 0.85,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
      mesh.position.set(x, 0, z);
      mesh.userData.hexKey = axialKey(cell.q, cell.r);
      mesh.userData.biomeLabel = BIOME_LABELS[cell.biome];
      this.arenaRoot.add(mesh);
      this.hexMeshes.set(axialKey(cell.q, cell.r), mesh);
    }
  }

  /** Atualiza/instancia modelos 3D das unidades; herói some visualmente se o seu hex tiver bunker com PV. */
  syncUnits(units: Unit[], combatWaveIndex?: number | null): void {
    const now = performance.now();
    const seen = new Set<string>();
    for (const u of units) {
      if (u.hp <= 0 && !u.isPlayer) {
        const g = this.unitMeshes.get(u.id);
        if (g) {
          g.userData.isPlayer = false;
          this.scheduleEnemyDeathMeshInvisible(g, u.id);
        }
        continue;
      }
      seen.add(u.id);
      let g = this.unitMeshes.get(u.id);
      if (!g) {
        g = new THREE.Group();
        g.userData.unitId = u.id;
        g.userData.isPlayer = u.isPlayer;
        this.arenaRoot.add(g);
        this.unitMeshes.set(u.id, g);
      }
      g.userData.isPlayer = u.isPlayer;
      g.visible = true;
      this.enemyDeathMeshRemoveAt.delete(u.id);
      const mk = modelKeyForUnit(u);
      if (g.userData.modelKey !== mk) {
        for (let i = g.children.length - 1; i >= 0; i--) {
          const ch = g.children[i]!;
          if (ch.userData?.role === "bars") continue;
          if (ch.userData?.role === "shieldBubble") continue;
          if (ch.userData?.role === "bunkerPickProxy") continue;
          if (ch.userData?.role === "flyingWings") continue;
          this.disposeObject3D(ch);
          g.remove(ch);
        }
        const body = buildUnitBodyGroup(u);
        body.userData.role = "body";
        g.add(body);
        g.userData.modelKey = mk;
      }
      this.updateHeroFlyingVisual(g, u, now);
      if (!this.unitMoveAnims.has(u.id)) {
        const { x, z } = axialToWorld(u.q, u.r, HEX_SIZE);
        const flyY = this.heroFlyTotalY(
          now,
          u.id,
          Number(g.userData.heroFlyBaseY) || 0,
        );
        const ju = this.heroUltJumpById.get(u.id);
        if (ju) {
          ju.baseX = x;
          ju.baseZ = z;
        } else {
          g.position.set(x, flyY, z);
        }
      }
      /** 2× no gigante: evita cobrir inimigos no raycast (antes 5×). */
      const furyScale =
        u.isPlayer && (u.furiaGiganteTurns ?? 0) > 0 ? 2 : 1;
      g.scale.setScalar(furyScale);
      g.userData.unitId = u.id;
      this.ensureUnitBars(g, u);
      const br = g.userData.barRoot as THREE.Group | undefined;
      if (br) this.ensureEnemyTierLabel(br, u, combatWaveIndex ?? null);
      this.ensureShieldBubble(g, u);
      const furyBarShieldInv = furyScale > 1 ? 1 / furyScale : 1;
      if (br) br.scale.setScalar(furyBarShieldInv);
      const sb = g.userData.shieldBubble as THREE.Mesh | undefined;
      if (sb) sb.scale.setScalar(furyBarShieldInv);
      this.updateStatusVisuals(g, u);
      const onBunkerHex =
        u.isPlayer && u.hp > 0 && this.bunkerRoots.has(axialKey(u.q, u.r));
      if (!onBunkerHex) this.bunkerHideAtByHeroId.delete(u.id);
      const hideAt = this.bunkerHideAtByHeroId.get(u.id);
      this.applyBunkerOccupantVisual(
        g,
        u,
        onBunkerHex && (hideAt === undefined || now >= hideAt),
      );
      if (u.isPlayer && u.hp <= 0) {
        const br = g.userData.barRoot as THREE.Group | undefined;
        if (br) br.visible = false;
        const sb = g.userData.shieldBubble as THREE.Mesh | undefined;
        if (sb) sb.visible = false;
      }
    }
    // Chamas de duelo continuam visíveis; podem ser afinadas depois caso desejado.
    for (const [id, g] of this.unitMeshes) {
      if (seen.has(id)) continue;
      const stillAlive = units.some((u) => u.id === id && u.hp > 0);
      if (stillAlive) continue;

      if (g.userData.isPlayer === true) {
        const heroStill = units.find((x) => x.id === id);
        if (heroStill && heroStill.hp <= 0) continue;
        this.removeUnitMeshCompletely(id, g);
        continue;
      }

      const removeAt = this.enemyDeathMeshRemoveAt.get(id);
      if (removeAt === undefined) {
        this.scheduleEnemyDeathMeshInvisible(g, id);
        continue;
      }
      if (now < removeAt) {
        g.visible = false;
        continue;
      }
      this.removeUnitMeshCompletely(id, g);
    }
    for (const id of [...this.duelFlameByUnit.keys()]) {
      if (!this.unitMeshes.has(id)) {
        const root = this.duelFlameByUnit.get(id)!;
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
        this.duelFlameByUnit.delete(id);
      }
    }
  }

  /**
   * Agenda ocultar o herói ao fim do movimento até ao bunker.
   * Deve ser chamado quando o jogo coloca `u.q/u.r` já no destino mas o mesh ainda está a animar hex-a-hex.
   */
  scheduleHeroHideInBunkerAfterMove(heroId: string, delayMs: number): void {
    const until = performance.now() + Math.max(0, delayMs);
    const prev = this.bunkerHideAtByHeroId.get(heroId);
    this.bunkerHideAtByHeroId.set(heroId, Math.max(prev ?? 0, until));
  }

  clearCombatOverlays(): void {
    this.disposeOverlayGroup(this.moveOverlayGroup);
    this.moveOverlayGroup = null;
    this.disposeOverlayGroup(this.attackOverlayGroup);
    this.attackOverlayGroup = null;
    this.disposeOverlayGroup(this.enemyInspectMoveOverlayGroup);
    this.enemyInspectMoveOverlayGroup = null;
    this.disposeOverlayGroup(this.enemyInspectAttackOverlayGroup);
    this.enemyInspectAttackOverlayGroup = null;
  }

  setMovementOverlay(keys: Set<string>): void {
    this.disposeOverlayGroup(this.moveOverlayGroup);
    this.moveOverlayGroup = keys.size
      ? this.buildHexOverlay(keys, 0x3399ff, 0.24, 0.1)
      : null;
    if (this.moveOverlayGroup) this.arenaRoot.add(this.moveOverlayGroup);
  }

  setAttackOverlay(keys: Set<string>): void {
    this.disposeOverlayGroup(this.attackOverlayGroup);
    this.attackOverlayGroup = keys.size
      ? this.buildHexOverlay(keys, 0xff2222, 0.45, 0.11)
      : null;
    if (this.attackOverlayGroup) this.arenaRoot.add(this.attackOverlayGroup);
  }

  /** Alcance de movimento do inimigo sob o rato (âmbar). */
  setEnemyInspectMovementOverlay(keys: Set<string>): void {
    this.disposeOverlayGroup(this.enemyInspectMoveOverlayGroup);
    this.enemyInspectMoveOverlayGroup = keys.size
      ? this.buildHexOverlay(keys, 0xffaa33, 0.42, 0.095)
      : null;
    if (this.enemyInspectMoveOverlayGroup)
      this.arenaRoot.add(this.enemyInspectMoveOverlayGroup);
  }

  /** Alcance de ataque básico do inimigo inspecionado ao clicar (magenta/rosa). */
  setEnemyInspectAttackOverlay(keys: Set<string>): void {
    this.disposeOverlayGroup(this.enemyInspectAttackOverlayGroup);
    this.enemyInspectAttackOverlayGroup = keys.size
      ? this.buildHexOverlay(keys, 0xe040a8, 0.4, 0.102)
      : null;
    if (this.enemyInspectAttackOverlayGroup)
      this.arenaRoot.add(this.enemyInspectAttackOverlayGroup);
  }

  private buildHexOverlay(
    keys: Set<string>,
    color: number,
    opacity: number,
    y: number,
  ): THREE.Group {
    const shape = createHexShape(HEX_SIZE * 0.96);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const group = new THREE.Group();
    for (const k of keys) {
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      const cell = k.split(",").map(Number) as [number, number];
      const { x, z } = axialToWorld(cell[0]!, cell[1]!, HEX_SIZE);
      mesh.position.set(x, y, z);
      group.add(mesh);
    }
    return group;
  }

  private disposeOverlayGroup(g: THREE.Group | null): void {
    if (!g) return;
    this.arenaRoot.remove(g);
    this.disposeGroup(g);
  }

  private ensureUnitBars(g: THREE.Group, u: Unit): void {
    let barRoot = g.userData.barRoot as THREE.Group | undefined;
    if (!barRoot) {
      barRoot = new THREE.Group();
      const hpW = 1.05;
      const hpH = 0.12;

      if (u.isPlayer) {
        const xpBg = new THREE.Mesh(
          new THREE.PlaneGeometry(hpW, 0.1),
          new THREE.MeshBasicMaterial({ color: 0x1a0a22 }),
        );
        xpBg.position.y = 0.34;
        xpBg.renderOrder = 2;
        const xpFill = new THREE.Mesh(
          new THREE.PlaneGeometry(hpW, 0.068),
          new THREE.MeshBasicMaterial({ color: 0xb94dff }),
        );
        xpFill.position.set(0, 0.34, 0.02);
        xpFill.renderOrder = 3;
        barRoot.add(xpBg);
        barRoot.add(xpFill);
        barRoot.userData.xpFill = xpFill;
        barRoot.userData.xpW = hpW;
      }

      const shY = u.isPlayer ? 0.22 : 0.24;
      const shH = 0.075;
      const shBg = new THREE.Mesh(
        new THREE.PlaneGeometry(hpW, shH),
        new THREE.MeshBasicMaterial({ color: 0x14141a }),
      );
      shBg.position.y = shY;
      shBg.renderOrder = 2;
      const shFill = new THREE.Mesh(
        new THREE.PlaneGeometry(hpW, shH * 0.72),
        new THREE.MeshBasicMaterial({ color: 0xeeeff7 }),
      );
      shFill.position.set(0, shY, 0.02);
      shFill.renderOrder = 3;
      barRoot.add(shBg);
      barRoot.add(shFill);
      barRoot.userData.shieldFill = shFill;
      barRoot.userData.shieldW = hpW;

      const hpY = u.isPlayer ? 0.08 : 0.12;
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(hpW, hpH),
        new THREE.MeshBasicMaterial({ color: 0x0d0d12 }),
      );
      hpBg.position.y = hpY;
      hpBg.renderOrder = 2;
      const hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(hpW, hpH * 0.68),
        new THREE.MeshBasicMaterial({ color: 0x33bb44 }),
      );
      hpFill.position.set(0, hpY, 0.02);
      hpFill.renderOrder = 3;
      barRoot.add(hpBg);
      barRoot.add(hpFill);
      barRoot.userData.hpFill = hpFill;
      barRoot.userData.hpW = hpW;

      if (u.isPlayer) {
        const manaY = -0.1;
        const manaBg = new THREE.Mesh(
          new THREE.PlaneGeometry(hpW, 0.09),
          new THREE.MeshBasicMaterial({ color: 0x12122a }),
        );
        manaBg.position.y = manaY;
        manaBg.renderOrder = 2;
        const manaFill = new THREE.Mesh(
          new THREE.PlaneGeometry(hpW, 0.06),
          new THREE.MeshBasicMaterial({ color: 0x3388ee }),
        );
        manaFill.position.set(0, manaY, 0.02);
        manaFill.renderOrder = 3;
        barRoot.add(manaBg);
        barRoot.add(manaFill);
        barRoot.userData.manaFill = manaFill;
        barRoot.userData.manaW = hpW;
      }

      barRoot.position.y = u.isPlayer ? 1.52 : 1.58;
      barRoot.userData.role = "bars";
      g.add(barRoot);
      g.userData.barRoot = barRoot;
    }
    this.updateUnitBars(barRoot, u);
  }

  private updateUnitBars(barRoot: THREE.Group, u: Unit): void {
    const shFill = barRoot.userData.shieldFill as THREE.Mesh | undefined;
    const shW = barRoot.userData.shieldW as number | undefined;
    if (shFill && shW !== undefined && u.maxHp > 0) {
      const sr = Math.max(
        0,
        Math.min(1, u.shieldGGBlue / Math.max(1, u.maxHp)),
      );
      shFill.scale.x = Math.max(0.02, sr);
      shFill.position.x = (shW * (sr - 1)) / 2;
    }

    const hpFill = barRoot.userData.hpFill as THREE.Mesh;
    const hpW = barRoot.userData.hpW as number;
    const ratio =
      u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
    hpFill.scale.x = Math.max(0.05, ratio);
    hpFill.position.x = (hpW * (ratio - 1)) / 2;
    const col = new THREE.Color().setRGB(
      1 - ratio,
      0.2 + 0.8 * ratio,
      0.08,
    );
    (hpFill.material as THREE.MeshBasicMaterial).color.copy(col);

    const manaFill = barRoot.userData.manaFill as THREE.Mesh | undefined;
    if (manaFill && u.maxMana > 0) {
      const mw = barRoot.userData.manaW as number;
      const mr = Math.max(0, Math.min(1, u.mana / u.maxMana));
      manaFill.scale.x = Math.max(0.05, mr);
      manaFill.position.x = (mw * (mr - 1)) / 2;
    }

    const xpFill = barRoot.userData.xpFill as THREE.Mesh | undefined;
    if (xpFill && u.isPlayer) {
      const xw = barRoot.userData.xpW as number;
      let xr = 1;
      if (Number.isFinite(u.xpToNext) && u.xpToNext > 0) {
        xr = Math.max(0, Math.min(1, u.xp / u.xpToNext));
      }
      xpFill.scale.x = Math.max(0.05, xr);
      xpFill.position.x = (xw * (xr - 1)) / 2;
    }
  }

  private ensureShieldBubble(g: THREE.Group, u: Unit): void {
    let bubble = g.userData.shieldBubble as THREE.Mesh | undefined;
    if (!bubble) {
      const geo = new THREE.SphereGeometry(0.9, 22, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x5cb0ff,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      bubble = new THREE.Mesh(geo, mat);
      bubble.position.y = 1.05;
      bubble.userData.role = "shieldBubble";
      bubble.renderOrder = 4;
      bubble.visible = false;
      g.add(bubble);
      g.userData.shieldBubble = bubble;
    }
    bubble.visible = u.shieldGGBlue > 0 && u.hp > 0;
  }

  /** Corpo/barras/escudo ocultos no bunker; proxy quase invisível mantém raycast para selecionar o herói. */
  private applyBunkerOccupantVisual(
    g: THREE.Group,
    u: Unit,
    inBunker: boolean,
  ): void {
    for (const ch of g.children) {
      const role = ch.userData?.role;
      const isHud =
        role === "bars" || role === "shieldBubble" || role === "bunkerPickProxy";
      if (isHud) continue;
      ch.visible = !inBunker;
    }
    const barRoot = g.userData.barRoot as THREE.Group | undefined;
    if (barRoot) barRoot.visible = !inBunker;
    const bubble = g.userData.shieldBubble as THREE.Mesh | undefined;
    if (bubble) {
      if (inBunker) bubble.visible = false;
      else bubble.visible = u.shieldGGBlue > 0 && u.hp > 0;
    }

    let proxy = g.userData.bunkerPickProxy as THREE.Mesh | undefined;
    if (inBunker) {
      if (!proxy) {
        const geo = new THREE.BoxGeometry(1.45, 0.85, 1.25);
        const mat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        proxy = new THREE.Mesh(geo, mat);
        proxy.position.y = 0.42;
        proxy.userData.role = "bunkerPickProxy";
        g.add(proxy);
        g.userData.bunkerPickProxy = proxy;
      }
      proxy.visible = true;
    } else if (proxy) {
      g.remove(proxy);
      proxy.geometry.dispose();
      (proxy.material as THREE.Material).dispose();
      g.userData.bunkerPickProxy = undefined;
    }
  }

  private updateShieldBubblePulse(dt: number): void {
    this.shieldPulsePhase += dt;
    const pulse = 1 + Math.sin(this.shieldPulsePhase * 2.8) * 0.048;
    for (const g of this.unitMeshes.values()) {
      const b = g.userData.shieldBubble as THREE.Mesh | undefined;
      if (!b || !b.visible) continue;
      b.scale.setScalar(pulse);
    }
  }

  private disposeObject3D(o: THREE.Object3D): void {
    o.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }

  private disposeGroup(g: THREE.Group): void {
    const mats = new Set<THREE.Material>();
    g.traverse((o: THREE.Object3D) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => mats.add(x));
        else mats.add(m);
      }
    });
    mats.forEach((m) => m.dispose());
  }

  /** Herói selecionado no HUD / turno: cone vermelho invertido acima da unidade. */
  setCombatSelectionUnitId(unitId: string | null): void {
    this.heroSelectionTargetId = unitId;
  }

  private updateHeroSelectionCone(): void {
    if (!this.heroSelectionTargetId) {
      if (this.heroSelectionCone) {
        this.arenaRoot.remove(this.heroSelectionCone);
        this.heroSelectionCone.geometry.dispose();
        (this.heroSelectionCone.material as THREE.Material).dispose();
        this.heroSelectionCone = null;
      }
      return;
    }
    const ug = this.unitMeshes.get(this.heroSelectionTargetId);
    if (!ug) {
      if (this.heroSelectionCone) {
        this.arenaRoot.remove(this.heroSelectionCone);
        this.heroSelectionCone.geometry.dispose();
        (this.heroSelectionCone.material as THREE.Material).dispose();
        this.heroSelectionCone = null;
      }
      return;
    }
    if (!this.heroSelectionCone) {
      const geo = new THREE.ConeGeometry(0.44 / 3, 0.95 / 3, 20);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe53935,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      this.heroSelectionCone = new THREE.Mesh(geo, mat);
      this.heroSelectionCone.rotation.x = Math.PI;
      this.heroSelectionCone.renderOrder = 6;
      this.arenaRoot.add(this.heroSelectionCone);
    }
    const float =
      Math.sin(performance.now() * 0.0028) * 0.065;
    this.heroSelectionCone.position.set(
      ug.position.x,
      ug.position.y + 2.42 + float,
      ug.position.z,
    );
  }

  /** Raycast no plano Y=0 a partir de coordenadas normalizadas (-1..1) */
  pickHex(
    ndcX: number,
    ndcY: number,
    grid: Map<string, HexCell>,
  ): { q: number; r: number } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = ray.intersectObjects([...this.hexMeshes.values()]);
    if (!hits.length) return null;
    const k = hits[0]!.object.userData.hexKey as string | undefined;
    if (!k) return null;
    if (!grid.has(k)) return null;
    const [q, r] = k.split(",").map(Number);
    return { q: q!, r: r! };
  }

  pickUnit(ndcX: number, ndcY: number): string | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    for (const [id, g] of this.unitMeshes) {
      const hits = ray.intersectObject(g, true);
      if (hits.length > 0) return id;
    }
    return null;
  }

  /** Rajadas radiais (Atirar pra todo lado / pistoleiro Arauto). */
  /** Salto curvo no eixo Y durante a ultimate “Furacão de balas” (alinhar duração ao combatTiming). */
  triggerWeaponUltFuracaoJump(
    heroId: string,
    durationMs: number = FURACAO_ULT_JUMP_MS,
  ): void {
    const g = this.unitMeshes.get(heroId);
    if (!g) return;
    this.heroUltJumpById.set(heroId, {
      startMs: performance.now(),
      durationMs,
      peakY: 1.18,
      baseX: g.position.x,
      baseZ: g.position.z,
    });
  }

  triggerRadialShotVfx(
    heroId: string,
    opts?: { rays?: number; durationMs?: number; scale?: number },
  ): void {
    const g = this.unitMeshes.get(heroId);
    if (!g) return;
    const rays = opts?.rays ?? 20;
    const durationMs = opts?.durationMs ?? 420;
    const scale = opts?.scale ?? 1;
    const burst = new THREE.Group();
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * Math.PI * 2;
      const geo = new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.72 * scale);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcc55,
        transparent: true,
        opacity: 0.9,
      });
      const m = new THREE.Mesh(geo, mat);
      const rx = Math.cos(ang) * 0.32 * scale;
      const rz = Math.sin(ang) * 0.32 * scale;
      m.position.set(rx, 1.05 + 0.08 * scale, rz);
      m.lookAt(rx + Math.cos(ang) * 3, m.position.y, rz + Math.sin(ang) * 3);
      burst.add(m);
    }
    burst.position.copy(g.position);
    this.arenaRoot.add(burst);
    this.atirarBursts.push({ group: burst, until: performance.now() + durationMs });
  }

  /** Feixe de plasma azul (Tiro destruidor); espessura escala com cargas. */
  triggerTiroDestruidorPlasma(
    pathQr: { q: number; r: number }[],
    charges: number,
  ): void {
    if (pathQr.length < 2) return;
    const ch = Math.max(0, Math.min(5, charges));
    const w = 0.26 + ch * 0.2;
    const h = 0.85 + ch * 0.14;
    const g = new THREE.Group();
    for (let i = 0; i < pathQr.length - 1; i++) {
      const a = axialToWorld(pathQr[i]!.q, pathQr[i]!.r, HEX_SIZE);
      const b = axialToWorld(pathQr[i + 1]!.q, pathQr[i + 1]!.r, HEX_SIZE);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.max(0.08, Math.hypot(dx, dz));
      const geo = new THREE.BoxGeometry(w, h, len);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x55ccff,
        transparent: true,
        opacity: 0.94,
      });
      const m = new THREE.Mesh(geo, mat);
      const cx = (a.x + b.x) * 0.5;
      const cz = (a.z + b.z) * 0.5;
      m.position.set(cx, 1.02 + h * 0.4, cz);
      m.rotation.y = -Math.atan2(dz, dx);
      g.add(m);
    }
    const inner = new THREE.MeshBasicMaterial({
      color: 0xccffff,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < pathQr.length - 1; i++) {
      const a = axialToWorld(pathQr[i]!.q, pathQr[i]!.r, HEX_SIZE);
      const b = axialToWorld(pathQr[i + 1]!.q, pathQr[i + 1]!.r, HEX_SIZE);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.max(0.08, Math.hypot(dx, dz));
      const geo = new THREE.BoxGeometry(w * 0.45, h * 0.35, len * 1.02);
      const m = new THREE.Mesh(geo, inner);
      const cx = (a.x + b.x) * 0.5;
      const cz = (a.z + b.z) * 0.5;
      m.position.set(cx, 1.02 + h * 0.55, cz);
      m.rotation.y = -Math.atan2(dz, dx);
      g.add(m);
    }
    this.arenaRoot.add(g);
    this.plasmaBeamFx.push({
      group: g,
      until: performance.now() + 360 + ch * 85,
    });
  }

  queueDamageProjectile(
    fromId: string,
    toId: string,
    opts: { style: "bullet" | "magic"; durationSec: number },
  ): void {
    const a = this.unitMeshes.get(fromId);
    const b = this.unitMeshes.get(toId);
    if (!a || !b) return;
    const geo = new THREE.SphereGeometry(opts.style === "bullet" ? 0.13 : 0.2, 10, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: opts.style === "bullet" ? 0x4a3020 : 0xaa66ff,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const y = 1.12;
    mesh.position.set(a.position.x, y, a.position.z);
    this.arenaRoot.add(mesh);
    this.flyingProjectiles.push({
      mesh,
      x0: a.position.x,
      z0: a.position.z,
      x1: b.position.x,
      z1: b.position.z,
      y,
      t: 0,
      T: Math.max(0.05, opts.durationSec),
      style: opts.style,
    });
  }

  /** Desenho estilo quadrinho (burst + POW) para impacto de bala. */
  private spawnComicPowBurst(x: number, y: number, z: number): void {
    const w = 512;
    const h = 400;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const cx = w * 0.5;
    const cy = h * 0.48;
    const rays = 18;
    const rIn = 72;
    const rOut = 148;
    ctx.beginPath();
    for (let i = 0; i <= rays * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = (i / (rays * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, rOut);
    g.addColorStop(0, "#fff59d");
    g.addColorStop(0.55, "#ffeb3b");
    g.addColorStop(1, "#fbc02d");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.font = "900 132px Impact, Haettenschweiler, Arial Narrow, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const txt = "POW";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 14;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(txt, cx, cy + 8);
    ctx.fillStyle = "#ffeb3b";
    ctx.fillText(txt, cx, cy + 8);
    ctx.fillStyle = "#e53935";
    ctx.fillText(txt, cx, cy + 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y + 0.35, z);
    sprite.rotation.z = (Math.random() - 0.5) * 0.35;
    sprite.renderOrder = 14;
    const sx = 0.72;
    const sy = 0.56;
    sprite.scale.set(sx, sy, 1);
    this.arenaRoot.add(sprite);
    this.comicPowBursts.push({
      sprite,
      baseScale: new THREE.Vector3(sx, sy, 1),
      t: 0,
      T: 0.52,
    });
  }

  /** Impacto estilo HQ no hex do alvo (rajada / quando não há projétil animado). */
  spawnComicPowImpactOnUnit(unitId: string): void {
    const g = this.unitMeshes.get(unitId);
    if (!g) return;
    this.spawnComicPowBurst(g.position.x, 1.12, g.position.z);
  }

  /** Herói brilha com energia enquanto o Golpe Relâmpago encadeia (extensível por novas chamadas). */
  triggerGolpeRelampagoHeroElectrify(heroId: string): void {
    this.triggerUnitHitFlash(heroId, true, "electric_chain");
  }

  /** Raio do céu até à cabeça do alvo (Golpe Relâmpago). */
  spawnGolpeRelampagoLightningOnUnit(targetId: string): void {
    const g = this.unitMeshes.get(targetId);
    if (!g) return;
    const x = g.position.x;
    const z = g.position.z;
    const yHit = g.position.y + 1.2;
    const ySky = 9.4;
    const mkLine = (
      color: number,
      baseOpacity: number,
      spread: number,
    ): THREE.Line => {
      const n = 10;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const y = THREE.MathUtils.lerp(ySky, yHit, u);
        const w = (1 - u) * spread;
        pts.push(
          new THREE.Vector3(
            x + (Math.random() - 0.5) * w,
            y,
            z + (Math.random() - 0.5) * w,
          ),
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });
      (mat.userData as { baseOp?: number }).baseOp = baseOpacity;
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 19;
      return line;
    };
    const group = new THREE.Group();
    group.add(mkLine(0xffffff, 0.98, 0.55));
    group.add(mkLine(0x99eeff, 0.78, 0.62));
    group.add(mkLine(0x3366cc, 0.55, 0.48));
    this.arenaRoot.add(group);
    this.golpeRelampagoBolts.push({ group, t: 0, T: 0.32 });
  }

  setDuelFlameAura(unitId: string, on: boolean): void {
    if (!on) {
      const grp = this.duelFlameByUnit.get(unitId);
      if (grp) {
        this.arenaRoot.remove(grp);
        this.disposeObject3D(grp);
        this.duelFlameByUnit.delete(unitId);
      }
      return;
    }
    if (this.duelFlameByUnit.has(unitId)) return;
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.72,
      roughness: 0.45,
    });
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.07, 8, 28),
      mat,
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.38;
    const torus2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 24),
      mat.clone(),
    );
    torus2.rotation.x = Math.PI / 2;
    torus2.position.y = 0.52;
    (torus2.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.15;
    root.add(torus);
    root.add(torus2);
    const ug = this.unitMeshes.get(unitId);
    if (ug) root.position.copy(ug.position);
    this.arenaRoot.add(root);
    this.duelFlameByUnit.set(unitId, root);
  }

  /**
   * Orbes mágicos lançados da sacerdotisa até cada alvo; tempo de voo alinhado ao dano (ms).
   */
  triggerSentencaOrbBarrage(
    priestId: string,
    targetIds: string[],
    firstHitMs: number,
    staggerMs: number,
  ): void {
    const priest = this.unitMeshes.get(priestId);
    if (!priest || targetIds.length === 0) return;
    const px = priest.position.x;
    const py = priest.position.y + 1.18;
    const pz = priest.position.z;

    for (let i = 0; i < targetIds.length; i++) {
      const tid = targetIds[i]!;
      if (!this.unitMeshes.get(tid)) continue;
      const geo = new THREE.SphereGeometry(0.19, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xddd0ff,
        emissive: 0x8866ff,
        emissiveIntensity: 1.05,
        transparent: true,
        opacity: 0.96,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const jx = (Math.random() - 0.5) * 0.22;
      const jy = (Math.random() - 0.5) * 0.12;
      const jz = (Math.random() - 0.5) * 0.22;
      mesh.position.set(px + jx, py + jy, pz + jz);
      this.arenaRoot.add(mesh);
      const flightSec = Math.max(0.08, (firstHitMs + i * staggerMs) / 1000);
      this.sentencaOrbs.push({
        mesh,
        priestId,
        targetId: tid,
        sx: px + jx,
        sy: py + jy,
        sz: pz + jz,
        t: 0,
        T: flightSec,
      });
    }
  }

  private spawnLandmineFireExplosion(x: number, y: number, z: number): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const rings: THREE.Mesh[] = [];
    const matBase = new THREE.MeshBasicMaterial({
      color: 0xff4418,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let k = 0; k < 4; k++) {
      const inner = 0.05 + k * 0.055;
      const outer = inner + 0.16;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 18),
        matBase.clone(),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012 * k;
      grp.add(ring);
      rings.push(ring);
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    core.position.y = 0.2;
    grp.add(core);
    rings.push(core);
    this.arenaRoot.add(grp);
    this.sentencaExplosions.push({ group: grp, t: 0, T: 0.4, rings });
  }

  /** Minas terrestres: ondas de explosão por anel a partir do centro do bunker. */
  triggerBunkerMinasRings(
    centerQ: number,
    centerR: number,
    maxRing: number,
    staggerMs: number,
  ): void {
    for (let ring = 1; ring <= maxRing; ring++) {
      const delay = (ring - 1) * staggerMs;
      window.setTimeout(() => {
        for (const [k, mesh] of this.hexMeshes) {
          const parts = k.split(",");
          const q = Number(parts[0]);
          const r = Number(parts[1]);
          if (
            !Number.isFinite(q) ||
            !Number.isFinite(r) ||
            hexDistance({ q: centerQ, r: centerR }, { q, r }) !== ring
          )
            continue;
          this.spawnLandmineFireExplosion(mesh.position.x, 0.32, mesh.position.z);
        }
      }, delay);
    }
  }

  /** Projétil grande (Tiro preciso); impacto com explosão no alvo. */
  queueBunkerMortarShot(
    fromId: string,
    toId: string,
    durationSec: number,
  ): void {
    const a = this.unitMeshes.get(fromId);
    const b = this.unitMeshes.get(toId);
    if (!a || !b) return;
    const geo = new THREE.SphereGeometry(0.36, 14, 14);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcc5520,
      transparent: true,
      opacity: 0.96,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const y0 = 1.35;
    mesh.position.set(a.position.x, y0, a.position.z);
    this.arenaRoot.add(mesh);
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const arcH = Math.min(3.2, 1.1 + dist * 0.12);
    this.mortarShots.push({
      mesh,
      x0: a.position.x,
      z0: a.position.z,
      x1: b.position.x,
      z1: b.position.z,
      y0,
      arcH,
      t: 0,
      T: Math.max(0.08, durationSec),
    });
  }

  setBunkers(
    bunkers: {
      q: number;
      r: number;
      hp: number;
      maxHp: number;
      tier: BunkerRenderTier;
    }[] | null,
    show: boolean,
  ): void {
    if (!show || !bunkers || bunkers.length === 0) {
      for (const root of this.bunkerRoots.values()) {
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
      }
      this.bunkerRoots.clear();
      this.bunkerHitFlashUntil.clear();
      return;
    }
    const want = new Set<string>();
    for (const b of bunkers) {
      if (b.hp > 0) want.add(axialKey(b.q, b.r));
    }
    for (const [k, root] of this.bunkerRoots) {
      if (!want.has(k)) {
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
        this.bunkerRoots.delete(k);
        this.bunkerHitFlashUntil.delete(k);
      }
    }
    for (const b of bunkers) {
      if (b.hp <= 0) continue;
      const k = axialKey(b.q, b.r);
      let root = this.bunkerRoots.get(k);
      const tier = b.tier;
      if (!root) {
        root = createBunkerStructureGroup(tier);
        this.bunkerRoots.set(k, root);
        this.arenaRoot.add(root);
      } else if ((root.userData.bunkerTier as BunkerRenderTier | undefined) !== tier) {
        applyBunkerTierMaterials(root, tier);
      }
      const { x, z } = axialToWorld(b.q, b.r, HEX_SIZE);
      root.position.set(x, 0, z);
    }
  }

  private spawnSentencaExplosion(x: number, y: number, z: number): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const rings: THREE.Mesh[] = [];
    const matBase = new THREE.MeshBasicMaterial({
      color: 0xcc88ff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let k = 0; k < 3; k++) {
      const inner = 0.08 + k * 0.07;
      const outer = inner + 0.14;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 20),
        matBase.clone(),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02 * k;
      grp.add(ring);
      rings.push(ring);
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    core.position.y = 0.35;
    grp.add(core);
    rings.push(core);
    this.arenaRoot.add(grp);
    this.sentencaExplosions.push({ group: grp, t: 0, T: 0.34, rings });
  }

  triggerHealGust(unitIds: string[]): void {
    for (const id of unitIds) {
      this.triggerUnitHitFlash(id, true, "heal_swirl");
    }
  }

  private updateHeroUltJumps(): void {
    const now = performance.now();
    for (const [id, ju] of [...this.heroUltJumpById]) {
      const g = this.unitMeshes.get(id);
      if (!g) {
        this.heroUltJumpById.delete(id);
        continue;
      }
      const elapsed = now - ju.startMs;
      const fy = this.heroFlyTotalY(
        now,
        id,
        Number(g.userData.heroFlyBaseY) || 0,
      );
      if (elapsed >= ju.durationMs) {
        g.position.set(ju.baseX, fy, ju.baseZ);
        this.heroUltJumpById.delete(id);
        continue;
      }
      const t = elapsed / ju.durationMs;
      const y = ju.peakY * Math.sin(Math.PI * t);
      g.position.set(ju.baseX, fy + y, ju.baseZ);
    }
  }

  private updateCombatDecorations(dt: number): void {
    const now = performance.now();
    for (let i = this.meleeSlashFx.length - 1; i >= 0; i--) {
      const s = this.meleeSlashFx[i]!;
      if (now >= s.until) {
        this.arenaRoot.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.meleeSlashFx.splice(i, 1);
        continue;
      }
      const age = 1 - (s.until - now) / 145;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.94 * (1 - age * age));
    }
    for (let i = this.atirarBursts.length - 1; i >= 0; i--) {
      const b = this.atirarBursts[i]!;
      if (now >= b.until) {
        this.arenaRoot.remove(b.group);
        this.disposeObject3D(b.group);
        this.atirarBursts.splice(i, 1);
      }
    }
    for (let i = this.plasmaBeamFx.length - 1; i >= 0; i--) {
      const b = this.plasmaBeamFx[i]!;
      if (now >= b.until) {
        this.arenaRoot.remove(b.group);
        this.disposeObject3D(b.group);
        this.plasmaBeamFx.splice(i, 1);
      }
    }
    for (let i = this.flyingProjectiles.length - 1; i >= 0; i--) {
      const p = this.flyingProjectiles[i]!;
      p.t += dt;
      const u = Math.min(1, p.t / p.T);
      const x = THREE.MathUtils.lerp(p.x0, p.x1, u);
      const z = THREE.MathUtils.lerp(p.z0, p.z1, u);
      p.mesh.position.set(x, p.y, z);
      if (u >= 1) {
        if (p.style === "bullet") {
          this.spawnComicPowBurst(p.x1, p.y, p.z1);
        }
        this.arenaRoot.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.flyingProjectiles.splice(i, 1);
      }
    }
    for (let i = this.comicPowBursts.length - 1; i >= 0; i--) {
      const b = this.comicPowBursts[i]!;
      b.t += dt;
      const u = Math.min(1, b.t / b.T);
      const mat = b.sprite.material as THREE.SpriteMaterial;
      const popU = Math.min(1, u / 0.28);
      const easeOut = 1 - Math.pow(1 - popU, 2.4);
      const sc = 0.22 + 0.78 * easeOut;
      b.sprite.scale.set(
        b.baseScale.x * sc,
        b.baseScale.y * sc,
        b.baseScale.z,
      );
      mat.opacity =
        u < 0.42 ? 1 : Math.max(0, 1 - (u - 0.42) / 0.58);
      if (u >= 1) {
        this.arenaRoot.remove(b.sprite);
        const m = b.sprite.material as THREE.SpriteMaterial;
        if (m.map) m.map.dispose();
        m.dispose();
        this.comicPowBursts.splice(i, 1);
      }
    }
    for (let i = this.golpeRelampagoBolts.length - 1; i >= 0; i--) {
      const b = this.golpeRelampagoBolts[i]!;
      b.t += dt;
      const u = Math.min(1, b.t / b.T);
      b.group.traverse((ch) => {
        if (ch instanceof THREE.Line) {
          const m = ch.material as THREE.LineBasicMaterial;
          const bo = (m.userData as { baseOp?: number }).baseOp ?? 1;
          m.opacity = Math.max(0, bo * (1 - u));
        }
      });
      if (u >= 1) {
        b.group.traverse((ch) => {
          if (ch instanceof THREE.Line) {
            ch.geometry.dispose();
            (ch.material as THREE.Material).dispose();
          }
        });
        this.arenaRoot.remove(b.group);
        this.golpeRelampagoBolts.splice(i, 1);
      }
    }
    for (let i = this.mortarShots.length - 1; i >= 0; i--) {
      const p = this.mortarShots[i]!;
      p.t += dt;
      const u = Math.min(1, p.t / p.T);
      const ease = u * u * (3 - 2 * u);
      const x = THREE.MathUtils.lerp(p.x0, p.x1, ease);
      const z = THREE.MathUtils.lerp(p.z0, p.z1, ease);
      const y = p.y0 + Math.sin(u * Math.PI) * p.arcH;
      p.mesh.position.set(x, y, z);
      if (u >= 1) {
        this.spawnLandmineFireExplosion(p.x1, 1.05, p.z1);
        this.arenaRoot.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.mortarShots.splice(i, 1);
      }
    }
    for (let i = this.sentencaOrbs.length - 1; i >= 0; i--) {
      const o = this.sentencaOrbs[i]!;
      o.t += dt;
      const tgt = this.unitMeshes.get(o.targetId);
      const u = Math.min(1, o.t / o.T);
      const ease = u * u * (3 - 2 * u);
      let tx = o.sx;
      let tz = o.sz;
      let ty = o.sy;
      if (tgt) {
        tx = tgt.position.x;
        ty = tgt.position.y + 1.05;
        tz = tgt.position.z;
      }
      const x = THREE.MathUtils.lerp(o.sx, tx, ease);
      const y = THREE.MathUtils.lerp(o.sy, ty, ease);
      const z = THREE.MathUtils.lerp(o.sz, tz, ease);
      o.mesh.position.set(x, y, z);
      const sc = 1 + 0.35 * Math.sin(u * Math.PI);
      o.mesh.scale.setScalar(sc);
      if (u >= 1) {
        const exx = o.mesh.position.x;
        const exy = o.mesh.position.y;
        const exz = o.mesh.position.z;
        this.arenaRoot.remove(o.mesh);
        o.mesh.geometry.dispose();
        (o.mesh.material as THREE.Material).dispose();
        this.sentencaOrbs.splice(i, 1);
        this.spawnSentencaExplosion(exx, exy, exz);
      }
    }

    for (let j = this.sentencaExplosions.length - 1; j >= 0; j--) {
      const ex = this.sentencaExplosions[j]!;
      ex.t += dt;
      const f = ex.t / ex.T;
      const s = 1 + f * 4.2;
      ex.group.scale.setScalar(s);
      for (const m of ex.rings) {
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.88 * (1 - f * f * 1.15));
      }
      if (ex.t >= ex.T) {
        this.arenaRoot.remove(ex.group);
        for (const m of ex.rings) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
        this.sentencaExplosions.splice(j, 1);
      }
    }

    for (const [id, root] of [...this.duelFlameByUnit]) {
      const ug = this.unitMeshes.get(id);
      if (!ug) {
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
        this.duelFlameByUnit.delete(id);
        continue;
      }
      root.position.copy(ug.position);
      root.rotation.y += dt * 2.8;
    }
    this.updateBunkerHitFlash(now);
  }

  burstRoses(): void {
    const n = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = 8 + Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      vel[i * 3] = (Math.random() - 0.5) * 0.15;
      vel[i * 3 + 1] = -0.08 - Math.random() * 0.12;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("vel", new THREE.BufferAttribute(vel, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff66aa,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
    });
    if (this.roseParticles) this.scene.remove(this.roseParticles);
    this.roseParticles = new THREE.Points(geo, mat);
    this.scene.add(this.roseParticles);
    this.animRose = 90;
    try {
      const c = ensureAudioContext();
      if (c) {
        resumeWebAudio();
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        connectToSfxOut(c, g);
        o.frequency.value = 440;
        g.gain.value = 0.04;
        o.start();
        setTimeout(() => {
          o.stop();
        }, 120);
      }
    } catch {
      /* ignore */
    }
  }

  tick(): void {
    const dt = this.clock.getDelta();
    const cometOn = this.cometaArcanoCinematic !== null;
    this.updateUnitMoveAnims(dt);
    this.updateFlyingHeroPerFrameMotion(performance.now());
    this.updateFlyingHeroGroundShadows();
    this.updateShieldBubblePulse(dt);
    if (!cometOn) {
      this.updateFocusLerp(dt);
      if (!this.panDragMoved) {
        this.updateCameraPan(dt);
      }
    } else {
      this.updateCometaArcanoCinematic();
    }
    this.applyCameraPose();
    /** Durante arrasto com o rato, não aplicar clamp aqui: o `pointermove` já mexe no pan e o clamp puxava de volta → sacudidela. */
    const draggingCameraPan = this.panPointerDown && this.panDragMoved;
    if (!draggingCameraPan && !cometOn) {
      this.clampPanIntoColiseum();
      this.applyCameraPose();
    }
    if (
      !cometOn &&
      this.cameraInputEnabled &&
      this.domCanvas &&
      !this.panDragMoved &&
      ++this.fitCheckAcc >= 24
    ) {
      this.fitCheckAcc = 0;
      this.clampZoomOutToColiseumFit(this.domCanvas);
      this.applyCameraPose();
      this.clampPanIntoColiseum();
      this.applyCameraPose();
    }

    if (this.animRose > 0 && this.roseParticles) {
      this.animRose--;
      const geo = this.roseParticles.geometry;
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      const vel = geo.getAttribute("vel") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + vel.getX(i));
        pos.setY(i, pos.getY(i) + vel.getY(i));
        pos.setZ(i, pos.getZ(i) + vel.getZ(i));
      }
      pos.needsUpdate = true;
      if (this.animRose <= 0) {
        this.scene.remove(this.roseParticles);
        this.roseParticles.geometry.dispose();
        (this.roseParticles.material as THREE.Material).dispose();
        this.roseParticles = null;
      }
    }
    const camPos = this.camera.position;
    for (const g of this.unitMeshes.values()) {
      const br = g.userData.barRoot as THREE.Group | undefined;
      if (br) br.lookAt(camPos);
    }
    this.updateHeroUltJumps();
    this.updateCombatDecorations(dt);
    this.updateHeroSelectionCone();
    this.updateHitFlashes();
    this.renderer.render(this.scene, this.camera);
  }
}
