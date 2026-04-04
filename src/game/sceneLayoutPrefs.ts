import bundledDefaults from "./sceneLayoutDefaults.json";
import { COMBAT_BIOMES } from "./data/biomes";
import { ENEMY_BY_ID } from "./data/enemies";
import type { BiomeId } from "./types";

const LS_KEY = "gladius-scene-layout-v1";

export type BunkerTierKey = "0" | "1" | "2";

/** Offset e escala do bunker em espaço local da arena (relativo ao hex nominal). */
export type BunkerLayoutEntry = {
  x: number;
  z: number;
  scale: number;
  /**
   * Hex lógico do bunker (combate / `bunkerAtHex`). Gravado ao mover o bunker no ajuste de cena;
   * mantém skills e ocupante alinhados à malha quando o modelo está deslocado de `x,z`.
   */
  hexQ?: number;
  hexR?: number;
  /**
   * Altura do mount por variante de modelo (nv1–3). Se ausente, usa `y` legado para todos.
   */
  yByTier?: Partial<Record<BunkerTierKey, number>>;
  /** Legado: altura única; migrado para yByTier igual nos três níveis. */
  y?: number;
};

/** Ajuste fino de atores só para o editor / encenação (heróis sintéticos, trono). */
export type LayoutActorPose = {
  x: number;
  y: number;
  z: number;
  scale: number;
};

export type LayoutActorEntry = LayoutActorPose;

/**
 * Editor de cena: um único placeholder `layout-enemy`; troca-se o modelo do compendium
 * e grava-se altura Y por `archetypeId`.
 */
export type LayoutEnemyEditorPrefs = {
  previewArchetypeId: string;
  yByArchetype: Partial<Record<string, number>>;
};

export type SceneLayoutPrefs = {
  /** Deslocamento extra do grupo que contém o GLB do coliseu (mundo → local do arenaRoot). */
  coliseum: { x: number; y: number; z: number };
  /** Escala uniforme do grupo do coliseu (editor de cena). */
  coliseumScale: number;
  /** Por bioma de combate: ajuste fino da mesh do bunker (editor de cena). */
  bunkerLayout: Partial<Record<BiomeId, BunkerLayoutEntry>>;
  /** Trono + heróis sintéticos (`layout-hero-*`) — pose completa. */
  layoutActors?: Partial<Record<string, LayoutActorEntry>>;
  /** Inimigo de referência único no editor: modelo do compendium + Y por id. */
  layoutEnemyEditor?: LayoutEnemyEditorPrefs;
  /** Câmara livre (perspetiva); null = usar câmara ortográfica de combate. */
  freeCamera: null | {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    fov: number;
  };
};

const SAFE_FALLBACK: SceneLayoutPrefs = {
  coliseum: { x: 0, y: 0, z: 0 },
  coliseumScale: 1,
  bunkerLayout: {},
  layoutActors: {},
  layoutEnemyEditor: {
    previewArchetypeId: "gladinio",
    yByArchetype: {},
  },
  freeCamera: null,
};

/** Preenchido em `initSceneLayoutPrefsFromDeploy()` (fetch + bundle); localStorage continua a mandar por origem. */
let prefsCache: SceneLayoutPrefs | null = null;

