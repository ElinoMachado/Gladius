import type {
  ForgeEssenceId,
  ForgeHeroLoadout,
  MetaProgress,
  WeaponLevel,
} from "./types";
import { normalizeWeaponLevel } from "./weaponData";
import { INITIAL_CARD_COSTS, META_COSTS } from "./types";
import { COMBAT_BIOMES } from "./data/biomes";
import { snapshotForgeByHeroSlotForPersistence } from "./forge";

const KEY = "gladiadores-arena-meta-v2";

/** Referência dedicada ao estado da forja (3 loadouts); tem prioridade sobre o blob do meta principal ao carregar. */
const FORGE_STATE_KEY = "gladiadores-arena-forge-state-v1";

const FORGE_STATE_VERSION = 2 as const;

type ForgeStateFile = {
  v: typeof FORGE_STATE_VERSION;
  forgeByHeroSlot: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout];
};

function readForgeStateFile(): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] | null {
  try {
    const raw = localStorage.getItem(FORGE_STATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as { v?: unknown; forgeByHeroSlot?: unknown };
    if (rec.v !== 1 && rec.v !== 2) return null;
    return snapshotForgeByHeroSlotForPersistence(rec.forgeByHeroSlot);
  } catch {
    return null;
  }
}

function writeForgeStateFile(
  slots: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout],
): void {
  const sanitized = snapshotForgeByHeroSlotForPersistence(slots);
  const payload: ForgeStateFile = {
    v: FORGE_STATE_VERSION,
    forgeByHeroSlot: sanitized,
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
 * (sobrepõe o save — útil para testar a forja). Voltar a 0 para progressão normal.
 */
const TEST_FORGE_ESSENCES_EACH = 100;

function starterEssencesMap(): Partial<Record<ForgeEssenceId, number>> {
  if (STARTER_ESSENCES_PER_BIOME <= 0) return {};
  const out: Partial<Record<ForgeEssenceId, number>> = {};
  for (const id of COMBAT_BIOMES) {
    out[id as ForgeEssenceId] = STARTER_ESSENCES_PER_BIOME;
  }
  return out;
}

const emptyForgeSlot = (): ForgeHeroLoadout => ({});

/** Garante sempre 3 slots (corrige saves antigos / arrays partidos). */
function normalizeForgeByHeroSlot(
  raw: unknown,
): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] {
  return snapshotForgeByHeroSlotForPersistence(Array.isArray(raw) ? raw : []);
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
  forgeByHeroSlot: [emptyForgeSlot(), emptyForgeSlot(), emptyForgeSlot()],
  weaponLevelByHeroSlot: [1, 1, 1],
});

function applyTestForgeEssences(
  essences: Partial<Record<ForgeEssenceId, number>>,
): Partial<Record<ForgeEssenceId, number>> {
  if (TEST_FORGE_ESSENCES_EACH <= 0) return essences;
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
    essences: {
      ...d.essences,
      ...(o.essences ?? {}),
    },
    forgeByHeroSlot: normalizeForgeByHeroSlot(
      o.forgeByHeroSlot ?? d.forgeByHeroSlot,
    ),
    weaponLevelByHeroSlot: normalizeWeaponSlotArray(
      o.weaponLevelByHeroSlot ?? d.weaponLevelByHeroSlot,
    ),
  };
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
      if (forgeRef) base.forgeByHeroSlot = forgeRef;
      return base;
    }
    const merged = buildMetaFromMainBlob(raw);
    const forgeRef = readForgeStateFile();
    if (forgeRef) merged.forgeByHeroSlot = forgeRef;
    merged.essences = applyTestForgeEssences(merged.essences);
    return merged;
  } catch {
    const m = defaultMeta();
    const base = {
      ...m,
      essences: applyTestForgeEssences(m.essences),
    };
    const forgeRef = readForgeStateFile();
    if (forgeRef) base.forgeByHeroSlot = forgeRef;
    return base;
  }
}

export function saveMeta(m: MetaProgress): void {
  m.forgeByHeroSlot = snapshotForgeByHeroSlotForPersistence(m.forgeByHeroSlot);
  writeForgeStateFile(m.forgeByHeroSlot);
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
