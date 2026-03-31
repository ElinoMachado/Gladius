import type {
  ForgeEssenceId,
  ForgeHeroLoadout,
  MetaProgress,
  WeaponLevel,
} from "./types";
import { normalizeWeaponLevel } from "./weaponData";
import { INITIAL_CARD_COSTS, META_COSTS } from "./types";
import { COMBAT_BIOMES } from "./data/biomes";

const KEY = "gladiadores-arena-meta-v2";

/** Essências iniciais por bioma de combate; 0 = novos jogadores sem stock. Subir p/ testes na forja. */
const STARTER_ESSENCES_PER_BIOME = 0;

function starterEssencesMap(): Partial<Record<ForgeEssenceId, number>> {
  if (STARTER_ESSENCES_PER_BIOME <= 0) return {};
  const out: Partial<Record<ForgeEssenceId, number>> = {};
  for (const id of COMBAT_BIOMES) {
    out[id as ForgeEssenceId] = STARTER_ESSENCES_PER_BIOME;
  }
  return out;
}

const emptyForgeSlot = (): ForgeHeroLoadout => ({});

function safeForgePiece(
  x: unknown,
): { biome: ForgeEssenceId; level: 1 | 2 | 3 } | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as { biome?: unknown; level?: unknown };
  const biome = o.biome;
  const level = o.level;
  if (
    typeof biome !== "string" ||
    (level !== 1 && level !== 2 && level !== 3)
  ) {
    return undefined;
  }
  return { biome: biome as ForgeEssenceId, level };
}

function safeForgeLoadout(raw: unknown): ForgeHeroLoadout {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: ForgeHeroLoadout = {};
  const h = safeForgePiece(o.helmo);
  const c = safeForgePiece(o.capa);
  const m = safeForgePiece(o.manoplas);
  if (h) out.helmo = h;
  if (c) out.capa = c;
  if (m) out.manoplas = m;
  return out;
}

/** Garante sempre 3 slots (corrige saves antigos / arrays partidos). */
function normalizeForgeByHeroSlot(
  raw: unknown,
): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] {
  if (!Array.isArray(raw)) {
    return [
      emptyForgeSlot(),
      emptyForgeSlot(),
      emptyForgeSlot(),
    ];
  }
  return [
    safeForgeLoadout(raw[0]),
    safeForgeLoadout(raw[1]),
    safeForgeLoadout(raw[2]),
  ];
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

export function loadMeta(): MetaProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    const o = JSON.parse(raw) as MetaProgress;
    const d = defaultMeta();
    return {
      ...d,
      ...o,
      essences: { ...d.essences, ...(o.essences ?? {}) },
      forgeByHeroSlot: normalizeForgeByHeroSlot(
        o.forgeByHeroSlot ?? d.forgeByHeroSlot,
      ),
      weaponLevelByHeroSlot: normalizeWeaponSlotArray(
        o.weaponLevelByHeroSlot ?? d.weaponLevelByHeroSlot,
      ),
    };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(m: MetaProgress): void {
  localStorage.setItem(KEY, JSON.stringify(m));
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