function clonePrefs(p: SceneLayoutPrefs): SceneLayoutPrefs {
  const bl: Partial<Record<BiomeId, BunkerLayoutEntry>> = {};
  for (const [id, e] of Object.entries(p.bunkerLayout ?? {})) {
    if (!e || typeof e !== "object") continue;
    const ybt = e.yByTier;
    bl[id as BiomeId] = {
      x: e.x,
      z: e.z,
      scale: e.scale,
      hexQ:
        typeof e.hexQ === "number" && Number.isFinite(e.hexQ)
          ? e.hexQ
          : undefined,
      hexR:
        typeof e.hexR === "number" && Number.isFinite(e.hexR)
          ? e.hexR
          : undefined,
      y: typeof e.y === "number" && Number.isFinite(e.y) ? e.y : undefined,
      yByTier:
        ybt && typeof ybt === "object"
          ? {
              "0": ybt["0"],
              "1": ybt["1"],
              "2": ybt["2"],
            }
          : undefined,
    };
  }
  const la: Partial<Record<string, LayoutActorEntry>> = {};
  for (const [k, a] of Object.entries(p.layoutActors ?? {})) {
    if (!a || typeof a !== "object") continue;
    const pose = a as LayoutActorPose;
    la[k] = {
      x: pose.x,
      y: pose.y,
      z: pose.z,
      scale: pose.scale,
    };
  }
  const lee = p.layoutEnemyEditor;
  const yba: Partial<Record<string, number>> = {
    ...(lee?.yByArchetype ?? {}),
  };
  return {
    coliseum: { ...p.coliseum },
    coliseumScale: p.coliseumScale,
    bunkerLayout: bl,
    layoutActors: la,
    layoutEnemyEditor: lee
      ? {
          previewArchetypeId:
            typeof lee.previewArchetypeId === "string" &&
            ENEMY_BY_ID[lee.previewArchetypeId]
              ? lee.previewArchetypeId
              : "gladinio",
          yByArchetype: yba,
        }
      : { previewArchetypeId: "gladinio", yByArchetype: {} },
    freeCamera: p.freeCamera
      ? {
          position: [...p.freeCamera.position] as [number, number, number],
          quaternion: [...p.freeCamera.quaternion] as [
            number,
            number,
            number,
            number,
          ],
          fov: p.freeCamera.fov,
        }
      : null,
  };
}

/** Cópia profunda para o renderer guardar snapshot. */
export function cloneSceneLayoutPrefs(p: SceneLayoutPrefs): SceneLayoutPrefs {
  return clonePrefs(p);
}

function normalizeTierY(
  raw: unknown,
): Partial<Record<BunkerTierKey, number>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<BunkerTierKey, number>> = {};
  for (const k of ["0", "1", "2"] as const) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeBunkerLayoutEntry(
  e: unknown,
): BunkerLayoutEntry | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  const x = typeof o.x === "number" && Number.isFinite(o.x) ? o.x : 0;
  const z = typeof o.z === "number" && Number.isFinite(o.z) ? o.z : 0;
  const scale =
    typeof o.scale === "number" && Number.isFinite(o.scale)
      ? Math.min(48, Math.max(0.02, o.scale))
      : 1;
  let yByTier = normalizeTierY(o.yByTier);
  const legacyY =
    typeof o.y === "number" && Number.isFinite(o.y) ? o.y : undefined;
  if (!yByTier && legacyY !== undefined) {
    yByTier = { "0": legacyY, "1": legacyY, "2": legacyY };
  }
  const hexQ =
    typeof o.hexQ === "number" && Number.isFinite(o.hexQ)
      ? Math.round(o.hexQ)
      : undefined;
  const hexR =
    typeof o.hexR === "number" && Number.isFinite(o.hexR)
      ? Math.round(o.hexR)
      : undefined;
  const entry: BunkerLayoutEntry = { x, z, scale, yByTier, hexQ, hexR };
  if (legacyY !== undefined && !o.yByTier) entry.y = legacyY;
  return entry;
}

/** Chaves antigas (três inimigos na cena) → id de arquétipo no compendium. */
const LEGACY_LAYOUT_ENEMY_ACTOR_KEY: Record<string, string> = {
  "layout-enemy-gladinio": "gladinio",
  "layout-enemy-escravo": "escravo",
  "layout-enemy-leao": "leao_selvagem",
};

