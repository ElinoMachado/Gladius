import type { HeroClassId } from "../game/types";
import type { HeroForgeAttachConfig } from "./heroGlbShared";

const LS_KEY = "gladius-forge-equipment-layout-v1";

export type ForgeEquipmentLayoutPrefs = {
  /** Posições/rotações/escala guardadas por classe (substituem o cálculo automático). */
  byClass: Partial<Record<HeroClassId, HeroForgeAttachConfig>>;
};

const EMPTY: ForgeEquipmentLayoutPrefs = { byClass: {} };

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

export function loadForgeEquipmentLayoutPrefs(): ForgeEquipmentLayoutPrefs {
  if (typeof localStorage === "undefined") return { byClass: {} };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { byClass: {} };
    const p = JSON.parse(raw) as Partial<ForgeEquipmentLayoutPrefs>;
    const byClass: Partial<Record<HeroClassId, HeroForgeAttachConfig>> = {};
    if (p.byClass && typeof p.byClass === "object") {
      for (const k of Object.keys(p.byClass)) {
        if (!isHeroClassId(k)) continue;
        const v = (p.byClass as Record<string, unknown>)[k];
        if (v && typeof v === "object") {
          byClass[k] = v as HeroForgeAttachConfig;
        }
      }
    }
    return { byClass };
  } catch {
    return { byClass: {} };
  }
}

export function saveForgeEquipmentLayoutPrefs(p: ForgeEquipmentLayoutPrefs): void {
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
