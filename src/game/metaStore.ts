import type {
  ForgeEssenceId,
  ForgeGlobalProgress,
  ForgeHeroLoadout,
  MetaProgress,
  WeaponLevel,
} from "./types";
import { normalizeWeaponLevel } from "./weaponData";
import { INITIAL_CARD_COSTS, META_COSTS } from "./types";
import { COMBAT_BIOMES } from "./data/biomes";
import {
  normalizeForgeMeta,
  sanitizeForgeGlobalProgress,
  sanitizeForgeSlotsArray,
  snapshotForgeByHeroSlotForPersistence,
  snapshotForgeGlobalForPersistence,
} from "./forge";

const KEY = "gladiadores-arena-meta-v2";

/** Estado da forja (slots + progresso global); prioridade ao carregar sobre o blob principal. */
const FORGE_STATE_KEY = "gladiadores-arena-forge-state-v1";

const FORGE_STATE_VERSION = 3 as const;

type ForgeStateFileV3 = {
  v: typeof FORGE_STATE_VERSION;
  forgeGlobalProgress: ForgeGlobalProgress;
  forgeByHeroSlot: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout];
};

type ForgeStateRead = {
  forgeByHeroSlot: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout];
  forgeGlobalProgress?: ForgeGlobalProgress;
};

function readForgeStateFile(): ForgeStateRead | null {
  try {
    const raw = localStorage.getItem(FORGE_STATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as {
      v?: unknown;
      forgeByHeroSlot?: unknown;
      forgeGlobalProgress?: unknown;
    };
    if (rec.v === 3) {
      return {
        forgeByHeroSlot: sanitizeForgeSlotsArray(rec.forgeByHeroSlot),
        forgeGlobalProgress: sanitizeForgeGlobalProgress(rec.forgeGlobalProgress),
      };
    }
    if (rec.v === 1 || rec.v === 2) {
      return {
        forgeByHeroSlot: sanitizeForgeSlotsArray(rec.forgeByHeroSlot),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeForgeStateFile(m: MetaProgress): void {
  const payload: ForgeStateFileV3 = {
    v: FORGE_STATE_VERSION,
    forgeGlobalProgress: snapshotForgeGlobalForPersistence(m.forgeGlobalProgress),
    forgeByHeroSlot: snapshotForgeByHeroSlotForPersistence(m.forgeByHeroSlot),
  };
  try {
    localStorage.setItem(FORGE_STATE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("writeForgeStateFile: falha ao gravar estado da forja", e);
  }
}

/** Essências iniciais por bioma de combate; 0 = novos jogadores sem stock. */
const STARTER_ESSENCES_PER_BIOME = 0;

/**
 * 0 = desligado. Se > 0, ao carregar o meta cada bioma de combate fica com exatamente este valor
 * (sobrepõe o save). Manter em 0 para novos jogos / “apagar save” começarem sem essências;
 * para testar forja localmente, usa modo sandbox ou aumenta aqui temporariamente.
 */
const TEST_FORGE_ESSENCES_EACH = 0;

function starterEssencesMap(): Partial<Record<ForgeEssenceId, number>> {
  if (STARTER_ESSENCES_PER_BIOME <= 0) return {};
  const out: Partial<Record<ForgeEssenceId, number>> = {};
  for (const id of COMBAT_BIOMES) {
    out[id as ForgeEssenceId] = STARTER_ESSENCES_PER_BIOME;
  }
  return out;
}

/** Só chaves de bioma de combate; ignora lixo / tipos inválidos no JSON guardado. */
function mergeEssencesFromSave(
  saved: unknown,
  defaults: Partial<Record<ForgeEssenceId, number>>,
): Partial<Record<ForgeEssenceId, number>> {
  const out: Partial<Record<ForgeEssenceId, number>> = { ...defaults };
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return out;
  const o = saved as Record<string, unknown>;
  for (const id of COMBAT_BIOMES) {
    const k = id as ForgeEssenceId;
    const raw = o[k as string];
    if (raw === undefined || raw === null) continue;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
  }
  return out;
}

const emptyForgeSlot = (): ForgeHeroLoadout => ({});

/** Lê 3 slots do save principal sem perder mapas (antes de `normalizeForgeMeta`). */
function normalizeForgeByHeroSlot(
  raw: unknown,
): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] {
  return sanitizeForgeSlotsArray(Array.isArray(raw) ? raw : []);
}

function normalizeWeaponSlotArray(
  raw: unknown,
): [WeaponLevel, WeaponLevel, WeaponLevel] {
  if (!Array.isArray(raw) || raw.length < 3) {
    return [1, 1, 1];
  }
  return [
    normalizeWeaponLevel(raw[0]),
    normalizeWeaponLevel(raw[1]),
    normalizeWeaponLevel(raw[2]),
  ];
}

export const defaultMeta = (): MetaProgress => ({
  crystals: 0,
  permDamage: 0,
  permHp: 0,
  permDef: 0,
  permHealShield: 0,
  permXp: 0,
  permGold: 0,
  permCrystalDrop: 0,
  initialCards: 0,
  essences: starterEssencesMap(),
  forgeGlobalProgress: {},
  forgeByHeroSlot: [emptyForgeSlot(), emptyForgeSlot(), emptyForgeSlot()],
  weaponLevelByHeroSlot: [1, 1, 1],
});

function applyTestForgeEssences(
  essences: Partial<Record<ForgeEssenceId, number>>,
): Partial<Record<ForgeEssenceId, number>> {
  /** Em build de produção nunca sobrepõe o save (evita essências tipo 100 por constante de teste). */
  if (TEST_FORGE_ESSENCES_EACH <= 0 || !import.meta.env.DEV) return essences;
  const out = { ...essences };
  for (const id of COMBAT_BIOMES) {
    out[id as ForgeEssenceId] = TEST_FORGE_ESSENCES_EACH;
  }
  return out;
}

function buildMetaFromMainBlob(raw: string): MetaProgress {
  const o = JSON.parse(raw) as MetaProgress;
  const d = defaultMeta();
  return {
    ...d,
    ...o,
    essences: mergeEssencesFromSave(o.essences, d.essences),
    forgeGlobalProgress: sanitizeForgeGlobalProgress(
      o.forgeGlobalProgress ?? d.forgeGlobalProgress,
    ),
    forgeByHeroSlot: normalizeForgeByHeroSlot(
      o.forgeByHeroSlot ?? d.forgeByHeroSlot,
    ),
    weaponLevelByHeroSlot: normalizeWeaponSlotArray(
      o.weaponLevelByHeroSlot ?? d.weaponLevelByHeroSlot,
    ),
  };
}

function applyForgeStateFile(m: MetaProgress, ref: ForgeStateRead): void {
  m.forgeByHeroSlot = ref.forgeByHeroSlot;
  if (ref.forgeGlobalProgress != null) {
    m.forgeGlobalProgress = sanitizeForgeGlobalProgress(ref.forgeGlobalProgress);
  }
}

export function loadMeta(): MetaProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const m = defaultMeta();
      const base = {
        ...m,
        essences: applyTestForgeEssences(m.essences),
      };
      const forgeRef = readForgeStateFile();
      if (forgeRef) applyForgeStateFile(base, forgeRef);
      normalizeForgeMeta(base);
      return base;
    }
    const merged = buildMetaFromMainBlob(raw);
    const forgeRef = readForgeStateFile();
    if (forgeRef) applyForgeStateFile(merged, forgeRef);
    merged.essences = applyTestForgeEssences(merged.essences);
    normalizeForgeMeta(merged);
    return merged;
  } catch {
    const m = defaultMeta();
    const base = {
      ...m,
      essences: applyTestForgeEssences(m.essences),
    };
    const forgeRef = readForgeStateFile();
    if (forgeRef) applyForgeStateFile(base, forgeRef);
    normalizeForgeMeta(base);
    return base;
  }
}

export function saveMeta(m: MetaProgress): void {
  normalizeForgeMeta(m);
  m.forgeGlobalProgress = snapshotForgeGlobalForPersistence(m.forgeGlobalProgress);
  m.forgeByHeroSlot = snapshotForgeByHeroSlotForPersistence(m.forgeByHeroSlot);
  writeForgeStateFile(m);
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch (e) {
    console.error("saveMeta: falha ao gravar localStorage (meta principal)", e);
    throw e;
  }
}

/**
 * Só para desenvolvimento: apaga meta, forja e preferências locais do jogo.
 * Após chamar, convém `location.reload()` para o `GameModel` voltar a carregar `defaultMeta()`.
 */
export function clearAllLocalProgressForFreshStart(): void {
  const keys = [
    KEY,
    FORGE_STATE_KEY,
    "gladiadores-music-volume-percent",
    "gladiadores-sfx-volume-percent",
    "gladiadores-skip-enemy-move",
    "gladiadores-combat-log-visible",
    "gladiadores-enemy-inspect-pos",
  ];
  try {
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function permPercent(level: number): number {
  return [0, 20, 40, 60, 80, 100][level] ?? 0;
}

export function nextMetaCost(currentLevel: number): number | null {
  if (currentLevel >= 5) return null;
  return META_COSTS[currentLevel] ?? null;
}

export function nextInitialCardCost(current: number): number | null {
  if (current >= 3) return null;
  return INITIAL_CARD_COSTS[current] ?? null;
}