function normalizeLayoutActors(
  raw: unknown,
): Partial<Record<string, LayoutActorEntry>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<string, LayoutActorEntry>> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!v || typeof v !== "object") continue;
    if (LEGACY_LAYOUT_ENEMY_ACTOR_KEY[k]) continue;
    const a = v as Record<string, unknown>;
    const x = typeof a.x === "number" && Number.isFinite(a.x) ? a.x : 0;
    const y = typeof a.y === "number" && Number.isFinite(a.y) ? a.y : 0;
    const z = typeof a.z === "number" && Number.isFinite(a.z) ? a.z : 0;
    const scale =
      typeof a.scale === "number" && Number.isFinite(a.scale)
        ? Math.min(48, Math.max(0.02, a.scale))
        : 1;
    out[k] = { x, y, z, scale };
  }
  return out;
}

function migrateLegacyLayoutEnemyActorYs(
  raw: unknown,
): Partial<Record<string, number>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const yMerged: Partial<Record<string, number>> = {};
  for (const [k, arch] of Object.entries(LEGACY_LAYOUT_ENEMY_ACTOR_KEY)) {
    const v = o[k];
    if (!v || typeof v !== "object") continue;
    const a = v as Record<string, unknown>;
    const y = typeof a.y === "number" && Number.isFinite(a.y) ? a.y : 0;
    yMerged[arch] = y;
  }
  return yMerged;
}

function normalizeLayoutEnemyEditor(
  raw: unknown,
  migratedYs: Partial<Record<string, number>>,
): LayoutEnemyEditorPrefs {
  let previewArchetypeId = "gladinio";
  const yByArchetype: Partial<Record<string, number>> = { ...migratedYs };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const pid = o.previewArchetypeId;
    if (typeof pid === "string" && ENEMY_BY_ID[pid]) {
      previewArchetypeId = pid;
    }
    const yba = o.yByArchetype;
    if (yba && typeof yba === "object") {
      for (const [k, v] of Object.entries(yba)) {
        if (typeof v === "number" && Number.isFinite(v) && ENEMY_BY_ID[k]) {
          yByArchetype[k] = v;
        }
      }
    }
  }
  return { previewArchetypeId, yByArchetype };
}

function normalizeBunkerLayout(
  raw: unknown,
): Partial<Record<BiomeId, BunkerLayoutEntry>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<BiomeId, BunkerLayoutEntry>> = {};
  for (const id of COMBAT_BIOMES) {
    const e = normalizeBunkerLayoutEntry(o[id]);
    if (e) out[id] = e;
  }
  return out;
}

function normalizeSceneLayoutPrefs(o: unknown): SceneLayoutPrefs {
  if (!o || typeof o !== "object") {
    return clonePrefs(SAFE_FALLBACK);
  }
  try {
    const raw = o as Partial<SceneLayoutPrefs>;
    const col = raw.coliseum;
    const cx =
      col && typeof col.x === "number" && Number.isFinite(col.x) ? col.x : 0;
    const cy =
      col && typeof col.y === "number" && Number.isFinite(col.y) ? col.y : 0;
    const cz =
      col && typeof col.z === "number" && Number.isFinite(col.z) ? col.z : 0;
    const cScale =
      typeof raw.coliseumScale === "number" &&
      Number.isFinite(raw.coliseumScale) &&
      raw.coliseumScale > 0
        ? Math.min(48, Math.max(0.02, raw.coliseumScale))
        : 1;
    let freeCamera: SceneLayoutPrefs["freeCamera"] = null;
    const fc = raw.freeCamera;
    const posOk =
      fc &&
      Array.isArray(fc.position) &&
      fc.position.length === 3 &&
      fc.position.every((n) => typeof n === "number" && Number.isFinite(n));
    const quatOk =
      fc &&
      Array.isArray(fc.quaternion) &&
      fc.quaternion.length === 4 &&
      fc.quaternion.every((n) => typeof n === "number" && Number.isFinite(n));
    if (posOk && quatOk) {
      const fov =
        typeof fc.fov === "number" && Number.isFinite(fc.fov) ? fc.fov : 48;
      freeCamera = {
        position: [fc.position[0]!, fc.position[1]!, fc.position[2]!],
        quaternion: [
          fc.quaternion[0]!,
          fc.quaternion[1]!,
          fc.quaternion[2]!,
          fc.quaternion[3]!,
        ],
        fov,
      };
    }
    const bunkerLayout = normalizeBunkerLayout(raw.bunkerLayout);
    const migratedEnemyY = migrateLegacyLayoutEnemyActorYs(raw.layoutActors);
    const layoutActors = normalizeLayoutActors(raw.layoutActors);
    const layoutEnemyEditor = normalizeLayoutEnemyEditor(
      raw.layoutEnemyEditor,
      migratedEnemyY,
    );
    return {
      coliseum: { x: cx, y: cy, z: cz },
      coliseumScale: cScale,
      bunkerLayout,
      layoutActors,
      layoutEnemyEditor,
      freeCamera,
    };
  } catch {
    return clonePrefs(SAFE_FALLBACK);
  }
}

