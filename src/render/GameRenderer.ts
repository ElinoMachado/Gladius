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
import { BIOME_LABELS, COMBAT_BIOMES } from "../game/data/biomes";
import {
  allEnemyArchetypesSorted,
  ENEMY_BY_ID,
  enemyTierFromId,
  waveConfigFromIndex,
} from "../game/data/enemies";
import type { BiomeId } from "../game/types";
import { buildUnitBodyGroup, modelKeyForUnit } from "./unitModels";
import {
  playHeroUnitClip,
  setupHeroUnitAnimations,
  stopHeroUnitClips,
  updateHeroUnitAnimations,
} from "./heroUnitAnimations";
import { heroHitReactClipName, heroRunClipName } from "../game/heroCombatAnimMs";
import {
  createBunkerVisualGroup,
  disposeBunkerMountGroup,
  disposeBunkerVisualRoot,
  type BunkerRenderTier,
} from "./bunkerMesh";
import {
  cloneArenaColiseum,
  isArenaColiseumLoaded,
} from "./arenaColiseumGlb";
import {
  type BunkerLayoutEntry,
  type LayoutActorEntry,
  type LayoutActorPose,
  type LayoutEnemyEditorPrefs,
  type SceneLayoutPrefs,
  bunkerMountYOffset,
  cloneSceneLayoutPrefs,
  loadSceneLayoutPrefs,
  saveSceneLayoutPrefs,
} from "../game/sceneLayoutPrefs";
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
/**
 * Cilindro auxiliar (buracos no GLB): ~apotema com folga; pick principal = distância ao longo do raio (hex vs malha).
 */
