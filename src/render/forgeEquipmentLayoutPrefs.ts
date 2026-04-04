import type { HeroClassId } from "../game/types";
import type { HeroForgeAttachConfig } from "./heroGlbShared";
import bundledDefaults from "./forgeEquipmentLayoutDefaults.json";

const LS_KEY = "gladius-forge-equipment-layout-v1";

/** Preenchido em `initForgeEquipmentLayoutPrefsFromDeploy()`; localStorage continua a mandar por origem. */
let prefsCache: ForgeEquipmentLayoutPrefs | null = null;

export type ForgeEquipmentLayoutPrefs = {
  /** Posições/rotações/escala guardadas por classe (substituem o cálculo automático). */
  byClass: Partial<Record<HeroClassId, HeroForgeAttachConfig>>;
};

const EMPTY: ForgeEquipmentLayoutPrefs = { byClass: {} };

function clonePrefs(p: ForgeEquipmentLayoutPrefs): ForgeEquipmentLayoutPrefs {
  const byClass: Partial<Record<HeroClassId, HeroForgeAttachConfig>> = {};
  for (const [k, v] of Object.entries(p.byClass)) {
    if (!isHeroClassId(k) || !v) continue;
    byClass[k] = cloneForgeAttachConfig(v);
  }
  return { byClass };
}

function isHeroClassId(s: string): s is HeroClassId {
  return s === "gladiador" || s === "sacerdotisa" || s === "pistoleiro";
}

function sanitizePieceHelmet(
  o: unknown,
  fb: HeroForgeAttachConfig["helmet"],
): HeroForgeAttachConfig["helmet"] {
  if (!o || typeof o !== "object") return { ...fb };
  const x = o as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d;
  return {
    y: num(x.y, fb.y),
    scale: Math.min(2.5, Math.max(0.05, num(x.scale, fb.scale))),
    x: x.x !== undefined ? num(x.x, fb.x ?? 0) : fb.x,
    z: x.z !== undefined ? num(x.z, fb.z ?? 0) : fb.z,
    rotX: x.rotX !== undefined ? num(x.rotX, 0) : fb.rotX,
    rotY: x.rotY !== undefined ? num(x.rotY, 0) : fb.rotY,
    rotZ: x.rotZ !== undefined ? num(x.rotZ, 0) : fb.rotZ,
  };
}

function sanitizePieceCape(
  o: unknown,
  fb: HeroForgeAttachConfig["cape"],
): HeroForgeAttachConfig["cape"] {
  if (!o || typeof o !== "object") return { ...fb };
  const x = o as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d;
  return {
    x: num(x.x, fb.x),
    y: num(x.y, fb.y),
    z: num(x.z, fb.z),
    rotX: num(x.rotX, fb.rotX),
    scale: Math.min(2.5, Math.max(0.05, num(x.scale, fb.scale))),
    rotY: x.rotY !== undefined ? num(x.rotY, 0) : fb.rotY,
    rotZ: x.rotZ !== undefined ? num(x.rotZ, 0) : fb.rotZ,
  };
}

function sanitizePieceManoplas(
  o: unknown,
  fb: HeroForgeAttachConfig["manoplas"],
): HeroForgeAttachConfig["manoplas"] {
  if (!o || typeof o !== "object") return { ...fb };
  const x = o as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d;
  return {
    y: num(x.y, fb.y),
    z: num(x.z, fb.z),
    scale: Math.min(2.5, Math.max(0.05, num(x.scale, fb.scale))),
    x: x.x !== undefined ? num(x.x, fb.x ?? 0) : fb.x,
    rotX: x.rotX !== undefined ? num(x.rotX, 0) : fb.rotX,
    rotY: x.rotY !== undefined ? num(x.rotY, 0) : fb.rotY,
    rotZ: x.rotZ !== undefined ? num(x.rotZ, 0) : fb.rotZ,
  };
}

function sanitizeHeroAttach(
  o: unknown,
  fallback: HeroForgeAttachConfig,
): HeroForgeAttachConfig {
  if (!o || typeof o !== "object") return cloneForgeAttachConfig(fallback);
  const x = o as Record<string, unknown>;
  return {
    helmet: sanitizePieceHelmet(x.helmet, fallback.helmet),
    cape: sanitizePieceCape(x.cape, fallback.cape),
    manoplas: sanitizePieceManoplas(x.manoplas, fallback.manoplas),
  };
}