function prefsFromBundledFile(): SceneLayoutPrefs {
  return normalizeSceneLayoutPrefs(bundledDefaults);
}

function parsePrefsJsonString(raw: string): SceneLayoutPrefs {
  try {
    return normalizeSceneLayoutPrefs(JSON.parse(raw));
  } catch {
    return prefsFromBundledFile();
  }
}

/** URL do `public/scene-layout-default.json` (respeita `import.meta.env.BASE_URL` no GitHub Pages). */
function sceneLayoutDefaultJsonUrl(): string {
  const base = import.meta.env.BASE_URL;
  if (base.startsWith("/")) {
    const path = base.endsWith("/") ? base : `${base}/`;
    return `${window.location.origin}${path}scene-layout-default.json`;
  }
  return new URL("scene-layout-default.json", window.location.href).href;
}

/**
 * Chamar uma vez antes de montar a cena 3D.
 * Ordem: localStorage desta origem → `scene-layout-default.json` (público) → `sceneLayoutDefaults.json` (bundle).
 *
 * Nota: [Dev] Ajustar cena grava só em `localStorage` do `localhost`. O GitHub Pages é outra origem;
 * para ver os mesmos valores em produção, copia o valor de `gladius-scene-layout-v1` para
 * `public/scene-layout-default.json` (e/ou `src/game/sceneLayoutDefaults.json`) e faz deploy.
 */
export async function initSceneLayoutPrefsFromDeploy(): Promise<void> {
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem(LS_KEY);
    if (ls != null && ls.trim() !== "") {
      prefsCache = parsePrefsJsonString(ls);
      return;
    }
  }
  if (typeof fetch !== "undefined" && typeof window !== "undefined") {
    try {
      const r = await fetch(sceneLayoutDefaultJsonUrl(), { cache: "no-store" });
      if (r.ok) {
        prefsCache = parsePrefsJsonString(await r.text());
        return;
      }
    } catch {
      /* rede / CORS */
    }
  }
  prefsCache = prefsFromBundledFile();
}

export function loadSceneLayoutPrefs(): SceneLayoutPrefs {
  if (prefsCache) return clonePrefs(prefsCache);
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem(LS_KEY);
    if (ls != null && ls.trim() !== "") {
      return parsePrefsJsonString(ls);
    }
  }
  return prefsFromBundledFile();
}

export function saveSceneLayoutPrefs(p: SceneLayoutPrefs): void {
  prefsCache = clonePrefs(p);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Altura do mount do bunker (relativa ao plano de jogo) para o tier de modelo 0–2. */
export function bunkerMountYOffset(
  off: BunkerLayoutEntry | undefined,
  tier: number,
): number {
  if (!off) return 0;
  const ti = Math.min(2, Math.max(0, Math.round(tier))) as 0 | 1 | 2;
  const k = String(ti) as BunkerTierKey;
  const yb = off.yByTier;
  if (yb?.[k] !== undefined && Number.isFinite(yb[k]!)) return yb[k]!;
  if (typeof off.y === "number" && Number.isFinite(off.y)) return off.y;
  return 0;
}