const BUNKER_PICK_RADIUS_XZ = HEX_SIZE * (Math.sqrt(3) / 2) * 0.88;
const BUNKER_PICK_CYLINDER_SEGMENTS = 20;
/** Com o coliseu GLB, hexes/unidades sobem ligeiramente acima da areia (após afundar o modelo). */
const ARENA_PLAY_SURFACE_Y_WITH_COLISEUM = 0.11;
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
const THRONE_BASE_X = COLISEUM_XZ_MIN * 0.9;
const THRONE_BASE_Z = COLISEUM_XZ_MIN * 0.78;
/** Frustum base ajustado ao tamanho da arena com hexes mais juntos. */
const ORTHO_FRUSTUM = 108;
/** No ajuste de cena, o zoom-out ortográfico pode usar um frustum até este factor × o “justo” para a arena. */
const LAYOUT_EDIT_ZOOM_OUT_FRUSTUM_FACTOR = 5;
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
  /** Câmara ortográfica de combate (pan/zoom/WASD). */
  camera: THREE.OrthographicCamera;
  /** Câmara em perspetiva (cena guardada ou editor de layout). */
  readonly freeCamera: THREE.PerspectiveCamera;
  private hexMeshes = new Map<string, THREE.Mesh>();
  private unitMeshes = new Map<string, THREE.Group>();
  private readonly arenaRoot: THREE.Group;
  /** Modelo 3D do coliseu (escalado para envolver o grid de hexes). */
  private arenaColiseumDecoration: THREE.Group | null = null;
  /** Pai do GLB; deslocamento manual no editor aplica-se aqui. */
  private arenaColiseumMount: THREE.Group | null = null;
  /** Luz ambiente hemisférica (só com GLB do coliseu). */
  private arenaColiseumHemisphereLight: THREE.HemisphereLight | null = null;
  /** Multidão procedural em volta; oculta-se quando o GLB da arena carrega. */
  private coliseumCrowdRing: THREE.InstancedMesh | null = null;
  private throneGroup: THREE.Group;
  private roseParticles: THREE.Points | null = null;
  private animRose = 0;
  private moveOverlayGroup: THREE.Group | null = null;
  private attackOverlayGroup: THREE.Group | null = null;
  /** Hexes do feixe + linha 3D ao apontar o Tiro destruidor. */
  private tiroAimHexOverlayGroup: THREE.Group | null = null;
  private tiroAimLineGroup: THREE.Group | null = null;
  private enemyInspectMoveOverlayGroup: THREE.Group | null = null;
  private enemyInspectAttackOverlayGroup: THREE.Group | null = null;

  private readonly unitMoveAnims = new Map<
    string,
    {
      cells: Axial[];
      segIndex: number;
      t: number;
      segSeconds: number;
      playHeroRun?: boolean;
    }
  >();

  private readonly hitFlashState = new Map<
    string,
    { until: number; playerVictim: boolean; tone: HitFlashTone }
  >();
  private readonly atirarBursts: { group: THREE.Group; until: number }[] = [];
  private readonly plasmaBeamFx: {
    group: THREE.Group;
    until: number;
    startMs: number;
  }[] = [];
  private readonly flyingProjectiles: {
    mesh: THREE.Object3D;
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y: number;
    t: number;
    T: number;
    style: "bullet" | "magic" | "air";
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
  private readonly flamingSwordByHeroId = new Map<string, THREE.Group>();
  /** Deslocamento hex-a-hex da espada flamejante (fase de invocação). */
  private readonly flamingSwordMoveAnims = new Map<
    string,
    {
      cells: Axial[];
      segIndex: number;
      t: number;
      segSeconds: number;
    }
  >();
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
  /** Evita `setSize(0,0)` quando o layout ainda não mediu o canvas (ecrã preto). */
  private lastCanvasCssWidth = 1;
  private lastCanvasCssHeight = 1;
  /** Foco suave no plano XZ (world x, world z em .y). */
  private focusTarget: THREE.Vector2 | null = null;
  /** Hex alvo enquanto há foco suave (atualiza o pan se `arenaYaw` estiver a interpolar). */
  private focusAxial: { q: number; r: number; alignArena: boolean } | null = null;
  /** Rotação da arena alvo (rad); null = sem interpolação. */
  private arenaYawTarget: number | null = null;
  private fitCheckAcc = 0;
  private readonly camOffsetDir = new THREE.Vector3(85, 92, 85).normalize();
  private readonly camDistance = 152;
  /** Rotação Y da arena: alinha o setor do herói com a vista (radial → diagonal +X/+Z na tela). */
  private arenaYaw = 0;
  private readonly unitFacingWorldUp = new THREE.Vector3(0, 1, 0);
  private readonly scratchFacingView = new THREE.Vector3();
  private readonly scratchFacingRight = new THREE.Vector3();
  private readonly scratchFacingScreenUp = new THREE.Vector3();
  private readonly scratchFacingDiag = new THREE.Vector3();
  /** Herói com turno (fase jogador): só ele usa facing de ataque para o último clique. */
  private combatTurnHeroIdForFacing: string | null = null;
  /** Rotação Y após ataque com clique no canvas (só aplicada ao herói do turno). */
  private readonly heroAttackFacingY = new Map<string, number>();
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
  /** Bbox do corpo da unidade para colocar barras acima da cabeça. */
  private readonly unitBarBBoxScratch = new THREE.Box3();
  private readonly unitBarTopScratch = new THREE.Vector3();
  /** Arrastar com botão esquerdo no canvas (combate). */
  private panPointerDown = false;
  private panDragMoved = false;
  private panDragStartClientX = 0;
  private panDragStartClientY = 0;
  /** Última posição de ponteiro aplicada ao pan (delta em pixels → estável vs raycast em cadeia). */
  private panDragLastAppliedClientX = 0;
  private panDragLastAppliedClientY = 0;
  private suppressCanvasClick = false;
  /** Menu principal: permite iniciar sessão ao clicar no coliseu. */
  private arenaLayoutEditEligible = false;
  /** Sessão de ajuste (clique no coliseu no menu); Esc grava e fecha. */
  private arenaLayoutEditActive = false;
  /** Câmara persistida: cópia ao entrar no editor — não é atualizada pelos movimentos de câmara na sessão. */
  private layoutEditFrozenFreeCamera: SceneLayoutPrefs["freeCamera"] = null;
  /** Espaço: voo livre (olhar + WASD + Q/E); fora disto, WASD/X/Z movem o objeto selecionado. */
  private layoutEditFlyMode = false;
  private readonly orbitTarget = new THREE.Vector3(0, 0, 0);
  /** Em combate/menu: usar `freeCamera` em vez da ortográfica (exceto durante cometa). */
  private usePersistentFreeCamera = false;
  /** No combate usa-se sempre a ortográfica (pan/WASD) mesmo com câmara guardada na cena. */
  private combatUsesOrthographicView = false;
  /** Se o jogador entrou no modo câmara ou alterou zoom/rotação; senão só gravamos o coliseu. */
  private arenaLayoutCameraPersonalized = false;
  private editorDragMode:
    | "none"
    | "pan"
    | "fly_look"
    | "coliseum_xz"
    | "coliseum_y" = "none";
  private readonly layoutFlyEulerScratch = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly layoutFlyQuatScratch = new THREE.Quaternion();
  private readonly layoutFlyForward = new THREE.Vector3();
  private readonly layoutFlyRight = new THREE.Vector3();
  private readonly layoutFlyWorldUp = new THREE.Vector3(0, 1, 0);
  private editorLastClientX = 0;
  private editorLastClientY = 0;
  private readonly editorLastGround = new THREE.Vector3();
  private readonly editorScratchVec3 = new THREE.Vector3();
  private arenaLayoutPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private onArenaLayoutSessionEnd: (() => void) | null = null;
  private onArenaLayoutEditUiRefresh: (() => void) | null = null;
  /** `render()` não corre no menu a cada frame; ao mudar o inimigo de referência força `syncUnits`. */
  private onLayoutEnemyMeshSyncNeeded: (() => void) | null = null;
  /** Snapshot para posição/escala dos bunkers e serialização no editor. */
  private sceneLayoutPrefsSnapshot: SceneLayoutPrefs | null = null;
  /** Objeto 3D ativo no editor de cena (null até ao primeiro clique num selecionável). */
  private layoutSelectedRoot: THREE.Object3D | null = null;
  private layoutPointerDownX = 0;
  private layoutPointerDownY = 0;
  private layoutEligibleForDragAfterDown = false;
  private readonly layoutDragThresholdPx = 8;
  private readonly ndcGroundCorners = [
    new THREE.Vector2(-1, -1),
    new THREE.Vector2(1, -1),
    new THREE.Vector2(1, 1),
    new THREE.Vector2(-1, 1),
  ];
  private readonly attackFacingNdcScratch = new THREE.Vector2();
  private readonly attackFacingGroundScratch = new THREE.Vector3();

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
    this.freeCamera = new THREE.PerspectiveCamera(48, aspect, 0.22, 4200);
    this.freeCamera.position.copy(this.camera.position);
    this.freeCamera.quaternion.copy(this.camera.quaternion);
    this.domCanvas = canvas;
    this.applyCameraPose();
    this.freeCamera.position.copy(this.camera.position);
    this.freeCamera.quaternion.copy(this.camera.quaternion);

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
    this.attachArenaLayoutControls(canvas);
  }

  setCameraInputEnabled(enabled: boolean): void {
    this.cameraInputEnabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.panVelocity.set(0, 0);
      this.focusTarget = null;
      this.focusAxial = null;
      this.arenaYawTarget = null;
      this.panPointerDown = false;
      this.panDragMoved = false;
      this.suppressCanvasClick = false;
    }
  }

  /** Câmara usada para render e picking no ecrã atual. */
  private getRenderCamera(): THREE.Camera {
    if (this.cometaArcanoCinematic) return this.camera;
    if (this.arenaLayoutEditActive) return this.freeCamera;
    if (this.combatUsesOrthographicView) return this.camera;
    if (this.usePersistentFreeCamera) return this.freeCamera;
    return this.camera;
  }

  isArenaLayoutEditActive(): boolean {
    return this.arenaLayoutEditActive;
  }

  /** Chamado após `endArenaLayoutEditSession` (ex.: repor o menu principal). */
  setOnArenaLayoutSessionEnd(cb: (() => void) | null): void {
    this.onArenaLayoutSessionEnd = cb;
  }

  setOnArenaLayoutEditUiRefresh(cb: (() => void) | null): void {
    this.onArenaLayoutEditUiRefresh = cb;
  }

  setOnLayoutEnemyMeshSyncNeeded(cb: (() => void) | null): void {
    this.onLayoutEnemyMeshSyncNeeded = cb;
  }

  /** Compat: o editor já não tem submodo “câmara vs coliseu”. */
  isArenaLayoutCameraSubMode(): boolean {
    return false;
  }

  getLayoutCameraIsometric(): boolean {
    return true;
  }

  setLayoutCameraIsometric(_iso: boolean): void {}

  /** Se true, a câmara guardada (perspetiva) está ativa no jogo; pan/zoom de combate ficam desligados. */
  usesCustomSceneCamera(): boolean {
    if (this.combatUsesOrthographicView) return false;
    return this.usePersistentFreeCamera;
  }

  /** Chamado a partir do `render()` do jogo: em combate força vista ortográfica e controlos de câmara. */
  setCombatUsesOrthographicView(active: boolean): void {
    this.combatUsesOrthographicView = active;
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
    if (
      this.usePersistentFreeCamera &&
      !this.arenaLayoutEditActive &&
      !this.combatUsesOrthographicView
    ) {
      if (alignArena) this.setArenaYawFromAxial(q, r);
      return;
    }
    if (!this.focusTarget) this.focusTarget = new THREE.Vector2();
    this.focusAxial = { q, r, alignArena };
    if (alignArena) {
      this.arenaYawTarget = this.computeArenaYawForAxial(q, r);
    } else {
      this.arenaYawTarget = null;
    }
    this.refreshFocusWorldPanTarget();
  }

  /** Centraliza na hora (sem lerp), ex.: início do turno do jogador; alinha bioma ao herói. */
  snapCameraToAxial(q: number, r: number): void {
    if (
      this.usePersistentFreeCamera &&
      !this.arenaLayoutEditActive &&
      !this.combatUsesOrthographicView
    ) {
      this.setArenaYawFromAxial(q, r);
      return;
    }
    this.focusAxial = null;
    this.arenaYawTarget = null;
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
  /** Ângulo Y da arena para alinhar o setor do hex à vista (sem aplicar ainda). */
  private computeArenaYawForAxial(q: number, r: number): number {
    const { x, z } = axialToWorld(q, r, HEX_SIZE);
    const len = Math.hypot(x, z);
    if (len < 0.55) return 0;
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
    return alpha - thetaU;
  }

  private setArenaYawFromAxial(q: number, r: number): void {
    this.arenaYaw = this.computeArenaYawForAxial(q, r);
    this.arenaRoot.rotation.y = this.arenaYaw;
    this.arenaYawTarget = null;
  }

  private refreshFocusWorldPanTarget(): void {
    if (!this.focusAxial || !this.focusTarget) return;
    this.worldPanInto(this.focusAxial.q, this.focusAxial.r, this.focusTarget);
  }

  clearCameraFocus(): void {
    this.focusTarget = null;
    this.focusAxial = null;
    this.arenaYawTarget = null;
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
    this.focusAxial = null;
    this.arenaYawTarget = null;
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
      ring.position.set(rx, this.playSurfaceYOffset() + 0.14, rz);
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
    opts?: { playHeroRun?: boolean },
  ): void {
    if (cells.length < 2) return;
    const ms = segmentMs ?? UNIT_MOVE_SEGMENT_MS;
    const segSeconds = Math.min(0.75, ms / 1000);
    const playHeroRun = opts?.playHeroRun === true;
    this.unitMoveAnims.set(unitId, {
      cells: cells.map((c) => ({ q: c.q, r: c.r })),
      segIndex: 0,
      t: 0,
      segSeconds,
      playHeroRun,
    });
    if (playHeroRun) {
      const g = this.unitMeshes.get(unitId);
      const body = g?.children.find(
        (c) => c.userData?.role === "body",
      ) as THREE.Group | undefined;
      if (body) {
        playHeroUnitClip(body, [heroRunClipName(), "run", "running"], {
          loop: THREE.LoopRepeat,
          fadeSec: 0.12,
        });
      }
    }
  }

  queueFlamingSwordMoveAlongCells(
    heroId: string,
    cells: { q: number; r: number }[],
    segmentMs?: number,
  ): void {
    if (cells.length < 2) return;
    const ms = segmentMs ?? UNIT_MOVE_SEGMENT_MS;
    const segSeconds = Math.min(0.75, ms / 1000);
    this.flamingSwordMoveAnims.set(heroId, {
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
    this.headScreenScratch.project(this.getRenderCamera());
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

  private isEmissiveCombatMaterial(
    m: THREE.Material,
  ): m is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
    return (
      m instanceof THREE.MeshStandardMaterial ||
      m instanceof THREE.MeshPhysicalMaterial
    );
  }

  private clearBunkerMaterialFlash(root: THREE.Group): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      for (const m of mats) {
        if (!this.isEmissiveCombatMaterial(m)) continue;
        m.emissive.setHex(0);
        m.emissiveIntensity = 0;
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
        if (!(obj instanceof THREE.Mesh)) return;
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const m of mats) {
          if (!this.isEmissiveCombatMaterial(m)) continue;
          m.emissive.copy(this.flashEmissiveScratch);
          m.emissiveIntensity = w * 1.45;
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
    const py = this.playSurfaceYOffset();
    mesh.position.set(midX, py + 0.72, midZ);
    mesh.lookAt(bx, py + 0.72, bz);
    this.arenaRoot.add(mesh);
    this.meleeSlashFx.push({ mesh, until: performance.now() + 145 });
  }

  /**
   * Traço de corte entre a espada flamejante (invocação) e o inimigo — mesmo papel que
   * `triggerMeleeSlashBetween` na fase inimiga.
   */
  triggerFlamingSwordSlash(heroOwnerId: string, targetId: string): void {
    const sword = this.flamingSwordByHeroId.get(heroOwnerId);
    const b = this.unitMeshes.get(targetId);
    if (!sword || !b) return;
    const ax = sword.position.x;
    const az = sword.position.z;
    const bx = b.position.x;
    const bz = b.position.z;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 0.01;
    const midX = (ax + bx) * 0.5;
    const midZ = (az + bz) * 0.5;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(2.8, len * 0.92), 0.09, 0.48),
      new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const py = this.playSurfaceYOffset();
    mesh.position.set(midX, py + 0.78, midZ);
    mesh.lookAt(bx, py + 0.78, bz);
    this.arenaRoot.add(mesh);
    this.meleeSlashFx.push({ mesh, until: performance.now() + 168 });
  }

  /**
   * Traço de invocação em grade (sombra / mega golem): mesmo padrão visual que a espada flamejante,
   * usando a posição do modelo da unidade invocada.
   */
  triggerGridSummonSlash(
    summonId: string,
    targetId: string,
    summonKind: "shadow" | "mega_golem",
  ): void {
    const a = this.unitMeshes.get(summonId);
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
    const py = this.playSurfaceYOffset();
    const isGolem = summonKind === "mega_golem";
    const depth = isGolem ? 0.52 : 0.44;
    const thick = isGolem ? 0.1 : 0.085;
    const color = isGolem ? 0xff4400 : 0xaa66ff;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(2.8, len * 0.92), thick, depth),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isGolem ? 0.9 : 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.position.set(midX, py + (isGolem ? 0.78 : 0.76), midZ);
    mesh.lookAt(bx, py + (isGolem ? 0.78 : 0.76), bz);
    this.arenaRoot.add(mesh);
    this.meleeSlashFx.push({ mesh, until: performance.now() + 168 });
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
    this.headScreenScratch.project(this.getRenderCamera());
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
    this.headScreenScratch.set(x, this.playSurfaceYOffset() + headY, z);
    this.headScreenScratch.project(this.getRenderCamera());
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
    mesh.position.set(0, 0.36, 0.02);
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
      stack.position.set(0, 0.34, 0);
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
    this.rayStatus.setFromCamera(this.pointerNdcScratch, this.getRenderCamera());
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
      g.position.set(
        x,
        this.playSurfaceYOffset() + this.heroFlyTotalY(nowMs, id, baseY),
        z,
      );
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
        if (a.playHeroRun) {
          const body = g.children.find(
            (c) => c.userData?.role === "body",
          ) as THREE.Group | undefined;
          if (body) stopHeroUnitClips(body, 0.1);
        }
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
        this.playSurfaceYOffset() + flyY,
        THREE.MathUtils.lerp(p0.z, p1.z, p),
      );
      if (p >= 1) {
        a.segIndex++;
        a.t = 0;
        if (a.segIndex >= a.cells.length - 1) {
          if (a.playHeroRun) {
            const body = g.children.find(
              (c) => c.userData?.role === "body",
            ) as THREE.Group | undefined;
            if (body) stopHeroUnitClips(body, 0.1);
          }
          this.unitMoveAnims.delete(id);
        }
      }
    }
  }

  private updateFlamingSwordMoveAnims(dt: number): void {
    const y = this.playSurfaceYOffset() + 1.18;
    for (const heroId of [...this.flamingSwordMoveAnims.keys()]) {
      const a = this.flamingSwordMoveAnims.get(heroId);
      if (!a) continue;
      const root = this.flamingSwordByHeroId.get(heroId);
      if (!root) {
        this.flamingSwordMoveAnims.delete(heroId);
        continue;
      }
      const i = a.segIndex;
      if (i >= a.cells.length - 1) {
        this.flamingSwordMoveAnims.delete(heroId);
        continue;
      }
      const u = a.cells[i]!;
      const v = a.cells[i + 1]!;
      const p0 = axialToWorld(u.q, u.r, HEX_SIZE);
      const p1 = axialToWorld(v.q, v.r, HEX_SIZE);
      a.t += dt;
      const p = Math.min(1, a.t / a.segSeconds);
      const x = THREE.MathUtils.lerp(p0.x, p1.x, p);
      const z = THREE.MathUtils.lerp(p0.z, p1.z, p);
      root.position.set(x, y, z);
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      if (Math.hypot(dx, dz) > 1e-5) {
        root.rotation.y = -Math.atan2(dz, dx);
      }
      if (p >= 1) {
        a.segIndex++;
        a.t = 0;
        if (a.segIndex >= a.cells.length - 1) {
          this.flamingSwordMoveAnims.delete(heroId);
        }
      }
    }
  }

  /** Clips do GLB do herói (combate); falha silenciosa se não houver rig/clips. */
  playHeroCombatClip(
    unitId: string,
    clipCandidates: string[],
    opts?: { loop?: THREE.AnimationActionLoopStyles },
  ): boolean {
    const g = this.unitMeshes.get(unitId);
    if (!g) return false;
    const body = g.children.find(
      (c) => c.userData?.role === "body",
    ) as THREE.Group | undefined;
    if (!body) return false;
    return playHeroUnitClip(body, clipCandidates, {
      loop: opts?.loop ?? THREE.LoopOnce,
      fadeSec: 0.1,
    });
  }

  playHeroHitReact(unitId: string): boolean {
    return this.playHeroCombatClip(unitId, [heroHitReactClipName(), "hit"], {
      loop: THREE.LoopOnce,
    });
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
      this.focusAxial = null;
      this.arenaYawTarget = null;
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
    let frCap = this.computeTightFrForFullColiseum();
    if (this.arenaLayoutEditActive) {
      frCap *= LAYOUT_EDIT_ZOOM_OUT_FRUSTUM_FACTOR;
    }
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

  private updateArenaYawLerp(dt: number): void {
    if (
      this.usePersistentFreeCamera &&
      !this.arenaLayoutEditActive &&
      !this.combatUsesOrthographicView
    )
      return;
    if (this.arenaYawTarget === null) return;
    const target = this.arenaYawTarget;
    let diff = target - this.arenaYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const k = 1 - Math.exp(-5 * dt);
    this.arenaYaw += diff * k;
    this.arenaRoot.rotation.y = this.arenaYaw;
    if (Math.abs(diff) < 0.014) {
      this.arenaYaw = target;
      this.arenaRoot.rotation.y = this.arenaYaw;
      this.arenaYawTarget = null;
    }
  }

  private updateFocusLerp(dt: number): void {
    if (
      this.usePersistentFreeCamera &&
      !this.arenaLayoutEditActive &&
      !this.combatUsesOrthographicView
    )
      return;
    if (!this.focusTarget || !this.cameraInputEnabled) return;
    if (this.panDragMoved) {
      this.focusTarget = null;
      this.focusAxial = null;
      this.arenaYawTarget = null;
      return;
    }
    if (this.keysDown.size > 0) {
      this.focusTarget = null;
      this.focusAxial = null;
      this.arenaYawTarget = null;
      return;
    }
    if (this.focusAxial) this.refreshFocusWorldPanTarget();
    const k = 1 - Math.exp(-5 * dt);
    this.pan.x += (this.focusTarget.x - this.pan.x) * k;
    this.pan.y += (this.focusTarget.y - this.pan.y) * k;
    const dist = Math.hypot(
      this.focusTarget.x - this.pan.x,
      this.focusTarget.y - this.pan.y,
    );
    const yawDone = this.arenaYawTarget === null;
    if (yawDone && dist < 0.14) {
      this.pan.x = this.focusTarget.x;
      this.pan.y = this.focusTarget.y;
      this.focusTarget = null;
      this.focusAxial = null;
    }
  }

  /**
   * Pan ortográfico por WASD (mesma lógica do combate); usado no editor de cena (modo câmara)
   * e em `updateCameraPan` quando o input global está ativo.
   */
  private stepOrthoPanFromKeys(dt: number): void {
    if (!this.domCanvas) return;
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

  private updateCameraPan(dt: number): void {
    if (
      this.usePersistentFreeCamera &&
      !this.arenaLayoutEditActive &&
      !this.combatUsesOrthographicView
    )
      return;
    if (!this.cameraInputEnabled || !this.domCanvas) return;
    this.stepOrthoPanFromKeys(dt);
  }

  resize(canvas: HTMLCanvasElement): void {
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    if (w < 1 || h < 1) {
      w = this.lastCanvasCssWidth;
      h = this.lastCanvasCssHeight;
    } else {
      this.lastCanvasCssWidth = w;
      this.lastCanvasCssHeight = h;
    }
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(h, 1);
    this.freeCamera.aspect = aspect;
    this.freeCamera.updateProjectionMatrix();
    this.applyOrthoFrustum(canvas);
    this.applyCameraPose();
    if (!this.arenaLayoutEditActive) {
      this.clampZoomOutToColiseumFit(canvas);
      this.applyCameraPose();
      this.clampPanIntoColiseum();
      this.applyCameraPose();
    }
  }

  private buildThrone(): THREE.Group {
    const g = new THREE.Group();
    g.position.set(THRONE_BASE_X, 0, THRONE_BASE_Z);
    g.userData.layoutSceneActorId = "throne";
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
    this.coliseumCrowdRing = mesh;
    this.arenaRoot.add(mesh);
  }

  /**
   * Coloca o GLB do coliseu por baixo do trono/unidades/hexes (escala para cobrir todo o grid).
   * Idempotente; chamar após `preloadArenaColiseumGlb()` resolver.
   */
  attachArenaColiseumDecoration(): void {
    if (this.arenaColiseumDecoration != null || !isArenaColiseumLoaded()) return;
    const g = cloneArenaColiseum();
    if (!g) return;
    this.arenaColiseumDecoration = g;
    g.userData.role = "arena_coliseum";
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.renderOrder = -1;
    });

    const mount = new THREE.Group();
    mount.name = "arena_coliseum_mount";
    mount.add(g);

    if (!this.arenaColiseumHemisphereLight) {
      this.arenaColiseumHemisphereLight = new THREE.HemisphereLight(
        0xa8c4ec,
        0x4a3d30,
        0.48,
      );
      this.arenaColiseumHemisphereLight.name = "arena_coliseum_hemi";
      this.scene.add(this.arenaColiseumHemisphereLight);
    }

    const accent = new THREE.Group();
    accent.name = "arena_coliseum_accent_lights";
    const warmKey = new THREE.PointLight(0xfff0e0, 2.8, 200, 2);
    warmKey.position.set(0, 78, 56);
    accent.add(warmKey);
    const coolFill = new THREE.PointLight(0xd8e6ff, 1.35, 170, 2);
    coolFill.position.set(-68, 44, -58);
    accent.add(coolFill);
    const rimLow = new THREE.PointLight(0xffcc88, 0.85, 130, 2);
    rimLow.position.set(52, 22, -36);
    accent.add(rimLow);
    const bounce = new THREE.PointLight(0xe8d4c4, 0.55, 95, 2);
    bounce.position.set(0, 16, 0);
    accent.add(bounce);
    mount.add(accent);

    this.arenaColiseumMount = mount;

    const throne = this.throneGroup;
    this.arenaRoot.remove(throne);
    const crowd = this.coliseumCrowdRing;
    if (crowd) this.arenaRoot.remove(crowd);

    this.arenaRoot.add(mount);
    this.arenaRoot.add(throne);
    if (crowd) {
      crowd.visible = false;
      this.arenaRoot.add(crowd);
    }
    this.refreshArenaPlaySurfaceVisuals();
    this.applySceneLayoutPrefs(loadSceneLayoutPrefs());
  }

  /** Plano de jogo em Y (hexes, bunkers, base das unidades). Raycasts no chão lógico mantêm-se em Y=0. */
  private playSurfaceYOffset(): number {
    return this.arenaColiseumDecoration != null
      ? ARENA_PLAY_SURFACE_Y_WITH_COLISEUM
      : 0;
  }

  private refreshArenaPlaySurfaceVisuals(): void {
    const y = this.playSurfaceYOffset();
    const coliseum = this.arenaColiseumDecoration != null;
    for (const mesh of this.hexMeshes.values()) {
      mesh.position.y = y;
      const mat = mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.polygonOffset = coliseum;
        mat.polygonOffsetFactor = coliseum ? -3 : 0;
        mat.polygonOffsetUnits = coliseum ? -3 : 0;
        mat.needsUpdate = true;
      }
    }
    this.applyThroneLayoutPose(y);
  }

  /** Posição base do trono: canto da arena + offsets em `layoutActors.throne`. */
  private applyThroneLayoutPose(playSurfaceY: number): void {
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    const a = snap.layoutActors?.throne;
    const pose =
      a && "x" in a && "scale" in a ? (a as LayoutActorPose) : undefined;
    const dx = pose?.x ?? 0;
    const dy =
      a && typeof a.y === "number" && Number.isFinite(a.y) ? a.y : 0;
    const dz = pose?.z ?? 0;
    const sc = THREE.MathUtils.clamp(pose?.scale ?? 1, 0.02, 48);
    this.throneGroup.position.set(
      THRONE_BASE_X + dx,
      playSurfaceY + dy,
      THRONE_BASE_Z + dz,
    );
    this.throneGroup.scale.setScalar(sc);
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
    this.refreshArenaPlaySurfaceVisuals();
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
      const snapForLayout = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
      const lee = snapForLayout.layoutEnemyEditor;
      if (u.id === "layout-enemy") {
        const fromSnap = lee?.previewArchetypeId;
        if (
          g.userData.layoutEnemyPreviewArchetypeId == null &&
          typeof fromSnap === "string" &&
          ENEMY_BY_ID[fromSnap]
        ) {
          g.userData.layoutEnemyPreviewArchetypeId = fromSnap;
        }
      }
      const previewEnemyId =
        u.id === "layout-enemy"
          ? (() => {
              const pid = g.userData.layoutEnemyPreviewArchetypeId as
                | string
                | undefined;
              return pid && ENEMY_BY_ID[pid]
                ? pid
                : (u.enemyArchetypeId ?? "gladinio");
            })()
          : undefined;
      const mk =
        u.id === "layout-enemy" && previewEnemyId
          ? `e:${previewEnemyId}`
          : modelKeyForUnit(u);
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
        const body =
          u.id === "layout-enemy" && previewEnemyId
            ? buildUnitBodyGroup({
                ...u,
                enemyArchetypeId: previewEnemyId,
              })
            : buildUnitBodyGroup(u);
        body.userData.role = "body";
        g.add(body);
        g.userData.modelKey = mk;
        if (u.isPlayer && u.heroClass) {
          setupHeroUnitAnimations(body, u.heroClass);
        }
      } else if (u.isPlayer && u.heroClass) {
        const existBody = g.children.find(
          (c) => c.userData?.role === "body",
        ) as THREE.Group | undefined;
        if (existBody && !existBody.userData.heroAnimMixer) {
          setupHeroUnitAnimations(existBody, u.heroClass);
        }
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
          const py0 = this.playSurfaceYOffset();
          let wx = x;
          let wy = py0 + flyY;
          let wz = z;
          if (u.id.startsWith("layout-")) {
            const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
            if (u.id === "layout-enemy") {
              const pid =
                (g.userData.layoutEnemyPreviewArchetypeId as string | undefined) &&
                ENEMY_BY_ID[g.userData.layoutEnemyPreviewArchetypeId as string]
                  ? (g.userData.layoutEnemyPreviewArchetypeId as string)
                  : (snap.layoutEnemyEditor?.previewArchetypeId &&
                    ENEMY_BY_ID[snap.layoutEnemyEditor.previewArchetypeId]
                      ? snap.layoutEnemyEditor.previewArchetypeId
                      : (u.enemyArchetypeId ?? "gladinio"));
              const oy = snap.layoutEnemyEditor?.yByArchetype?.[pid];
              if (typeof oy === "number" && Number.isFinite(oy)) wy += oy;
            } else {
              const la = snap.layoutActors?.[u.id];
              if (la) {
                const pose = la as LayoutActorPose;
                wx += pose.x ?? 0;
                wy += pose.y ?? 0;
                wz += pose.z ?? 0;
              }
            }
            g.userData.layoutActorAxialQ = u.q;
            g.userData.layoutActorAxialR = u.r;
            g.userData.layoutActorFlyY = flyY;
          }
          g.position.set(wx, wy, wz);
        }
      }
      /** 2× no gigante: evita cobrir inimigos no raycast (antes 5×). */
      const furyScale =
        u.isPlayer && (u.furiaGiganteTurns ?? 0) > 0 ? 2 : 1;
      const layoutSnap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
      const layoutLa =
        u.id.startsWith("layout-") && u.id !== "layout-enemy"
          ? layoutSnap.layoutActors?.[u.id]
          : undefined;
      const layoutActorSc =
        layoutLa &&
        "scale" in layoutLa &&
        typeof layoutLa.scale === "number"
          ? layoutLa.scale
          : undefined;
      const layoutSc =
        typeof layoutActorSc === "number" && Number.isFinite(layoutActorSc)
          ? THREE.MathUtils.clamp(layoutActorSc, 0.02, 48)
          : 1;
      const summonSc =
        u.isAllySummon && u.summonKind === "mega_golem"
          ? 1.22
          : u.isAllySummon && u.summonKind === "shadow"
            ? 0.9
            : 1;
      const unitSc =
        u.id.startsWith("layout-")
          ? furyScale * layoutSc
          : furyScale * summonSc;
      g.scale.setScalar(unitSc);
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
    this.syncFlamingSwordCompanions(units);
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
    for (const id of [...this.flamingSwordByHeroId.keys()]) {
      if (!this.unitMeshes.has(id)) {
        const root = this.flamingSwordByHeroId.get(id)!;
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
        this.flamingSwordMoveAnims.delete(id);
        this.flamingSwordByHeroId.delete(id);
      }
    }
  }

  private syncFlamingSwordCompanions(units: Unit[]): void {
    const seen = new Set<string>();
    for (const u of units) {
      if (!u.isPlayer || u.hp <= 0) continue;
      const stacks = Math.min(3, Math.max(0, u.artifacts["coroa_ferro"] ?? 0));
      if (stacks <= 0) continue;
      const pos = u.flamingSwordPos ?? { q: u.q, r: u.r };
      const root = this.flamingSwordByHeroId.get(u.id);
      if (!root) {
        const g = new THREE.Group();
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.42, 0.12),
          new THREE.MeshStandardMaterial({
            color: 0x4a0a0a,
            emissive: 0xff2200,
            emissiveIntensity: 1.2,
            metalness: 0.35,
            roughness: 0.38,
          }),
        );
        blade.position.y = 0.22;
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 10, 10),
          new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        flame.position.y = 0.44;
        g.add(blade, flame);
        this.arenaRoot.add(g);
        this.flamingSwordByHeroId.set(u.id, g);
      }
      const nowRoot = this.flamingSwordByHeroId.get(u.id)!;
      nowRoot.scale.setScalar(1 + (stacks - 1) * 0.12);
      if (!this.flamingSwordMoveAnims.has(u.id)) {
        const w = axialToWorld(pos.q, pos.r, HEX_SIZE);
        nowRoot.position.set(w.x, this.playSurfaceYOffset() + 1.18, w.z);
      }
      seen.add(u.id);
    }
    for (const [id, root] of [...this.flamingSwordByHeroId]) {
      if (seen.has(id)) continue;
      this.flamingSwordMoveAnims.delete(id);
      this.arenaRoot.remove(root);
      this.disposeObject3D(root);
      this.flamingSwordByHeroId.delete(id);
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
    this.disposeOverlayGroup(this.tiroAimHexOverlayGroup);
    this.tiroAimHexOverlayGroup = null;
    this.disposeOverlayGroup(this.tiroAimLineGroup);
    this.tiroAimLineGroup = null;
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

  /**
   * Mira do Tiro destruidor: hexes atingidos pelo feixe (por cima do overlay de alcance)
   * e coluna luminosa ao longo do traçado.
   */
  setTiroDestruidorAimPreview(
    beamHexKeys: Set<string> | null,
    pathQr: { q: number; r: number }[] | null,
  ): void {
    this.disposeOverlayGroup(this.tiroAimHexOverlayGroup);
    this.tiroAimHexOverlayGroup = null;
    this.disposeOverlayGroup(this.tiroAimLineGroup);
    this.tiroAimLineGroup = null;

    if (beamHexKeys && beamHexKeys.size > 0) {
      this.tiroAimHexOverlayGroup = this.buildHexOverlay(
        beamHexKeys,
        0xfff8f0,
        0.52,
        0.132,
      );
      this.arenaRoot.add(this.tiroAimHexOverlayGroup);
    }
    if (pathQr && pathQr.length >= 2) {
      this.tiroAimLineGroup = this.buildTiroAimingBeamVfx(pathQr, true);
      this.arenaRoot.add(this.tiroAimLineGroup);
    }
  }

  /**
   * Movimento (âmbar) + alcance de ataque (magenta) do mesmo inimigo ao pairar / painel.
   * O conjunto com **menos** hexes desenha-se por cima para o movimento curto não ficar tapado.
   */
  setEnemyInspectCombinedOverlay(
    moveKeys: Set<string>,
    attackKeys: Set<string>,
  ): void {
    this.disposeOverlayGroup(this.enemyInspectMoveOverlayGroup);
    this.disposeOverlayGroup(this.enemyInspectAttackOverlayGroup);
    this.enemyInspectMoveOverlayGroup = null;
    this.enemyInspectAttackOverlayGroup = null;

    const nM = moveKeys.size;
    const nA = attackKeys.size;
    if (nM === 0 && nA === 0) return;

    let orderMove = 12;
    let orderAtk = 13;
    if (nM > 0 && nA > 0) {
      if (nM <= nA) {
        orderMove = 13;
        orderAtk = 12;
      } else {
        orderMove = 12;
        orderAtk = 13;
      }
    } else {
      orderMove = 12;
      orderAtk = 12;
    }

    const moveGroup =
      nM > 0
        ? this.buildHexOverlay(moveKeys, 0xffaa33, 0.42, 0.095, orderMove)
        : null;
    const atkGroup =
      nA > 0
        ? this.buildHexOverlay(attackKeys, 0xe040a8, 0.4, 0.102, orderAtk)
        : null;

    this.enemyInspectMoveOverlayGroup = moveGroup;
    this.enemyInspectAttackOverlayGroup = atkGroup;

    const layers: { g: THREE.Group; ord: number }[] = [];
    if (moveGroup) layers.push({ g: moveGroup, ord: orderMove });
    if (atkGroup) layers.push({ g: atkGroup, ord: orderAtk });
    layers.sort((a, b) => a.ord - b.ord);
    for (const { g } of layers) this.arenaRoot.add(g);
  }

  private buildHexOverlay(
    keys: Set<string>,
    color: number,
    opacity: number,
    y: number,
    groupRenderOrder = 2,
  ): THREE.Group {
    const shape = createHexShape(HEX_SIZE * 0.96);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -10,
      polygonOffsetUnits: -10,
    });
    const group = new THREE.Group();
    group.renderOrder = groupRenderOrder;
    for (const k of keys) {
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = groupRenderOrder;
      const cell = k.split(",").map(Number) as [number, number];
      const { x, z } = axialToWorld(cell[0]!, cell[1]!, HEX_SIZE);
      mesh.position.set(x, y + this.playSurfaceYOffset(), z);
      group.add(mesh);
    }
    return group;
  }

  /**
   * Coluna de luz ao longo do feixe (mira fina ou pode reutilizar padrão de camadas).
   */
  private buildTiroAimingBeamVfx(
    pathQr: { q: number; r: number }[],
    preview: boolean,
  ): THREE.Group {
    const g = new THREE.Group();
    const py = this.playSurfaceYOffset();
    const y = (preview ? 1.38 : 1.06) + py;
    const addSeg = (
      w: number,
      h: number,
      color: number,
      opacity: number,
      additive: boolean,
      yLift: number,
    ) => {
      for (let i = 0; i < pathQr.length - 1; i++) {
        const a = axialToWorld(pathQr[i]!.q, pathQr[i]!.r, HEX_SIZE);
        const b = axialToWorld(pathQr[i + 1]!.q, pathQr[i + 1]!.r, HEX_SIZE);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.max(0.06, Math.hypot(dx, dz));
        const geo = new THREE.BoxGeometry(w, h, len);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        const m = new THREE.Mesh(geo, mat);
        const cx = (a.x + b.x) * 0.5;
        const cz = (a.z + b.z) * 0.5;
        m.position.set(cx, y + yLift, cz);
        m.rotation.y = -Math.atan2(dz, dx);
        g.add(m);
      }
    };
    if (preview) {
      addSeg(0.24, 0.16, 0x55c8ff, 0.48, false, 0);
      addSeg(0.11, 0.12, 0xffffff, 0.82, true, 0.025);
      addSeg(0.2, 0.08, 0xffa0f0, 0.22, true, 0.05);
    }
    return g;
  }

  private disposeOverlayGroup(g: THREE.Group | null): void {
    if (!g) return;
    this.arenaRoot.remove(g);
    this.disposeGroup(g);
  }

  /** Só escudo + vida; v2 remove XP/mana e repõe posição pela bbox do modelo. */
  private static readonly UNIT_BAR_LAYOUT_VERSION = 2;

  /** Topo do corpo (Y local do grupo da unidade) a partir da AABB mundial do mesh. */
  private computeBodyTopLocalY(unitGroup: THREE.Group, body: THREE.Object3D): number {
    const box = this.unitBarBBoxScratch.setFromObject(body);
    if (box.isEmpty()) return unitGroup.userData.isPlayer === true ? 1.45 : 1.5;
    const v = this.unitBarTopScratch;
    v.set((box.min.x + box.max.x) * 0.5, box.max.y, (box.min.z + box.max.z) * 0.5);
    unitGroup.worldToLocal(v);
    return v.y;
  }

  private positionBarRootAboveBody(g: THREE.Group): void {
    const barRoot = g.userData.barRoot as THREE.Group | undefined;
    const body = g.children.find((c) => c.userData?.role === "body") as
      | THREE.Object3D
      | undefined;
    if (!barRoot || !body) return;
    const margin = 0.36;
    barRoot.position.y = this.computeBodyTopLocalY(g, body) + margin;
  }

  private ensureUnitBars(g: THREE.Group, u: Unit): void {
    let barRoot = g.userData.barRoot as THREE.Group | undefined;
    if (
      barRoot &&
      barRoot.userData.layoutVersion !== GameRenderer.UNIT_BAR_LAYOUT_VERSION
    ) {
      this.clearEnemyTierLabel(barRoot);
      const stack = barRoot.userData.statusStack as THREE.Group | undefined;
      if (stack) {
        for (const ch of [...stack.children]) {
          this.disposeStatusBadge(ch as THREE.Mesh);
          stack.remove(ch);
        }
        barRoot.remove(stack);
        delete barRoot.userData.statusStack;
      }
      delete barRoot.userData.statusSig;
      g.remove(barRoot);
      this.disposeGroup(barRoot);
      g.userData.barRoot = undefined;
      barRoot = undefined;
    }
    if (!barRoot) {
      barRoot = new THREE.Group();
      const hpW = 1.05;
      const hpH = 0.12;
      const shY = 0.22;
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

      const hpY = 0.08;
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

      barRoot.userData.layoutVersion = GameRenderer.UNIT_BAR_LAYOUT_VERSION;
      barRoot.userData.role = "bars";
      g.add(barRoot);
      g.userData.barRoot = barRoot;
    }
    this.positionBarRootAboveBody(g);
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
      /** Cilindro ~inscrito no hex (não invade vizinhos); só para raycast ao ocupante. */
      const pickH = 1.45;
      const r = BUNKER_PICK_RADIUS_XZ;
      const segs = BUNKER_PICK_CYLINDER_SEGMENTS;
      if (!proxy) {
        const geo = new THREE.CylinderGeometry(r, r, pickH, segs);
        const mat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        proxy = new THREE.Mesh(geo, mat);
        proxy.position.y = pickH * 0.5 - 0.05;
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
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.getRenderCamera());
    const hits = ray.intersectObjects([...this.hexMeshes.values()]);
    if (!hits.length) return null;
    const k = hits[0]!.object.userData.hexKey as string | undefined;
    if (!k) return null;
    if (!grid.has(k)) return null;
    const [q, r] = k.split(",").map(Number);
    return { q: q!, r: r! };
  }

  /** Combate: hex sob o ponteiro só pelo tile (malha do bunker não entra no raycast lógico). */
  pickCombatHex(
    ndcX: number,
    ndcY: number,
    grid: Map<string, HexCell>,
  ): { q: number; r: number } | null {
    return this.pickHex(ndcX, ndcY, grid);
  }

  pickUnit(
    ndcX: number,
    ndcY: number,
    opts?: {
      grid: Map<string, HexCell>;
      bunkerOccupantIdAt?: (q: number, r: number) => string | null;
    },
  ): string | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.getRenderCamera());
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, g] of this.unitMeshes) {
      const hits = ray.intersectObject(g, true);
      for (const h of hits) {
        if (h.distance < bestDist) {
          bestDist = h.distance;
          bestId = id;
        }
      }
    }
    if (bestId !== null) return bestId;
    const occFn = opts?.bunkerOccupantIdAt;
    if (opts?.grid && occFn) {
      const hex = this.pickCombatHex(ndcX, ndcY, opts.grid);
      if (hex) {
        const occ = occFn(hex.q, hex.r);
        if (occ) return occ;
      }
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

  /**
   * Feixe final (Tiro destruidor): coluna larga estilo “ultimate laser” —
   * bordas em arco-íris (magenta → laranja → ciano), núcleo branco intenso;
   * espessura e clarão na origem escalam com cargas.
   */
  triggerTiroDestruidorPlasma(
    pathQr: { q: number; r: number }[],
    charges: number,
  ): void {
    if (pathQr.length < 2) return;
    const ch = Math.max(0, Math.min(5, charges));
    const scale = 1 + ch * 0.36;
    const g = new THREE.Group();
    const yBeam = 1.02;

    const tagOpacity = (mat: THREE.MeshBasicMaterial, op: number): void => {
      mat.userData.baseOpacity = op;
    };

    const addLayer = (
      width: number,
      height: number,
      color: number,
      opacity: number,
      additive: boolean,
      yLift: number,
    ) => {
      for (let i = 0; i < pathQr.length - 1; i++) {
        const a = axialToWorld(pathQr[i]!.q, pathQr[i]!.r, HEX_SIZE);
        const b = axialToWorld(pathQr[i + 1]!.q, pathQr[i + 1]!.r, HEX_SIZE);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.max(0.08, Math.hypot(dx, dz));
        const geo = new THREE.BoxGeometry(width, height, len * 1.01);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        tagOpacity(mat, opacity);
        const m = new THREE.Mesh(geo, mat);
        const cx = (a.x + b.x) * 0.5;
        const cz = (a.z + b.z) * 0.5;
        m.position.set(cx, yBeam + height * 0.38 + yLift, cz);
        m.rotation.y = -Math.atan2(dz, dx);
        g.add(m);
      }
    };

    const w0 = HEX_SIZE * 0.48 * scale;
    addLayer(w0 * 1.45, 0.68 * scale, 0xb01fc4, 0.22, false, 0);
    addLayer(w0 * 1.12, 0.58 * scale, 0xff5522, 0.3, false, 0.005);
    addLayer(w0 * 0.78, 0.52 * scale, 0x33c8ff, 0.4, false, 0.01);
    addLayer(w0 * 0.38, 0.44 * scale, 0xfff6d0, 0.58, false, 0.016);
    addLayer(w0 * 0.16, 0.36 * scale, 0xffffff, 0.92, true, 0.022);

    const o = axialToWorld(pathQr[0]!.q, pathQr[0]!.r, HEX_SIZE);
    const flareR = 0.24 * scale;
    const flareLayers: [number, number, number][] = [
      [0xff66ee, 0.32, 1.28],
      [0x66eeff, 0.42, 0.82],
      [0xffffff, 0.88, 0.45],
    ];
    for (const [col, op, radMul] of flareLayers) {
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: op,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      tagOpacity(mat, op);
      const geo = new THREE.SphereGeometry(flareR * radMul, 14, 12);
      const sm = new THREE.Mesh(geo, mat);
      sm.position.set(o.x, yBeam + 0.55 * scale, o.z);
      g.add(sm);
    }

    this.arenaRoot.add(g);
    const startMs = performance.now();
    const dur = 580 + ch * 125;
    this.plasmaBeamFx.push({ group: g, until: startMs + dur, startMs });
  }

  queueDamageProjectile(
    fromId: string,
    toId: string,
    opts: { style: "bullet" | "magic" | "air"; durationSec: number },
  ): void {
    const a = this.unitMeshes.get(fromId);
    const b = this.unitMeshes.get(toId);
    if (!a || !b) return;
    const r =
      opts.style === "bullet" ? 0.13 : opts.style === "air" ? 0.19 : 0.2;
    const geo = new THREE.SphereGeometry(r, 10, 10);
    const col =
      opts.style === "bullet"
        ? 0x4a3020
        : opts.style === "air"
          ? 0x26c6da
          : 0xaa66ff;
    const mat = new THREE.MeshBasicMaterial({
      color: col,
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
    this.spawnComicPowBurst(g.position.x, g.position.y + 1.12, g.position.z);
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
          this.spawnLandmineFireExplosion(
            mesh.position.x,
            mesh.position.y + 0.32,
            mesh.position.z,
          );
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
    const y0 = a.position.y + 1.35;
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
      biome?: BiomeId;
    }[] | null,
    show: boolean,
  ): void {
    if (!show || !bunkers || bunkers.length === 0) {
      for (const root of this.bunkerRoots.values()) {
        this.arenaRoot.remove(root);
        disposeBunkerMountGroup(root);
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
        disposeBunkerMountGroup(root);
        this.bunkerRoots.delete(k);
        this.bunkerHitFlashUntil.delete(k);
      }
    }
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    for (const b of bunkers) {
      if (b.hp <= 0) continue;
      const k = axialKey(b.q, b.r);
      const wasExisting = this.bunkerRoots.has(k);
      let root = this.bunkerRoots.get(k);
      const tier = b.tier;
      const biome = b.biome;
      if (!root) {
        root = new THREE.Group();
        root.name = `bunker_mount_${k}`;
        root.userData.layoutBunkerBiome = biome;
        root.userData.bunkerAxialQ = b.q;
        root.userData.bunkerAxialR = b.r;
        root.userData.bunkerDataTier = tier;
        root.userData.layoutPreviewTier = null;
        const vis = createBunkerVisualGroup(tier);
        root.add(vis);
        root.userData.bunkerVisual = vis;
        root.userData.bunkerVisualTier = tier;
        this.bunkerRoots.set(k, root);
        this.arenaRoot.add(root);
      } else {
        root.userData.layoutBunkerBiome = biome;
        root.userData.bunkerAxialQ = b.q;
        root.userData.bunkerAxialR = b.r;
        root.userData.bunkerDataTier = tier;
        const preview = root.userData.layoutPreviewTier as
          | BunkerRenderTier
          | null
          | undefined;
        const visualTier =
          this.arenaLayoutEditActive && preview != null ? preview : tier;
        if (
          (root.userData.bunkerVisualTier as BunkerRenderTier | undefined) !==
          visualTier
        ) {
          const oldV = root.userData.bunkerVisual as THREE.Group | undefined;
          if (oldV) {
            root.remove(oldV);
            disposeBunkerVisualRoot(oldV);
          }
          const vis = createBunkerVisualGroup(visualTier);
          root.add(vis);
          root.userData.bunkerVisual = vis;
          root.userData.bunkerVisualTier = visualTier;
        }
      }
      if (!this.arenaLayoutEditActive || !wasExisting) {
        const raw: BunkerLayoutEntry =
          biome && snap.bunkerLayout?.[biome]
            ? snap.bunkerLayout[biome]!
            : { x: 0, z: 0, scale: 1 };
        const off: BunkerLayoutEntry = {
          x: 0,
          z: 0,
          scale:
            typeof raw.scale === "number" && Number.isFinite(raw.scale)
              ? THREE.MathUtils.clamp(raw.scale, 0.02, 48)
              : 1,
          y: raw.y,
          yByTier: raw.yByTier,
          rotY: raw.rotY,
        };
        const base = axialToWorld(b.q, b.r, HEX_SIZE);
        const py = this.playSurfaceYOffset();
        const preview = root.userData.layoutPreviewTier as
          | BunkerRenderTier
          | null
          | undefined;
        const tierForY =
          this.arenaLayoutEditActive && preview != null ? preview : tier;
        const yOff = bunkerMountYOffset(off, tierForY);
        const rotY =
          typeof off.rotY === "number" && Number.isFinite(off.rotY)
            ? off.rotY
            : 0;
        root.position.set(base.x, py + yOff, base.z);
        root.rotation.set(0, rotY, 0);
        root.scale.setScalar(off.scale);
      }
      this.ensureBunkerInteractionVolume(root);
    }
  }

  /** Volume invisível para raycast (GLB pode falhar ou ser irregular); não altera aspeto. */
  private ensureBunkerInteractionVolume(root: THREE.Group): void {
    const pickH = 2.85;
    const r = BUNKER_PICK_RADIUS_XZ;
    const segs = BUNKER_PICK_CYLINDER_SEGMENTS;
    let pick = root.userData.bunkerRayPick as THREE.Mesh | undefined;
    const mat =
      pick?.material instanceof THREE.MeshBasicMaterial
        ? (pick.material as THREE.MeshBasicMaterial)
        : new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
    const geoOk =
      pick?.geometry instanceof THREE.CylinderGeometry &&
      (pick.userData.bunkerPickR as number | undefined) === r &&
      (pick.userData.bunkerPickH as number | undefined) === pickH;
    if (!pick) {
      pick = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, pickH, segs),
        mat,
      );
      pick.userData.role = "bunkerRayPick";
      pick.userData.bunkerPickR = r;
      pick.userData.bunkerPickH = pickH;
      root.add(pick);
      root.userData.bunkerRayPick = pick;
    } else if (!geoOk) {
      pick.geometry.dispose();
      pick.geometry = new THREE.CylinderGeometry(r, r, pickH, segs);
      pick.userData.bunkerPickR = r;
      pick.userData.bunkerPickH = pickH;
    }
    pick.position.y = pickH * 0.5 - 0.02;
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
      const baseY = this.playSurfaceYOffset();
      if (elapsed >= ju.durationMs) {
        g.position.set(ju.baseX, baseY + fy, ju.baseZ);
        this.heroUltJumpById.delete(id);
        continue;
      }
      const t = elapsed / ju.durationMs;
      const y = ju.peakY * Math.sin(Math.PI * t);
      g.position.set(ju.baseX, baseY + fy + y, ju.baseZ);
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
        continue;
      }
      const life = (now - b.startMs) / (b.until - b.startMs);
      const fade = Math.max(0.08, 1 - Math.pow(life, 1.28));
      const pulse = 0.9 + 0.1 * Math.sin(now * 0.018);
      b.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const m = obj.material as THREE.MeshBasicMaterial & {
            userData?: { baseOpacity?: number };
          };
          const base = m.userData?.baseOpacity ?? m.opacity;
          m.opacity = Math.min(1, base * fade * pulse);
        }
      });
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
        this.disposeObject3D(p.mesh);
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
        this.spawnLandmineFireExplosion(
          p.x1,
          this.playSurfaceYOffset() + 1.05,
          p.z1,
        );
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
    for (const [id, root] of [...this.flamingSwordByHeroId]) {
      const ug = this.unitMeshes.get(id);
      if (!ug) {
        this.arenaRoot.remove(root);
        this.disposeObject3D(root);
        this.flamingSwordMoveAnims.delete(id);
        this.flamingSwordByHeroId.delete(id);
        continue;
      }
      if (this.flamingSwordMoveAnims.has(id)) continue;
      root.rotation.y += dt * 3.4;
      root.position.y += Math.sin(now * 0.006 + root.id) * 0.0009;
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

  /**
   * Herói do turno (fase jogador) para aplicar facing pós-clique de ataque.
   * Inimigos / fase inimiga: null (todos os heróis usam a baseline da run).
   */
  setCombatTurnHeroIdForFacing(id: string | null): void {
    this.combatTurnHeroIdForFacing = id;
  }

  /** Após mover, o herói volta à baseline da run (seta / diagonal sup.-esq.). */
  clearHeroAttackFacing(heroId: string): void {
    this.heroAttackFacingY.delete(heroId);
  }

  /**
   * Olhar na direção do clique no plano do chão (só faz sentido chamar após ataque com rato).
   * Convenção de yaw igual a `queueUnitMoveAlongCells`.
   */
  applyHeroAttackFacingFromPointer(
    heroId: string,
    ndcX: number,
    ndcY: number,
  ): void {
    const g = this.unitMeshes.get(heroId);
    if (!g) return;
    this.attackFacingNdcScratch.set(ndcX, ndcY);
    this.rayGround.setFromCamera(
      this.attackFacingNdcScratch,
      this.getRenderCamera(),
    );
    const hit = this.attackFacingGroundScratch;
    if (!this.rayGround.ray.intersectPlane(this.groundPlane, hit)) return;
    const tx = hit.x;
    const tz = hit.z;
    const hx = g.position.x;
    const hz = g.position.z;
    const dx = tx - hx;
    const dz = tz - hz;
    if (Math.hypot(dx, dz) < 1e-5) return;
    const yaw = -Math.atan2(dz, dx);
    if (!Number.isFinite(yaw)) return;
    this.heroAttackFacingY.set(heroId, yaw);
  }

  private setGroupYawIfFinite(g: THREE.Object3D, yaw: number): void {
    if (Number.isFinite(yaw)) g.rotation.y = yaw;
  }

  /**
   * Heróis olham para a diagonal superior-esquerda do ecrã (baseline da run).
   * Só o herói do turno pode olhar para o último clique após um ataque com rato.
   * Em deslocamento: heróis mantêm baseline/ataque; inimigos alinham ao segmento.
   */
  private refreshUnitFacingForCombatView(): void {
    if (this.unitMeshes.size === 0) return;
    const cam = this.getRenderCamera();
    cam.updateMatrixWorld(true);

    const view = this.scratchFacingView;
    cam.getWorldDirection(view);
    view.negate();
    view.y = 0;
    if (view.lengthSq() < 1e-8) return;
    view.normalize();

    const right = this.scratchFacingRight.crossVectors(
      this.unitFacingWorldUp,
      view,
    );
    if (right.lengthSq() < 1e-8) return;
    right.normalize();

    const screenUp = this.scratchFacingScreenUp.crossVectors(view, right);
    screenUp.y = 0;
    if (screenUp.lengthSq() < 1e-8) {
      screenUp.copy(view).cross(this.unitFacingWorldUp).normalize();
    } else {
      screenUp.normalize();
    }

    const towardUpperLeft = this.scratchFacingDiag.copy(screenUp).sub(right);
    towardUpperLeft.y = 0;
    if (towardUpperLeft.lengthSq() < 1e-8) {
      towardUpperLeft.set(-1, 0, -1);
    } else {
      towardUpperLeft.normalize();
    }

    const c = Math.cos(this.arenaYaw);
    const s = Math.sin(this.arenaYaw);
    const turnId = this.combatTurnHeroIdForFacing;

    for (const [uid, g] of this.unitMeshes) {
      if (this.unitMoveAnims.has(uid)) {
        const isPlayer = g.userData.isPlayer === true;
        if (!isPlayer) {
          const a = this.unitMoveAnims.get(uid)!;
          const i = a.segIndex;
          if (i < a.cells.length - 1) {
            const u0 = a.cells[i]!;
            const u1 = a.cells[i + 1]!;
            const p0 = axialToWorld(u0.q, u0.r, HEX_SIZE);
            const p1 = axialToWorld(u1.q, u1.r, HEX_SIZE);
            const dx = p1.x - p0.x;
            const dz = p1.z - p0.z;
            this.setGroupYawIfFinite(g, -Math.atan2(dz, dx));
          }
        }
        if (isPlayer) {
          const useAtk = turnId === uid && this.heroAttackFacingY.has(uid);
          if (useAtk) {
            this.setGroupYawIfFinite(g, this.heroAttackFacingY.get(uid)!);
          } else {
            const Dx = towardUpperLeft.x;
            const Dz = towardUpperLeft.z;
            const lx = Dx * c - Dz * s;
            const lz = Dx * s + Dz * c;
            this.setGroupYawIfFinite(g, Math.atan2(lx, lz));
          }
        }
        continue;
      }

      const isPlayer = g.userData.isPlayer === true;
      if (isPlayer) {
        const useAtk = turnId === uid && this.heroAttackFacingY.has(uid);
        if (useAtk) {
          this.setGroupYawIfFinite(g, this.heroAttackFacingY.get(uid)!);
        } else {
          const Dx = towardUpperLeft.x;
          const Dz = towardUpperLeft.z;
          const lx = Dx * c - Dz * s;
          const lz = Dx * s + Dz * c;
          this.setGroupYawIfFinite(g, Math.atan2(lx, lz));
        }
        continue;
      }

      const Dx = -towardUpperLeft.x;
      const Dz = -towardUpperLeft.z;
      const lx = Dx * c - Dz * s;
      const lz = Dx * s + Dz * c;
      this.setGroupYawIfFinite(g, Math.atan2(lx, lz));
    }
  }

  tick(): void {
    const dt = this.clock.getDelta();
    const cometOn = this.cometaArcanoCinematic !== null;
    this.updateUnitMoveAnims(dt);
    this.updateFlamingSwordMoveAnims(dt);
    for (const g of this.unitMeshes.values()) {
      const body = g.children.find((c) => c.userData?.role === "body");
      if (body) updateHeroUnitAnimations(body, dt);
    }
    this.updateFlyingHeroPerFrameMotion(performance.now());
    this.updateFlyingHeroGroundShadows();
    this.updateShieldBubblePulse(dt);
    this.updateArenaLayoutEditSession(dt);
    if (!cometOn) {
      this.updateArenaYawLerp(dt);
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
    /** Vista livre em perspetiva (combate/menu com prefs, ou ajuste de cena). */
    const perspectiveFreeCameraActive =
      this.arenaLayoutEditActive ||
      (this.usePersistentFreeCamera &&
        !this.combatUsesOrthographicView &&
        !this.arenaLayoutEditActive);
    if (
      !draggingCameraPan &&
      !cometOn &&
      !perspectiveFreeCameraActive &&
      !this.arenaLayoutEditActive
    ) {
      this.clampPanIntoColiseum();
      this.applyCameraPose();
    }
    if (
      !cometOn &&
      !perspectiveFreeCameraActive &&
      !this.arenaLayoutEditActive &&
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
    this.refreshUnitFacingForCombatView();
    const rc = this.getRenderCamera();
    for (const g of this.unitMeshes.values()) {
      const br = g.userData.barRoot as THREE.Group | undefined;
      if (br) br.lookAt(rc.position);
    }
    this.updateHeroUltJumps();
    this.updateCombatDecorations(dt);
    this.updateHeroSelectionCone();
    this.updateHitFlashes();
    this.renderer.render(this.scene, rc);
  }

  applySceneLayoutPrefs(prefs: SceneLayoutPrefs): void {
    this.sceneLayoutPrefsSnapshot = cloneSceneLayoutPrefs(prefs);
    if (this.arenaColiseumMount) {
      this.arenaColiseumMount.position.set(
        prefs.coliseum.x,
        prefs.coliseum.y,
        prefs.coliseum.z,
      );
      const sc =
        typeof prefs.coliseumScale === "number" &&
        Number.isFinite(prefs.coliseumScale)
          ? THREE.MathUtils.clamp(prefs.coliseumScale, 0.02, 48)
          : 1;
      this.arenaColiseumMount.scale.setScalar(sc);
    }
    if (!this.arenaLayoutEditActive) {
      if (prefs.freeCamera) {
        const fc = prefs.freeCamera;
        this.freeCamera.position.set(fc.position[0], fc.position[1], fc.position[2]);
        this.freeCamera.quaternion.set(
          fc.quaternion[0],
          fc.quaternion[1],
          fc.quaternion[2],
          fc.quaternion[3],
        );
        this.freeCamera.fov = fc.fov;
        this.freeCamera.updateProjectionMatrix();
        this.usePersistentFreeCamera = true;
      } else {
        this.usePersistentFreeCamera = false;
      }
    }
    this.applyBunkerMountsPoseFromPrefs();
    this.applyThroneLayoutPose(this.playSurfaceYOffset());
    const legMesh = this.unitMeshes.get("layout-enemy");
    if (legMesh) {
      delete (
        legMesh.userData as {
          layoutEnemyPreviewArchetypeId?: string;
          modelKey?: string;
        }
      ).layoutEnemyPreviewArchetypeId;
      delete (
        legMesh.userData as { layoutEnemyPreviewArchetypeId?: string; modelKey?: string }
      ).modelKey;
    }
  }

  private applyBunkerMountsPoseFromPrefs(): void {
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    for (const root of this.bunkerRoots.values()) {
      const biome = root.userData.layoutBunkerBiome as BiomeId | undefined;
      const q0 = root.userData.bunkerAxialQ as number | undefined;
      const r0 = root.userData.bunkerAxialR as number | undefined;
      if (!biome || q0 === undefined || r0 === undefined) continue;
      const lay = snap.bunkerLayout?.[biome];
      const off: BunkerLayoutEntry = lay ?? {
        x: 0,
        z: 0,
        scale: 1,
      };
      const base = axialToWorld(q0, r0, HEX_SIZE);
      const py = this.playSurfaceYOffset();
      const sc = THREE.MathUtils.clamp(off.scale, 0.02, 48);
      const dataTier = (root.userData.bunkerDataTier ?? 0) as BunkerRenderTier;
      const preview = root.userData.layoutPreviewTier as BunkerRenderTier | null | undefined;
      const tierForY =
        this.arenaLayoutEditActive &&
        this.layoutSelectedRoot === root &&
        preview != null
          ? preview
          : dataTier;
      const yOff = bunkerMountYOffset(off, tierForY);
      const rotY =
        typeof off.rotY === "number" && Number.isFinite(off.rotY) ? off.rotY : 0;
      root.position.set(base.x, py + yOff, base.z);
      root.rotation.set(0, rotY, 0);
      root.scale.setScalar(sc);
    }
  }

  private mergeBunkerLayoutFromMounts(
    base: Partial<Record<BiomeId, BunkerLayoutEntry>>,
  ): Partial<Record<BiomeId, BunkerLayoutEntry>> {
    const out: Partial<Record<BiomeId, BunkerLayoutEntry>> = { ...base };
    for (const root of this.bunkerRoots.values()) {
      const biome = root.userData.layoutBunkerBiome as BiomeId | undefined;
      if (!biome || !COMBAT_BIOMES.includes(biome)) continue;
      const q = root.userData.bunkerAxialQ as number | undefined;
      const r = root.userData.bunkerAxialR as number | undefined;
      if (q === undefined || r === undefined) continue;
      const prev = out[biome] ?? { x: 0, z: 0, scale: 1 };
      const py = this.playSurfaceYOffset();
      const yByTier: Partial<Record<"0" | "1" | "2", number>> = {
        ...(prev.yByTier ?? {}),
      };
      const dataTier = (root.userData.bunkerDataTier ?? 0) as BunkerRenderTier;
      const preview = root.userData.layoutPreviewTier as BunkerRenderTier | null | undefined;
      const tt =
        this.arenaLayoutEditActive &&
        this.layoutSelectedRoot === root &&
        preview != null
          ? preview
          : dataTier;
      const tierKey = String(tt) as "0" | "1" | "2";
      yByTier[tierKey] = root.position.y - py;
      out[biome] = {
        x: 0,
        z: 0,
        scale: THREE.MathUtils.clamp(root.scale.x, 0.02, 48),
        yByTier,
        rotY: root.rotation.y,
      };
    }
    return out;
  }

  private mergeLayoutActorsFromScene(
    base: Partial<Record<string, LayoutActorEntry>>,
  ): Partial<Record<string, LayoutActorEntry>> {
    const out: Partial<Record<string, LayoutActorEntry>> = { ...base };
    const py = this.playSurfaceYOffset();
    const tg = this.throneGroup;
    out.throne = {
      x: tg.position.x - THRONE_BASE_X,
      y: tg.position.y - py,
      z: tg.position.z - THRONE_BASE_Z,
      scale: THREE.MathUtils.clamp(tg.scale.x, 0.02, 48),
    };
    for (const [id, g] of this.unitMeshes) {
      if (!id.startsWith("layout-") || id === "layout-enemy") continue;
      const q = g.userData.layoutActorAxialQ as number | undefined;
      const r = g.userData.layoutActorAxialR as number | undefined;
      if (q === undefined || r === undefined) continue;
      const baseW = axialToWorld(q, r, HEX_SIZE);
      const flyY = Number(g.userData.layoutActorFlyY) || 0;
      const baseY = py + flyY;
      out[id] = {
        x: g.position.x - baseW.x,
        y: g.position.y - baseY,
        z: g.position.z - baseW.z,
        scale: THREE.MathUtils.clamp(g.scale.x, 0.02, 48),
      };
    }
    return out;
  }

  private mergeLayoutEnemyEditorFromScene(
    base: LayoutEnemyEditorPrefs | undefined,
  ): LayoutEnemyEditorPrefs {
    const yByArchetype: Partial<Record<string, number>> = {
      ...(base?.yByArchetype ?? {}),
    };
    let previewArchetypeId = base?.previewArchetypeId ?? "gladinio";
    if (!ENEMY_BY_ID[previewArchetypeId]) previewArchetypeId = "gladinio";
    const g = this.unitMeshes.get("layout-enemy");
    if (g) {
      const pidRaw = g.userData.layoutEnemyPreviewArchetypeId as
        | string
        | undefined;
      if (pidRaw && ENEMY_BY_ID[pidRaw]) previewArchetypeId = pidRaw;
      const q = g.userData.layoutActorAxialQ as number | undefined;
      const r = g.userData.layoutActorAxialR as number | undefined;
      if (q !== undefined && r !== undefined) {
        const py = this.playSurfaceYOffset();
        const flyY = Number(g.userData.layoutActorFlyY) || 0;
        const baseY = py + flyY;
        yByArchetype[previewArchetypeId] = g.position.y - baseY;
      }
    }
    return { previewArchetypeId, yByArchetype };
  }

  getColiseumOffsetForPrefs(): { x: number; y: number; z: number } {
    const m = this.arenaColiseumMount;
    return m
      ? { x: m.position.x, y: m.position.y, z: m.position.z }
      : { x: 0, y: 0, z: 0 };
  }

  /** Copia pose da ortográfica para `freeCamera` antes de serializar prefs (vista isométrica). */
  private syncFreeCameraSnapshotFromOrthoForPrefs(): void {
    if (!this.arenaLayoutCameraPersonalized) return;
    this.freeCamera.position.copy(this.camera.position);
    this.freeCamera.quaternion.copy(this.camera.quaternion);
    this.freeCamera.updateProjectionMatrix();
  }

  private cloneFreeCameraPrefsPayload(): NonNullable<SceneLayoutPrefs["freeCamera"]> {
    return {
      position: [
        this.freeCamera.position.x,
        this.freeCamera.position.y,
        this.freeCamera.position.z,
      ] as [number, number, number],
      quaternion: [
        this.freeCamera.quaternion.x,
        this.freeCamera.quaternion.y,
        this.freeCamera.quaternion.z,
        this.freeCamera.quaternion.w,
      ] as [number, number, number, number],
      fov: this.freeCamera.fov,
    };
  }

  collectSceneLayoutPrefs(): SceneLayoutPrefs {
    const coliseum = this.getColiseumOffsetForPrefs();
    const m = this.arenaColiseumMount;
    const coliseumScale = m
      ? THREE.MathUtils.clamp(m.scale.x, 0.02, 48)
      : 1;
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    const bunkerLayout = this.mergeBunkerLayoutFromMounts({
      ...(snap.bunkerLayout ?? {}),
    });
    const defaultLee: LayoutEnemyEditorPrefs = {
      previewArchetypeId: "gladinio",
      yByArchetype: {},
    };
    if (this.arenaLayoutEditActive) {
      const layoutActors = this.mergeLayoutActorsFromScene({
        ...(snap.layoutActors ?? {}),
      });
      const layoutEnemyEditor = this.mergeLayoutEnemyEditorFromScene(
        snap.layoutEnemyEditor ?? defaultLee,
      );
      const fc = this.layoutEditFrozenFreeCamera;
      return {
        coliseum,
        coliseumScale,
        bunkerLayout,
        layoutActors,
        layoutEnemyEditor,
        freeCamera: fc
          ? {
              position: [...fc.position] as [number, number, number],
              quaternion: [...fc.quaternion] as [
                number,
                number,
                number,
                number,
              ],
              fov: fc.fov,
            }
          : null,
      };
    }
    if (!this.arenaLayoutCameraPersonalized) {
      return {
        coliseum,
        coliseumScale,
        bunkerLayout,
        layoutActors: snap.layoutActors ?? {},
        layoutEnemyEditor: snap.layoutEnemyEditor ?? defaultLee,
        freeCamera: null,
      };
    }
    this.syncFreeCameraSnapshotFromOrthoForPrefs();
    const freeCamera = this.cloneFreeCameraPrefsPayload();
    return {
      coliseum,
      coliseumScale,
      bunkerLayout,
      layoutActors: snap.layoutActors ?? {},
      layoutEnemyEditor: snap.layoutEnemyEditor ?? defaultLee,
      freeCamera,
    };
  }

  /** Menu principal (só `import.meta.env.DEV`): permite iniciar a sessão de ajuste. */
  setArenaLayoutEditEligible(eligible: boolean): void {
    this.arenaLayoutEditEligible = Boolean(eligible && import.meta.env.DEV);
    if (!this.arenaLayoutEditEligible && this.arenaLayoutEditActive) {
      this.endArenaLayoutEditSession();
    }
  }

  /**
   * Entra na sessão de ajuste do coliseu e da câmara (gravado em `localStorage` para run e sandbox).
   * Só em build de desenvolvimento e com `setArenaLayoutEditEligible(true)` (menu principal).
   */
  enterArenaLayoutEditFromMenu(canvas: HTMLCanvasElement): void {
    if (
      !import.meta.env.DEV ||
      !this.arenaLayoutEditEligible ||
      this.arenaLayoutEditActive
    )
      return;
    this.beginArenaLayoutSession(canvas);
  }

  /** Apaga câmara personalizada guardada (volta à ortográfica no jogo). */
  clearPersistedFreeCamera(): void {
    this.usePersistentFreeCamera = false;
  }

  private layoutEditFreeOrbitRadiusMax(): number {
    return this.arenaLayoutEditActive ? 540 * LAYOUT_EDIT_ZOOM_OUT_FRUSTUM_FACTOR : 540;
  }

  /** Alvo de dolly/roda: interseção do olhar ao centro do ecrã com o plano do chão. */
  private initLayoutEditOrbitFromFreeCamera(): void {
    const cam = this.freeCamera;
    cam.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), cam);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(this.groundPlane, hit)) {
      this.orbitTarget.copy(hit);
    } else {
      this.orbitTarget.set(this.pan.x, 0, this.pan.y);
    }
  }

  /** Pan com botão direito: move alvo e câmara em XZ (mantém pose relativa). */
  private applyLayoutEditCameraPanDeltaFromClientPixels(
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

    const ndc = this.clientToNdc(canvas, clientX, clientY);
    const hNdc = 0.002;
    const cam = this.freeCamera;
    const base = this.intersectGroundNdcWithCamera(
      cam,
      ndc.x,
      ndc.y,
      this.panDragBase,
    );
    const hx = this.intersectGroundNdcWithCamera(
      cam,
      ndc.x + hNdc,
      ndc.y,
      this.panDragHx,
    );
    const hy = this.intersectGroundNdcWithCamera(
      cam,
      ndc.x,
      ndc.y + hNdc,
      this.panDragHy,
    );
    if (!base || !hx || !hy) return;

    const invH = 1 / hNdc;
    const jxx = (hx.x - base.x) * invH;
    const jzx = (hx.z - base.z) * invH;
    const jxy = (hy.x - base.x) * invH;
    const jzy = (hy.z - base.z) * invH;

    const dWx = jxx * dndcX + jxy * dndcY;
    const dWz = jzx * dndcX + jzy * dndcY;

    this.orbitTarget.x -= dWx;
    this.orbitTarget.z -= dWz;
    this.freeCamera.position.x -= dWx;
    this.freeCamera.position.z -= dWz;
    this.freeCamera.updateMatrixWorld(true);
  }

  private dollyLayoutEditFreeCamera(factor: number): void {
    const toCam = this.editorScratchVec3.subVectors(
      this.freeCamera.position,
      this.orbitTarget,
    );
    const d = toCam.length();
    if (d < 1e-4) return;
    const newD = THREE.MathUtils.clamp(
      d * factor,
      12,
      this.layoutEditFreeOrbitRadiusMax(),
    );
    toCam.multiplyScalar(newD / d);
    this.freeCamera.position.copy(this.orbitTarget).add(toCam);
    this.freeCamera.updateMatrixWorld(true);
  }

  /** Roda em modo voo: usa delta em “pixels” (normaliza DOM_DELTA_LINE/PAGE). */
  private dollyLayoutEditFlyAlongWheel(deltaYPixels: number): void {
    const dir = this.layoutFlyForward;
    this.freeCamera.getWorldDirection(dir);
    const step = -deltaYPixels * 0.11;
    this.freeCamera.position.addScaledVector(dir, step);
    this.freeCamera.updateMatrixWorld(true);
  }

  private normalizeWheelDeltaY(e: WheelEvent): number {
    switch (e.deltaMode) {
      case WheelEvent.DOM_DELTA_LINE:
        return e.deltaY * 16;
      case WheelEvent.DOM_DELTA_PAGE:
        return e.deltaY * Math.max(this.domCanvas?.clientHeight ?? 480, 120);
      default:
        return e.deltaY;
    }
  }

  private applyLayoutEditFlyLookDelta(dx: number, dy: number): void {
    const cam = this.freeCamera;
    const euler = this.layoutFlyEulerScratch;
    euler.setFromQuaternion(cam.quaternion, "YXZ");
    euler.y -= dx * 0.0055;
    euler.x -= dy * 0.0055;
    euler.x = THREE.MathUtils.clamp(euler.x, -1.56, 1.56);
    this.layoutFlyQuatScratch.setFromEuler(euler);
    cam.quaternion.copy(this.layoutFlyQuatScratch);
    cam.updateMatrixWorld(true);
  }

  private applyLayoutEditFlyCameraMove(dt: number): void {
    const cam = this.freeCamera;
    const sp = 58 * dt;
    cam.getWorldDirection(this.layoutFlyForward);
    this.layoutFlyRight.crossVectors(this.layoutFlyForward, this.layoutFlyWorldUp);
    if (this.layoutFlyRight.lengthSq() < 1e-8) {
      this.layoutFlyRight.set(1, 0, 0);
    } else {
      this.layoutFlyRight.normalize();
    }
    const flat = this.editorScratchVec3.copy(this.layoutFlyForward);
    flat.y = 0;
    if (flat.lengthSq() > 1e-6) flat.normalize();
    if (this.keysDown.has("KeyW")) cam.position.addScaledVector(flat, sp);
    if (this.keysDown.has("KeyS")) cam.position.addScaledVector(flat, -sp);
    if (this.keysDown.has("KeyA")) cam.position.addScaledVector(this.layoutFlyRight, -sp);
    if (this.keysDown.has("KeyD")) cam.position.addScaledVector(this.layoutFlyRight, sp);
    if (this.keysDown.has("KeyQ")) cam.position.y += sp;
    if (this.keysDown.has("KeyE")) cam.position.y -= sp;
    cam.updateMatrixWorld(true);
  }

  private intersectGroundNdcWithCamera(
    cam: THREE.Camera,
    ndcX: number,
    ndcY: number,
    out: THREE.Vector3,
  ): THREE.Vector3 | null {
    this.rayGround.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
    if (!this.rayGround.ray.intersectPlane(this.groundPlane, out)) return null;
    return out;
  }

  private clientToNdcForEditor(
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

  private intersectGroundWithCamera(
    cam: THREE.Camera,
    ndcX: number,
    ndcY: number,
    planeY: number,
    out: THREE.Vector3,
  ): boolean {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    return ray.ray.intersectPlane(plane, out) !== null;
  }

  private applyWorldDeltaToLayoutMountXZ(
    mount: THREE.Object3D,
    dw: THREE.Vector3,
  ): void {
    if (mount.userData?.layoutBunkerBiome != null) return;
    const c = Math.cos(-this.arenaYaw);
    const s = Math.sin(-this.arenaYaw);
    const lx = dw.x * c + dw.z * s;
    const lz = -dw.x * s + dw.z * c;
    mount.position.x += lx;
    mount.position.z += lz;
  }

  private static layoutPickIsSolid(obj: THREE.Object3D): boolean {
    return (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.SkinnedMesh ||
      obj instanceof THREE.InstancedMesh
    );
  }

  /**
   * Bunkers primeiro (mais próximo ao raio), depois coliseu — evita o GLB enorme “roubar” o clique.
   */
  private pickLayoutSelectableRoot(
    cam: THREE.Camera,
    ndcX: number,
    ndcY: number,
  ): THREE.Object3D | null {
    const bunkers = [...this.bunkerRoots.values()];
    const col = this.arenaColiseumMount;
    if (cam === this.camera) this.applyCameraPose();
    else {
      if (cam instanceof THREE.PerspectiveCamera) cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    }
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

    let bestB: THREE.Intersection | null = null;
    const bunkerSet = new Set<THREE.Object3D>(bunkers);
    for (const r of bunkers) {
      r.updateMatrixWorld(true);
      for (const h of ray.intersectObject(r, true)) {
        if (!GameRenderer.layoutPickIsSolid(h.object)) continue;
        if (!bestB || h.distance < bestB.distance) bestB = h;
      }
    }
    if (bestB) {
      let p: THREE.Object3D | null = bestB.object;
      while (p) {
        if (bunkerSet.has(p)) return p;
        p = p.parent;
      }
    }

    let bestU: THREE.Intersection | null = null;
    let bestUG: THREE.Group | null = null;
    for (const [id, g] of this.unitMeshes) {
      if (!id.startsWith("layout-")) continue;
      g.updateMatrixWorld(true);
      for (const h of ray.intersectObject(g, true)) {
        if (!GameRenderer.layoutPickIsSolid(h.object)) continue;
        if (!bestU || h.distance < bestU.distance) {
          bestU = h;
          bestUG = g;
        }
      }
    }
    if (bestUG) return bestUG;

    this.throneGroup.updateMatrixWorld(true);
    let bestT: THREE.Intersection | null = null;
    for (const h of ray.intersectObject(this.throneGroup, true)) {
      if (!GameRenderer.layoutPickIsSolid(h.object)) continue;
      if (!bestT || h.distance < bestT.distance) bestT = h;
    }
    if (bestT) return this.throneGroup;

    if (!col) return null;
    col.updateMatrixWorld(true);
    let bestC: THREE.Intersection | null = null;
    for (const h of ray.intersectObject(col, true)) {
      if (!GameRenderer.layoutPickIsSolid(h.object)) continue;
      if (!bestC || h.distance < bestC.distance) bestC = h;
    }
    if (!bestC) return null;
    let q: THREE.Object3D | null = bestC.object;
    while (q) {
      if (q === col) return col;
      q = q.parent;
    }
    return null;
  }

  private rayHitsLayoutRoot(
    cam: THREE.Camera,
    ndcX: number,
    ndcY: number,
    root: THREE.Object3D,
  ): boolean {
    if (cam === this.camera) this.applyCameraPose();
    else {
      if (cam instanceof THREE.PerspectiveCamera) cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    }
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
    const hits = ray.intersectObject(root, true);
    return hits.some((h) => GameRenderer.layoutPickIsSolid(h.object));
  }

  private readonly layoutSelectionEmissiveBackup = new WeakMap<
    THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    { c: THREE.Color; i: number }
  >();

  private static isLayoutSelectionPbr(
    m: THREE.Material,
  ): m is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
    return (
      m instanceof THREE.MeshStandardMaterial ||
      m instanceof THREE.MeshPhysicalMaterial
    );
  }

  /** Mesmo realce violeta do editor de equipamento (forja): emissive 0x442266. */
  private clearLayoutSelectionEmissive(root: THREE.Object3D | null): void {
    if (!root) return;
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      const restore = (
        m: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
      ): void => {
        const b = this.layoutSelectionEmissiveBackup.get(m);
        if (b) {
          m.emissive.copy(b.c);
          m.emissiveIntensity = b.i;
          this.layoutSelectionEmissiveBackup.delete(m);
        }
      };
      if (Array.isArray(mat)) {
        mat.forEach((x) => {
          if (GameRenderer.isLayoutSelectionPbr(x)) restore(x);
        });
      } else if (GameRenderer.isLayoutSelectionPbr(mat)) {
        restore(mat);
      }
    });
  }

  private applyLayoutSelectionEmissive(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const role = obj.userData?.role as string | undefined;
      if (
        role === "bars" ||
        role === "shieldBubble" ||
        role === "bunkerPickProxy"
      ) {
        return;
      }
      const mat = obj.material;
      const apply = (
        m: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
      ): void => {
        if (!this.layoutSelectionEmissiveBackup.has(m)) {
          this.layoutSelectionEmissiveBackup.set(m, {
            c: m.emissive.clone(),
            i: m.emissiveIntensity,
          });
        }
        m.emissive.setHex(0x442266);
        m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.35);
      };
      if (Array.isArray(mat)) {
        mat.forEach((x) => {
          if (GameRenderer.isLayoutSelectionPbr(x)) apply(x);
        });
      } else if (GameRenderer.isLayoutSelectionPbr(mat)) {
        apply(mat);
      }
    });
  }

  private setLayoutSelectedRoot(root: THREE.Object3D | null): void {
    if (this.layoutSelectedRoot === root) return;
    this.clearLayoutSelectionEmissive(this.layoutSelectedRoot);
    this.layoutSelectedRoot = root;
    if (root) this.applyLayoutSelectionEmissive(root);
    this.onArenaLayoutEditUiRefresh?.();
  }

  getArenaLayoutEditSelectionHint(): string {
    if (this.layoutEditFlyMode) {
      const s = this.layoutSelectedRoot;
      const tail = s
        ? "Objeto ainda selecionado (sai do voo com Espaço para o mover com WASD/X/Z/[ ])."
        : "Câmara não entra no JSON — só coliseu, bunkers, atores.";
      return `Voo livre — arrasto esquerdo: olhar · WASD: plano · Q/E: cima/baixo · roda: zoom · Espaço: sair. ${tail}`;
    }
    const s = this.layoutSelectedRoot;
    if (!s) {
      return "Clica num elemento da cena (coliseu, trono, bunkers, figuras). Câmara: botão direito arrasta o plano, roda zoom. Espaço: voo livre (mover/rodar a câmara). Realce violeta como na forja.";
    }
    if (s === this.arenaColiseumMount) {
      return "Coliseu — arrasto no plano, Shift+arrasto altura, WASD/X/Z fino, [ ] escala.";
    }
    if (s === this.throneGroup) {
      return "Trono — mesmos controlos que o coliseu.";
    }
    const uid = s.userData.unitId as string | undefined;
    if (uid === "layout-enemy") {
      const gMesh = this.unitMeshes.get("layout-enemy");
      const pidRaw = gMesh?.userData.layoutEnemyPreviewArchetypeId as
        | string
        | undefined;
      const pid =
        pidRaw && ENEMY_BY_ID[pidRaw] ? pidRaw : "gladinio";
      const nm = ENEMY_BY_ID[pid]?.name ?? pid;
      return `Inimigo: ${nm} — usa a lista abaixo (ou <kbd>,</kbd> / <kbd>.</kbd>); altura Y grava por tipo no JSON.`;
    }
    if (uid?.startsWith("layout-hero-")) {
      return `Herói ${uid} — posição/escala gravam no JSON.`;
    }
    if (uid?.startsWith("layout-")) {
      return `Figura ${uid} — ajuste fino.`;
    }
    for (const root of this.bunkerRoots.values()) {
      if (root !== s) continue;
      const bio = root.userData.layoutBunkerBiome as BiomeId | undefined;
      const preview = root.userData.layoutPreviewTier as BunkerRenderTier | null | undefined;
      const pv =
        preview != null ? `pré-visualização nv. ${preview + 1}` : "nv. jogo";
      return `Bunker (${bio ?? "?"}) — fixo no hex da run. 1–3 modelo; X/Z altura; J/L rodar; [ ] escala; Shift+arrasto: altura (${pv}).`;
    }
    return "Objeto selecionado.";
  }

  isArenaLayoutEnemySelected(): boolean {
    return (
      this.arenaLayoutEditActive &&
      this.layoutSelectedRoot?.userData.unitId === "layout-enemy"
    );
  }

  getArenaLayoutEnemyPreviewArchetypeId(): string {
    const g = this.unitMeshes.get("layout-enemy");
    const pid = g?.userData.layoutEnemyPreviewArchetypeId as string | undefined;
    if (pid && ENEMY_BY_ID[pid]) return pid;
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    const p2 = snap.layoutEnemyEditor?.previewArchetypeId;
    if (p2 && ENEMY_BY_ID[p2]) return p2;
    return "gladinio";
  }

  applyArenaLayoutEnemyPreviewFromUi(archetypeId: string): void {
    if (!this.arenaLayoutEditActive) return;
    if (!ENEMY_BY_ID[archetypeId]) return;
    this.setLayoutEnemyPreviewArchetypeId(archetypeId);
  }

  private setLayoutBunkerPreviewTier(t: BunkerRenderTier): void {
    const sel = this.layoutSelectedRoot;
    if (!sel) return;
    let hit: THREE.Group | null = null;
    for (const r of this.bunkerRoots.values()) {
      if (r === sel) {
        hit = r;
        break;
      }
    }
    if (!hit) return;
    hit.userData.layoutPreviewTier = t;
    const oldV = hit.userData.bunkerVisual as THREE.Group | undefined;
    if (oldV) {
      hit.remove(oldV);
      disposeBunkerVisualRoot(oldV);
    }
    const vis = createBunkerVisualGroup(t);
    hit.add(vis);
    hit.userData.bunkerVisual = vis;
    hit.userData.bunkerVisualTier = t;
    this.applyBunkerMountsPoseFromPrefs();
    this.scheduleArenaLayoutPersist();
    this.clearLayoutSelectionEmissive(hit);
    this.applyLayoutSelectionEmissive(hit);
    this.onArenaLayoutEditUiRefresh?.();
  }

  private beginArenaLayoutSession(canvas: HTMLCanvasElement): void {
    if (this.arenaLayoutEditActive) return;
    this.arenaLayoutEditActive = true;
    this.setLayoutSelectedRoot(null);
    this.layoutEligibleForDragAfterDown = false;
    const legBegin = this.unitMeshes.get("layout-enemy");
    if (legBegin) {
      delete (
        legBegin.userData as {
          layoutEnemyPreviewArchetypeId?: string;
          modelKey?: string;
        }
      ).layoutEnemyPreviewArchetypeId;
      delete (
        legBegin.userData as { layoutEnemyPreviewArchetypeId?: string; modelKey?: string }
      ).modelKey;
    }
    this.layoutEditFlyMode = false;
    this.arenaLayoutCameraPersonalized = this.usePersistentFreeCamera;
    this.editorDragMode = "none";
    this.applyCameraPose();
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    this.layoutEditFrozenFreeCamera = snap.freeCamera
      ? {
          position: [...snap.freeCamera.position] as [number, number, number],
          quaternion: [...snap.freeCamera.quaternion] as [
            number,
            number,
            number,
            number,
          ],
          fov: snap.freeCamera.fov,
        }
      : null;
    if (snap.freeCamera) {
      const fc = snap.freeCamera;
      this.freeCamera.position.set(
        fc.position[0],
        fc.position[1],
        fc.position[2],
      );
      this.freeCamera.quaternion.set(
        fc.quaternion[0],
        fc.quaternion[1],
        fc.quaternion[2],
        fc.quaternion[3],
      );
      this.freeCamera.fov = fc.fov;
    } else {
      this.freeCamera.position.copy(this.camera.position);
      this.freeCamera.quaternion.copy(this.camera.quaternion);
    }
    this.freeCamera.updateProjectionMatrix();
    this.resize(canvas);
    this.initLayoutEditOrbitFromFreeCamera();
    this.scheduleArenaLayoutPersist();
    this.onArenaLayoutEditUiRefresh?.();
  }

  private cycleLayoutEnemyPreview(delta: number): void {
    const uid = this.layoutSelectedRoot?.userData.unitId as string | undefined;
    if (uid !== "layout-enemy") return;
    const g = this.unitMeshes.get("layout-enemy");
    if (!g) return;
    const cat = allEnemyArchetypesSorted();
    if (!cat.length) return;
    let cur = g.userData.layoutEnemyPreviewArchetypeId as string | undefined;
    if (!cur || !ENEMY_BY_ID[cur]) cur = cat[0]!.id;
    let idx = cat.findIndex((e) => e.id === cur);
    if (idx < 0) idx = 0;
    idx = (idx + delta + cat.length) % cat.length;
    this.setLayoutEnemyPreviewArchetypeId(cat[idx]!.id);
  }

  private setLayoutEnemyPreviewArchetypeId(archId: string): void {
    if (!ENEMY_BY_ID[archId]) return;
    const g = this.unitMeshes.get("layout-enemy");
    if (!g) return;
    const py = this.playSurfaceYOffset();
    const q = g.userData.layoutActorAxialQ as number | undefined;
    const r = g.userData.layoutActorAxialR as number | undefined;
    if (q === undefined || r === undefined) return;
    const baseW = axialToWorld(q, r, HEX_SIZE);
    const flyY = Number(g.userData.layoutActorFlyY) || 0;
    const baseY = py + flyY;
    const snap = this.sceneLayoutPrefsSnapshot ?? loadSceneLayoutPrefs();
    const oy = snap.layoutEnemyEditor?.yByArchetype?.[archId] ?? 0;
    g.userData.layoutEnemyPreviewArchetypeId = archId;
    delete (g.userData as { modelKey?: string }).modelKey;
    g.position.set(baseW.x, baseY + oy, baseW.z);
    this.scheduleArenaLayoutPersist();
    this.clearLayoutSelectionEmissive(g);
    this.applyLayoutSelectionEmissive(g);
    this.onArenaLayoutEditUiRefresh?.();
    this.onLayoutEnemyMeshSyncNeeded?.();
  }

  private endArenaLayoutEditSession(): void {
    if (!this.arenaLayoutEditActive) return;
    this.editorDragMode = "none";
    this.layoutEligibleForDragAfterDown = false;
    this.setLayoutSelectedRoot(null);
    for (const c of [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyX",
      "KeyZ",
      "KeyJ",
      "KeyL",
      "KeyQ",
      "KeyE",
      "BracketLeft",
      "BracketRight",
      "NumpadAdd",
      "NumpadSubtract",
    ]) {
      this.keysDown.delete(c);
    }
    if (this.arenaLayoutPersistTimer !== null) {
      clearTimeout(this.arenaLayoutPersistTimer);
      this.arenaLayoutPersistTimer = null;
    }
    const p = this.collectSceneLayoutPrefs();
    saveSceneLayoutPrefs(p);
    this.arenaLayoutEditActive = false;
    this.layoutEditFlyMode = false;
    this.layoutEditFrozenFreeCamera = null;
    this.applySceneLayoutPrefs(p);
    this.onArenaLayoutSessionEnd?.();
  }

  private scheduleArenaLayoutPersist(): void {
    if (this.arenaLayoutPersistTimer !== null) {
      clearTimeout(this.arenaLayoutPersistTimer);
    }
    this.arenaLayoutPersistTimer = window.setTimeout(() => {
      this.arenaLayoutPersistTimer = null;
      if (!this.arenaLayoutEditActive) return;
      const p = this.collectSceneLayoutPrefs();
      saveSceneLayoutPrefs(p);
      this.applySceneLayoutPrefs(p);
    }, 320);
  }

  private updateArenaLayoutEditSession(dt: number): void {
    if (!this.arenaLayoutEditActive) return;
    if (this.layoutEditFlyMode) {
      this.applyLayoutEditFlyCameraMove(dt);
      return;
    }
    if (!this.layoutSelectedRoot) return;
    const sel = this.layoutSelectedRoot;
    const sp = 17 * dt;
    const bunkerMount = sel.userData?.layoutBunkerBiome != null;
    const ix =
      (this.keysDown.has("KeyD") ? 1 : 0) -
      (this.keysDown.has("KeyA") ? 1 : 0);
    const iz =
      (this.keysDown.has("KeyS") ? 1 : 0) -
      (this.keysDown.has("KeyW") ? 1 : 0);
    const iy =
      (this.keysDown.has("KeyX") ? 1 : 0) -
      (this.keysDown.has("KeyZ") ? 1 : 0);
    let moved = false;
    if (!bunkerMount && (ix !== 0 || iz !== 0)) {
      this.editorScratchVec3.set(ix * sp, 0, iz * sp);
      this.applyWorldDeltaToLayoutMountXZ(sel, this.editorScratchVec3);
      moved = true;
    }
    if (iy !== 0) {
      sel.position.y += iy * sp;
      moved = true;
    }
    if (bunkerMount) {
      const yaw =
        1.85 *
        dt *
        ((this.keysDown.has("KeyL") ? 1 : 0) -
          (this.keysDown.has("KeyJ") ? 1 : 0));
      if (yaw !== 0) {
        sel.rotation.y += yaw;
        moved = true;
      }
    }
    let scaled = false;
    const sUp = 0.88 * dt;
    const sDn = 0.72 * dt;
    if (this.keysDown.has("BracketRight") || this.keysDown.has("NumpadAdd")) {
      sel.scale.multiplyScalar(1 + sUp);
      scaled = true;
    }
    if (
      this.keysDown.has("BracketLeft") ||
      this.keysDown.has("NumpadSubtract")
    ) {
      sel.scale.multiplyScalar(
        Math.max(0.02 / Math.max(sel.scale.x, 1e-6), 1 - sDn),
      );
      scaled = true;
    }
    if (scaled) {
      const u = THREE.MathUtils.clamp(sel.scale.x, 0.02, 48);
      sel.scale.setScalar(u);
      moved = true;
    }
    if (moved) this.scheduleArenaLayoutPersist();
  }

  private attachArenaLayoutControls(canvas: HTMLCanvasElement): void {
    const layoutKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyX",
      "KeyZ",
      "KeyJ",
      "KeyL",
      "BracketLeft",
      "BracketRight",
      "NumpadAdd",
      "NumpadSubtract",
    ]);
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (this.arenaLayoutEditActive && e.code === "Escape" && !e.repeat) {
        e.preventDefault();
        this.endArenaLayoutEditSession();
        return;
      }
      if (!this.arenaLayoutEditActive) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          this.layoutEditFlyMode = !this.layoutEditFlyMode;
          this.editorDragMode = "none";
          this.layoutEligibleForDragAfterDown = false;
          if (!this.layoutEditFlyMode) {
            this.initLayoutEditOrbitFromFreeCamera();
          }
          this.onArenaLayoutEditUiRefresh?.();
        }
        return;
      }
      if (this.layoutEditFlyMode && (e.code === "KeyQ" || e.code === "KeyE")) {
        e.preventDefault();
        this.keysDown.add(e.code);
        return;
      }
      if (!e.repeat) {
        const selUid = this.layoutSelectedRoot?.userData.unitId as
          | string
          | undefined;
        if (e.code === "Comma" && selUid === "layout-enemy") {
          e.preventDefault();
          this.cycleLayoutEnemyPreview(-1);
          return;
        }
        if (e.code === "Period" && selUid === "layout-enemy") {
          e.preventDefault();
          this.cycleLayoutEnemyPreview(1);
          return;
        }
        if (e.code === "Digit1") {
          e.preventDefault();
          this.setLayoutBunkerPreviewTier(0);
          return;
        }
        if (e.code === "Digit2") {
          e.preventDefault();
          this.setLayoutBunkerPreviewTier(1);
          return;
        }
        if (e.code === "Digit3") {
          e.preventDefault();
          this.setLayoutBunkerPreviewTier(2);
          return;
        }
      }
      if (layoutKeys.has(e.code)) {
        e.preventDefault();
        this.keysDown.add(e.code);
      }
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (!this.arenaLayoutEditActive) return;
      if (layoutKeys.has(e.code)) this.keysDown.delete(e.code);
      if (e.code === "KeyQ" || e.code === "KeyE") this.keysDown.delete(e.code);
    });

    const onDown = (e: PointerEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!this.arenaLayoutEditActive) return;

      e.preventDefault();
      e.stopPropagation();

      this.editorLastClientX = e.clientX;
      this.editorLastClientY = e.clientY;
      const ndc = this.clientToNdcForEditor(canvas, e.clientX, e.clientY);
      const pickCam = this.getRenderCamera();

      if (e.button === 2) {
        this.editorDragMode = "pan";
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }

      if (e.button !== 0) {
        this.editorDragMode = "none";
        this.layoutEligibleForDragAfterDown = false;
        return;
      }

      this.layoutPointerDownX = e.clientX;
      this.layoutPointerDownY = e.clientY;
      const pickRoot = this.pickLayoutSelectableRoot(pickCam, ndc.x, ndc.y);
      if (!pickRoot) {
        this.setLayoutSelectedRoot(null);
        this.layoutEligibleForDragAfterDown = false;
        if (this.layoutEditFlyMode) {
          this.editorDragMode = "fly_look";
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        } else {
          this.editorDragMode = "none";
        }
        return;
      }
      this.setLayoutSelectedRoot(pickRoot);
      this.layoutEligibleForDragAfterDown = this.rayHitsLayoutRoot(
        pickCam,
        ndc.x,
        ndc.y,
        pickRoot,
      );
      this.editorDragMode = "none";
    };

    const onMove = (e: PointerEvent) => {
      if (!this.arenaLayoutEditActive) return;
      const ndc = this.clientToNdcForEditor(canvas, e.clientX, e.clientY);
      const pickCam = this.getRenderCamera();
      if (
        this.layoutEligibleForDragAfterDown &&
        this.layoutSelectedRoot &&
        (e.buttons & 1) !== 0 &&
        this.editorDragMode === "none"
      ) {
        const dpx = e.clientX - this.layoutPointerDownX;
        const dpy = e.clientY - this.layoutPointerDownY;
        if (
          Math.hypot(dpx, dpy) >= this.layoutDragThresholdPx &&
          this.rayHitsLayoutRoot(
            pickCam,
            ndc.x,
            ndc.y,
            this.layoutSelectedRoot,
          )
        ) {
          const selRoot = this.layoutSelectedRoot;
          const selIsBunker = selRoot?.userData?.layoutBunkerBiome != null;
          if (e.shiftKey) {
            this.editorDragMode = "coliseum_y";
          } else if (
            !selIsBunker &&
            this.intersectGroundWithCamera(
              pickCam,
              ndc.x,
              ndc.y,
              0,
              this.editorLastGround,
            )
          ) {
            this.editorDragMode = "coliseum_xz";
          }
          this.layoutEligibleForDragAfterDown = false;
          this.editorLastClientX = e.clientX;
          this.editorLastClientY = e.clientY;
          if (this.editorDragMode !== "none") {
            try {
              canvas.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
        }
      }
      if (this.editorDragMode === "none") return;
      e.preventDefault();
      e.stopPropagation();
      const prevX = this.editorLastClientX;
      const prevY = this.editorLastClientY;
      const dy = e.clientY - prevY;
      this.editorLastClientX = e.clientX;
      this.editorLastClientY = e.clientY;
      switch (this.editorDragMode) {
        case "fly_look": {
          this.applyLayoutEditFlyLookDelta(
            e.clientX - prevX,
            e.clientY - prevY,
          );
          break;
        }
        case "pan": {
          this.applyLayoutEditCameraPanDeltaFromClientPixels(
            canvas,
            e.clientX,
            e.clientY,
            prevX,
            prevY,
          );
          break;
        }
        case "coliseum_xz": {
          const hit = this.editorScratchVec3;
          const sel = this.layoutSelectedRoot;
          if (
            sel &&
            this.intersectGroundWithCamera(
              pickCam,
              ndc.x,
              ndc.y,
              0,
              hit,
            )
          ) {
            const dw = hit.clone().sub(this.editorLastGround);
            this.editorLastGround.copy(hit);
            this.applyWorldDeltaToLayoutMountXZ(sel, dw);
            this.scheduleArenaLayoutPersist();
          }
          break;
        }
        case "coliseum_y": {
          const sel = this.layoutSelectedRoot;
          if (sel) {
            sel.position.y -= dy * 0.065;
            this.scheduleArenaLayoutPersist();
          }
          break;
        }
        default:
          break;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!this.arenaLayoutEditActive) return;
      if (e.button !== 0 && e.button !== 2) return;
      this.layoutEligibleForDragAfterDown = false;
      this.editorDragMode = "none";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!this.arenaLayoutEditActive) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.layoutEditFlyMode) {
        this.dollyLayoutEditFlyAlongWheel(this.normalizeWheelDeltaY(e));
        return;
      }
      const factor = Math.exp(-e.deltaY * 0.0018);
      this.dollyLayoutEditFreeCamera(factor);
    };

    canvas.addEventListener("pointerdown", onDown, true);
    canvas.addEventListener("pointermove", onMove, true);
    canvas.addEventListener("pointerup", onUp, true);
    canvas.addEventListener("pointercancel", onUp, true);
    canvas.addEventListener("wheel", onWheel, { passive: false, capture: true });
    canvas.addEventListener(
      "contextmenu",
      (e: MouseEvent) => {
        if (this.arenaLayoutEditActive) e.preventDefault();
      },
      true,
    );
  }
}
