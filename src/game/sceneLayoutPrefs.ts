import bundledDefaults from "./sceneLayoutDefaults.json";
import { COMBAT_BIOMES } from "./data/biomes";
import type { BiomeId } from "./types";

const LS_KEY = "gladius-scene-layout-v1";

/** Offset e escala do bunker em espaço local da arena (relativo ao hex nominal). */
export type BunkerLayoutEntry = {
  x: number;
  y: number;
  z: number;
  scale: number;
};

export type SceneLayoutPrefs = {
  /** Deslocamento extra do grupo que contém o GLB do coliseu (mundo → local do arenaRoot). */
  coliseum: { x: number; y: number; z: number };
  /** Escala uniforme do grupo do coliseu (editor de cena). */
  coliseumScale: number;
  /** Por bioma de combate: ajuste fino da mesh do bunker (editor de cena). */
  bunkerLayout: Partial<Record<BiomeId, BunkerLayoutEntry>>;
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
  freeCamera: null,
};

/** Preenchido em `initSceneLayoutPrefsFromDeploy()` (fetch + bundle); localStorage continua a mandar por origem. */
let prefsCache: SceneLayoutPrefs | null = null;

function clonePrefs(p: SceneLayoutPrefs): SceneLayoutPrefs {
  const bl: Partial<Record<BiomeId, BunkerLayoutEntry>> = {};
  for (const [id, e] of Object.entries(p.bunkerLayout ?? {})) {
    if (!e || typeof e !== "object") continue;
    bl[id as BiomeId] = {
      x: e.x,
      y: e.y,
      z: e.z,
      scale: e.scale,
    };
  }
  return {
    coliseum: { ...p.coliseum },
    coliseumScale: p.coliseumScale,
    bunkerLayout: bl,
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

function normalizeBunkerLayoutEntry(
  e: unknown,
): BunkerLayoutEntry | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  const x = typeof o.x === "number" && Number.isFinite(o.x) ? o.x : 0;
  const y = typeof o.y === "number" && Number.isFinite(o.y) ? o.y : 0;
  const z = typeof o.z === "number" && Number.isFinite(o.z) ? o.z : 0;
  const scale =
    typeof o.scale === "number" && Number.isFinite(o.scale)
      ? Math.min(48, Math.max(0.02, o.scale))
      : 1;
  return { x, y, z, scale };
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
    if (
      fc &&
      Array.isArray(fc.position) &&
      fc.position.length === 3 &&
      Array.isArray(fc.quaternion) &&
      fc.quaternion.length === 4
    ) {
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
    return {
      coliseum: { x: cx, y: cy, z: cz },
      coliseumScale: cScale,
      bunkerLayout,
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