export function cloneForgeAttachConfig(c: HeroForgeAttachConfig): HeroForgeAttachConfig {
  return JSON.parse(JSON.stringify(c)) as HeroForgeAttachConfig;
}

function normalizePrefsFromParsed(p: unknown): ForgeEquipmentLayoutPrefs {
  if (!p || typeof p !== "object") return { byClass: {} };
  const o = p as Partial<ForgeEquipmentLayoutPrefs>;
  const byClass: Partial<Record<HeroClassId, HeroForgeAttachConfig>> = {};
  if (o.byClass && typeof o.byClass === "object") {
    for (const k of Object.keys(o.byClass)) {
      if (!isHeroClassId(k)) continue;
      const v = (o.byClass as Record<string, unknown>)[k];
      if (v && typeof v === "object") {
        byClass[k] = v as HeroForgeAttachConfig;
      }
    }
  }
  return { byClass };
}

function parsePrefsJsonString(raw: string): ForgeEquipmentLayoutPrefs {
  try {
    return normalizePrefsFromParsed(JSON.parse(raw));
  } catch {
    return prefsFromBundledFile();
  }
}

function prefsFromBundledFile(): ForgeEquipmentLayoutPrefs {
  return normalizePrefsFromParsed(bundledDefaults);
}

/** URL de `public/forge-equipment-layout-default.json` (respeita `import.meta.env.BASE_URL`). */
function forgeEquipmentLayoutDefaultJsonUrl(): string {
  const base = import.meta.env.BASE_URL;
  if (base.startsWith("/")) {
    const path = base.endsWith("/") ? base : `${base}/`;
    return `${window.location.origin}${path}forge-equipment-layout-default.json`;
  }
  return new URL("forge-equipment-layout-default.json", window.location.href).href;
}

/**
 * Chamar uma vez antes de usar anexos de equipamento forjado em 3D.
 * Ordem: localStorage desta origem → `forge-equipment-layout-default.json` (público) → bundle.
 *
 * [Dev] Ajustar equipamento grava só em `localStorage` do localhost; GitHub Pages é outra origem.
 * Para os mesmos valores em produção, copia `gladius-forge-equipment-layout-v1` para
 * `public/forge-equipment-layout-default.json` (e/ou `src/render/forgeEquipmentLayoutDefaults.json`).
 */
export async function initForgeEquipmentLayoutPrefsFromDeploy(): Promise<void> {
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem(LS_KEY);
    if (ls != null && ls.trim() !== "") {
      prefsCache = parsePrefsJsonString(ls);
      return;
    }
  }
  if (typeof fetch !== "undefined" && typeof window !== "undefined") {
    try {
      const r = await fetch(forgeEquipmentLayoutDefaultJsonUrl(), { cache: "no-store" });
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

export function loadForgeEquipmentLayoutPrefs(): ForgeEquipmentLayoutPrefs {
  if (prefsCache) return clonePrefs(prefsCache);
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem(LS_KEY);
    if (ls != null && ls.trim() !== "") {
      return parsePrefsJsonString(ls);
    }
  }
  return prefsFromBundledFile();
}

export function saveForgeEquipmentLayoutPrefs(p: ForgeEquipmentLayoutPrefs): void {
  prefsCache = clonePrefs(p);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/**
 * Devolve a config guardada para a classe, já sanitizada contra um fallback automático.
 */
export function getSanitizedForgeEquipmentAttachForClass(
  heroClass: HeroClassId,
  autoFallback: HeroForgeAttachConfig,
): HeroForgeAttachConfig | null {
  const raw = loadForgeEquipmentLayoutPrefs().byClass[heroClass];
  if (!raw) return null;
  return sanitizeHeroAttach(raw, autoFallback);
}

export function setForgeEquipmentAttachForClass(
  heroClass: HeroClassId,
  attach: HeroForgeAttachConfig,
): void {
  const p = loadForgeEquipmentLayoutPrefs();
  p.byClass[heroClass] = cloneForgeAttachConfig(attach);
  saveForgeEquipmentLayoutPrefs(p);
}

export function clearForgeEquipmentAttachForClass(heroClass: HeroClassId): void {
  const p = loadForgeEquipmentLayoutPrefs();
  delete p.byClass[heroClass];
  saveForgeEquipmentLayoutPrefs(p);
}

export function clearAllForgeEquipmentLayoutPrefs(): void {
  saveForgeEquipmentLayoutPrefs(EMPTY);
}
