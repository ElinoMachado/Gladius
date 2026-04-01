import type {
  BiomeId,
  ForgeEssenceId,
  ForgeHeroLoadout,
  ForgePerEssenceLevels,
  ForgePiece,
  ForgeSlotKind,
  MetaProgress,
  Unit,
} from "./types";
import { COMBAT_BIOMES } from "./data/biomes";
import { biomeCrestWrap } from "../ui/biomeCrests";
import { statIconWrap, type StatIconId } from "../ui/statIcons";

export const FORGE_ESSENCE_LABELS: Record<ForgeEssenceId, string> = {
  vulcanico: "Essência vulcânica",
  pantano: "Essência do pântano",
  floresta: "Essência da floresta",
  montanhoso: "Essência da montanha",
  rochoso: "Essência rochosa",
  deserto: "Essência do deserto",
};

export function biomeToEssenceId(b: BiomeId): ForgeEssenceId | null {
  if (b === "hub") return null;
  return b as ForgeEssenceId;
}

/** Chance base só por wave: 5% na wave 1 → 50% na wave 50 (e depois). */
const ESS_PCT_WAVE_1 = 5;
const ESS_PCT_WAVE_CAP = 50;
const ESS_WAVE_CAP_AT = 50;

export function essenceBasePercentFromWave(wave: number): number {
  const w = Math.max(1, wave);
  if (w >= ESS_WAVE_CAP_AT) return ESS_PCT_WAVE_CAP;
  return (
    ESS_PCT_WAVE_1 +
    (ESS_PCT_WAVE_CAP - ESS_PCT_WAVE_1) *
      ((w - 1) / (ESS_WAVE_CAP_AT - 1))
  );
}

/** +1% por ponto de sorte (somado à base da wave). */
export function essenceSorteBonusPercent(sorte: number): number {
  return sorte;
}

/** Chance total em % (pode passar de 100; ver `resolveEssenceDropCount`). */
export function essenceDropTotalPercent(wave: number, sorte: number): number {
  return essenceBasePercentFromWave(wave) + essenceSorteBonusPercent(sorte);
}

/**
 * 1) Rola uma vez com chance min(total%, 100%).
 * 2) Para cada 10% acima de 100%, +1 essência garantida (sem rolar).
 */
export function resolveEssenceDropCount(totalPercent: number): number {
  const rollCap = Math.min(100, totalPercent);
  let count = Math.floor(Math.max(0, totalPercent - 100) / 10);
  if (Math.random() * 100 < rollCap) count += 1;
  return count;
}

/** Custo em essência do bioma do item: criar nv1, nv1→2, nv2→3 */
export const FORGE_COST_CREATE = 2;
export const FORGE_COST_UPGRADE_TO_2 = 4;
export const FORGE_COST_UPGRADE_TO_3 = 5;

/** Conta slots com peça **nv 3** daquele bioma (só nv 3 entra na sinergia). */
export function countForgeBiomePieces(
  loadout: ForgeHeroLoadout | undefined,
  biome: ForgeEssenceId,
): number {
  if (!loadout) return 0;
  let n = 0;
  for (const k of FORGE_SLOT_ORDER) {
    if (getForgeLevel(loadout, k, biome) === 3) n++;
  }
  return n;
}

export function forgeSynergyTier(
  loadout: ForgeHeroLoadout | undefined,
  biome: ForgeEssenceId,
): 0 | 1 | 2 | 3 {
  /** Só conta o que está equipado (combate + painel alinhados). */
  const eq = resolveEquippedForgeLoadout(loadout);
  const n = countForgeBiomePieces(eq, biome);
  if (n >= 3) return 3;
  if (n === 2) return 2;
  if (n === 1) return 1;
  return 0;
}

export function emptyForgeLoadout(): ForgeHeroLoadout {
  return {};
}

export const FORGE_SLOT_ORDER: readonly ForgeSlotKind[] = [
  "helmo",
  "capa",
  "manoplas",
];

const PROGRESS_KEY: Record<ForgeSlotKind, keyof ForgeHeroLoadout> = {
  helmo: "helmoByEssence",
  capa: "capaByEssence",
  manoplas: "manoplasByEssence",
};

const EQUIPPED_KEY: Record<ForgeSlotKind, keyof ForgeHeroLoadout> = {
  helmo: "helmoEquipped",
  capa: "capaEquipped",
  manoplas: "manoplasEquipped",
};

function sanitizePerEssenceLevels(x: unknown): ForgePerEssenceLevels | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as Record<string, unknown>;
  const out: ForgePerEssenceLevels = {};
  for (const id of COMBAT_BIOMES) {
    const k = id as ForgeEssenceId;
    const raw = o[k];
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (n === 1 || n === 2 || n === 3) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Nível forjado para (slot, essência), incluindo saves legados (uma peça por slot). */
export function getForgeLevel(
  L: ForgeHeroLoadout | undefined,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): 1 | 2 | 3 | undefined {
  if (!L) return undefined;
  const pk = PROGRESS_KEY[kind];
  const map = L[pk] as ForgePerEssenceLevels | undefined;
  const fromMap = map?.[biome];
  if (fromMap === 1 || fromMap === 2 || fromMap === 3) return fromMap;
  const leg = L[kind] as ForgePiece | undefined;
  if (leg?.biome === biome && (leg.level === 1 || leg.level === 2 || leg.level === 3))
    return leg.level;
  return undefined;
}

/** Bônus % de XP do elmo de essência pântano (nv2 +50%, nv3 +100%). */
export function pantanoHelmoXpBonusPercent(
  loadout: ForgeHeroLoadout | undefined,
): number {
  const lv = getForgeLevel(loadout, "helmo", "pantano");
  if (lv === 2) return 50;
  if (lv === 3) return 100;
  return 0;
}

function ensureProgressMap(
  loadout: ForgeHeroLoadout,
  kind: ForgeSlotKind,
): ForgePerEssenceLevels {
  const pk = PROGRESS_KEY[kind];
  let m = loadout[pk] as ForgePerEssenceLevels | undefined;
  if (!m) {
    m = {};
    (loadout as Record<string, unknown>)[pk as string] = m;
  }
  return m;
}

export function setForgeLevel(
  loadout: ForgeHeroLoadout,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): void {
  const m = ensureProgressMap(loadout, kind);
  m[biome] = level;
  const lo = loadout as Record<string, unknown>;
  delete lo[kind];
}

export function setEquippedBiome(
  loadout: ForgeHeroLoadout,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): void {
  const ek = EQUIPPED_KEY[kind];
  (loadout as Record<string, unknown>)[ek as string] = biome;
}

/** Qual essência está equipada neste slot (combate / modelo). */
export function resolveEquippedBiome(
  L: ForgeHeroLoadout | undefined,
  kind: ForgeSlotKind,
): ForgeEssenceId | undefined {
  if (!L) return undefined;
  const ek = EQUIPPED_KEY[kind];
  const pref = L[ek as keyof ForgeHeroLoadout] as ForgeEssenceId | undefined;
  if (pref && getForgeLevel(L, kind, pref) != null) return pref;
  const leg = L[kind] as ForgePiece | undefined;
  if (leg && getForgeLevel(L, kind, leg.biome) != null) return leg.biome;
  const pk = PROGRESS_KEY[kind];
  const map = L[pk] as ForgePerEssenceLevels | undefined;
  if (!map) return undefined;
  let bestBiome: ForgeEssenceId | undefined;
  let bestLv = 0;
  for (const [b, lv] of Object.entries(map) as [ForgeEssenceId, 1 | 2 | 3][]) {
    if (lv > bestLv) {
      bestLv = lv;
      bestBiome = b;
    }
  }
  return bestBiome;
}

/** Loadout só com as três peças equipadas (stats e visual). */
export function resolveEquippedForgeLoadout(
  L: ForgeHeroLoadout | undefined,
): ForgeHeroLoadout {
  const flat: ForgeHeroLoadout = {};
  if (!L) return flat;
  for (const kind of FORGE_SLOT_ORDER) {
    const b = resolveEquippedBiome(L, kind);
    if (!b) continue;
    const lv = getForgeLevel(L, kind, b);
    if (!lv) continue;
    flat[kind] = { biome: b, level: lv };
  }
  return flat;
}

function stripInvalidEquipped(loadout: ForgeHeroLoadout): void {
  for (const kind of FORGE_SLOT_ORDER) {
    const ek = EQUIPPED_KEY[kind];
    const pref = loadout[ek as keyof ForgeHeroLoadout] as ForgeEssenceId | undefined;
    if (pref != null && getForgeLevel(loadout, kind, pref) == null) {
      delete (loadout as Record<string, unknown>)[ek as string];
    }
  }
}

/** Só persiste biome + level válidos (evita perdas com spread/`JSON` e níveis como string). */
export function sanitizeForgePiece(
  x: unknown,
): { biome: ForgeEssenceId; level: 1 | 2 | 3 } | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as { biome?: unknown; level?: unknown };
  if (typeof o.biome !== "string") return undefined;
  const lv =
    typeof o.level === "number"
      ? o.level
      : typeof o.level === "string"
        ? Number(o.level)
        : NaN;
  if (lv !== 1 && lv !== 2 && lv !== 3) return undefined;
  return { biome: o.biome as ForgeEssenceId, level: lv };
}

export function sanitizeForgeLoadout(L: unknown): ForgeHeroLoadout {
  const out: ForgeHeroLoadout = {};
  if (!L || typeof L !== "object") return out;
  const o = L as Record<string, unknown>;
  const he = sanitizePerEssenceLevels(o.helmoByEssence);
  const ce = sanitizePerEssenceLevels(o.capaByEssence);
  const me = sanitizePerEssenceLevels(o.manoplasByEssence);
  if (he) out.helmoByEssence = { ...he };
  if (ce) out.capaByEssence = { ...ce };
  if (me) out.manoplasByEssence = { ...me };
  for (const ek of [
    "helmoEquipped",
    "capaEquipped",
    "manoplasEquipped",
  ] as const) {
    const v = o[ek];
    if (typeof v === "string" && COMBAT_BIOMES.includes(v as BiomeId)) {
      (out as Record<string, unknown>)[ek] = v;
    }
  }
  for (const kind of FORGE_SLOT_ORDER) {
    const p = sanitizeForgePiece(o[kind]);
    if (!p) continue;
    const m = ensureProgressMap(out, kind);
    if (m[p.biome] == null) m[p.biome] = p.level;
    const eqK = EQUIPPED_KEY[kind];
    if (out[eqK as keyof ForgeHeroLoadout] == null) {
      (out as Record<string, unknown>)[eqK as string] = p.biome;
    }
  }
  stripInvalidEquipped(out);
  return out;
}

/**
 * Tupla de 3 loadouts para memória/localStorage: cópia explícita por peça
 * (não usar object spread nas peças — garante que nada “some” ao gravar).
 */
export function snapshotForgeByHeroSlotForPersistence(
  slots: unknown,
): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] {
  const arr = Array.isArray(slots) ? slots : [];
  const out: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] = [
    {},
    {},
    {},
  ];
  for (let i = 0; i < 3; i++) {
    out[i] = sanitizeForgeLoadout(arr[i]);
  }
  return out;
}

export function cloneForgeLoadout(l: ForgeHeroLoadout): ForgeHeroLoadout {
  return sanitizeForgeLoadout(l);
}

/** Cópia profunda dos 3 loadouts (referências partilhadas → tupla isolada). */
export function cloneForgeByHeroSlot(
  slots: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout],
): [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout] {
  return snapshotForgeByHeroSlotForPersistence(slots);
}

/** Aplica bônus de forja ao herói (stats já com meta + party). */
export function applyForgeGearToUnit(u: Unit, loadout: ForgeHeroLoadout): void {
  u.forgeLoadout = cloneForgeLoadout(loadout);
  const resolved = resolveEquippedForgeLoadout(loadout);
  const h = resolved.helmo;
  if (h) {
    if (h.biome === "pantano") {
      if (h.level === 1) u.movimento += 1;
      else if (h.level === 2) u.movimento += 1;
      else u.movimento += 2;
    } else if (h.biome === "montanhoso") {
      if (h.level === 1) {
        u.defesa += 20;
        u.regenVida += 2;
      } else if (h.level === 2) {
        u.defesa += 50;
        u.regenVida += 4;
      } else {
        u.defesa += 80;
        u.regenVida += 6;
      }
    } else if (h.biome === "deserto") {
      if (h.level === 1) {
        u.maxMana += 5;
        u.mana += 5;
        u.regenVida += 1;
        u.regenMana += 1;
      } else if (h.level === 2) {
        u.maxMana += 15;
        u.mana += 15;
        u.regenVida += 2;
        u.regenMana += 2;
      } else {
        u.maxMana += 25;
        u.mana += 25;
        u.regenVida += 3;
        u.regenMana += 3;
      }
    } else if (h.biome === "rochoso") {
      /* +1/+2/+3 básicos: `getForgeLevel(..., "helmo", "rochoso")` em `maxBasicAttacksForHero`. */
    } else if (h.biome === "vulcanico") {
      if (h.level === 1) {
        u.penetracaoEscudo += 10;
        u.lifesteal += 5;
      } else if (h.level === 2) {
        u.penetracaoEscudo += 25;
        u.lifesteal += 12;
      } else {
        u.penetracaoEscudo += 60;
        u.lifesteal += 25;
      }
    } else {
      const hel =
        h.level === 1
          ? { mov: 1, alc: 0 }
          : h.level === 2
            ? { mov: 1, alc: 1 }
            : { mov: 2, alc: 2 };
      u.movimento += hel.mov;
      u.alcance += hel.alc;
    }
  }
  const c = resolved.capa;
  if (c) {
    /** Só o pacote do nível atual (como elmo/manoplas), sem somar nv1+nv2+nv3. */
    if (c.biome === "pantano") {
      if (c.level === 1) {
        u.maxHp += 150;
        u.hp += 150;
        u.defesa += 20;
      } else if (c.level === 2) {
        u.maxHp += 400;
        u.hp += 400;
        u.defesa += 30;
      } else {
        u.maxHp += 900;
        u.hp += 900;
        u.defesa += 50;
      }
    } else if (c.biome === "montanhoso") {
      if (c.level === 1) {
        u.maxHp += 50;
        u.hp += 50;
        u.defesa += 100;
      } else if (c.level === 2) {
        u.maxHp += 200;
        u.hp += 200;
        u.defesa += 150;
      } else {
        u.maxHp += 300;
        u.hp += 300;
        u.defesa += 200;
      }
    } else if (c.biome === "deserto") {
      if (c.level === 1) {
        u.maxHp += 50;
        u.hp += 50;
        u.potencialCuraEscudo += 25;
      } else if (c.level === 2) {
        u.maxHp += 100;
        u.hp += 100;
        u.potencialCuraEscudo += 60;
      } else {
        u.maxHp += 200;
        u.hp += 200;
        u.potencialCuraEscudo += 150;
      }
    } else if (c.biome === "rochoso") {
      if (c.level === 1) {
        u.maxHp += 450;
        u.hp += 450;
      } else if (c.level === 2) {
        u.maxHp += 1000;
        u.hp += 1000;
      } else {
        u.maxHp += 1800;
        u.hp += 1800;
      }
    } else if (c.biome === "vulcanico") {
      if (c.level === 1) {
        u.maxHp += 100;
        u.hp += 100;
        u.defesa += 10;
        u.dano += 20;
      } else if (c.level === 2) {
        u.maxHp += 150;
        u.hp += 150;
        u.defesa += 20;
        u.dano += 40;
      } else {
        u.maxHp += 200;
        u.hp += 200;
        u.defesa += 30;
        u.dano += 60;
      }
    } else if (c.level === 1) {
      u.maxHp += 100;
      u.hp += 100;
      u.defesa += 25;
    } else if (c.level === 2) {
      u.maxHp += 200;
      u.hp += 200;
      u.defesa += 50;
    } else {
      u.maxHp += 500;
      u.hp += 500;
      u.defesa += 100;
    }
  }
  const m = resolved.manoplas;
  if (m) {
    if (m.biome === "pantano") {
      if (m.level === 1) {
        u.dano += 5;
        u.penetracao += 10;
      } else if (m.level === 2) {
        u.dano += 15;
        u.penetracao += 50;
      } else {
        u.dano += 30;
        u.penetracao += 125;
      }
    } else if (m.biome === "montanhoso") {
      if (m.level === 1) {
        u.dano += 20;
        u.regenVida += 1;
      } else if (m.level === 2) {
        u.dano += 45;
        u.regenVida += 2;
      } else {
        u.dano += 90;
        u.regenVida += 3;
      }
    } else if (m.biome === "deserto") {
      if (m.level === 1) {
        u.dano += 20;
        u.acertoCritico += 20;
        u.lifesteal += 10;
      } else if (m.level === 2) {
        u.dano += 40;
        u.acertoCritico += 40;
        u.lifesteal += 20;
      } else {
        u.dano += 60;
        u.acertoCritico += 75;
        u.lifesteal += 25;
      }
    } else if (m.biome === "rochoso") {
      if (m.level === 1) {
        u.dano += 30;
        u.acertoCritico += 50;
      } else if (m.level === 2) {
        u.dano += 75;
        u.acertoCritico += 75;
      } else {
        u.dano += 120;
        u.acertoCritico += 100;
      }
    } else {
      const mn =
        m.level === 1
          ? { dano: 10, c: 25, cd: 0 }
          : m.level === 2
            ? { dano: 25, c: 50, cd: 0.25 }
            : { dano: 50, c: 100, cd: 0.5 };
      u.dano += mn.dano;
      u.acertoCritico += mn.c;
      u.danoCritico += mn.cd;
    }
  }
  if (forgeSynergyTier(loadout, "floresta") >= 2) {
    u.flying = true;
  }
  if (forgeSynergyTier(loadout, "montanhoso") >= 3) {
    u.defesa = Math.floor(u.defesa * 2);
  }
}

export function forgeVisualKey(loadout: ForgeHeroLoadout | undefined): string {
  const R = resolveEquippedForgeLoadout(loadout);
  const bits: string[] = [];
  for (const k of FORGE_SLOT_ORDER) {
    const p = R[k];
    if (p) bits.push(`${k}:${p.biome}:${p.level}`);
  }
  return bits.join("|");
}

/** Texto plano curto (acessibilidade / fallback); ícones em `forgePieceEffectHtml`. */
export function forgePieceDescription(
  slot: ForgeSlotKind,
  level: 1 | 2 | 3,
  biome: ForgeEssenceId,
): string {
  if (slot === "helmo") {
    if (biome === "pantano") {
      if (level === 1) return "+1 movimento";
      if (level === 2) return "+1 movimento, bônus de XP +50%";
      return "+2 movimento, bônus de XP +100%";
    }
    if (biome === "montanhoso") {
      if (level === 1) return "+20 defesa, +2 regen. vida";
      if (level === 2) return "+50 defesa, +4 regen. vida";
      return "+80 defesa, +6 regen. vida";
    }
    if (biome === "deserto") {
      if (level === 1) return "+5 mana máx., +1 regen. vida, +1 regen. mana";
      if (level === 2) return "+15 mana máx., +2 regen. vida, +2 regen. mana";
      return "+25 mana máx., +3 regen. vida, +3 regen. mana";
    }
    if (biome === "rochoso") {
      if (level === 1) return "+1 ataque básico extra";
      if (level === 2) return "+2 ataques básicos extra";
      return "+3 ataques básicos extra";
    }
    if (biome === "vulcanico") {
      if (level === 1) return "+10 penetração de escudo, +5% roubo de vida";
      if (level === 2) return "+25 penetração de escudo, +12% roubo de vida";
      return "+60 penetração de escudo, +25% roubo de vida";
    }
    if (level === 1) return "+1 movimento";
    if (level === 2) return "+1 alcance, +1 movimento";
    return "+2 alcance, +2 movimento";
  }
  if (slot === "capa") {
    if (biome === "pantano") {
      if (level === 1) return "+150 vida máx., +20 armadura";
      if (level === 2) return "+400 vida máx., +30 armadura";
      return "+900 vida máx., +50 armadura";
    }
    if (biome === "montanhoso") {
      if (level === 1) return "+50 vida máx., +100 armadura";
      if (level === 2) return "+200 vida máx., +150 armadura";
      return "+300 vida máx., +200 armadura";
    }
    if (biome === "deserto") {
      if (level === 1) return "+50 vida máx., +25% potencial cura/escudo";
      if (level === 2) return "+100 vida máx., +60% potencial cura/escudo";
      return "+200 vida máx., +150% potencial cura/escudo";
    }
    if (biome === "rochoso") {
      if (level === 1) return "+450 vida máx.";
      if (level === 2) return "+1000 vida máx.";
      return "+1800 vida máx.";
    }
    if (biome === "vulcanico") {
      if (level === 1) return "+100 vida máx., +10 defesa, +20 dano";
      if (level === 2) return "+150 vida máx., +20 defesa, +40 dano";
      return "+200 vida máx., +30 defesa, +60 dano";
    }
    if (level === 1) return "+100 vida máx., +25 armadura";
    if (level === 2) return "+200 vida máx., +50 armadura";
    return "+500 vida máx., +100 armadura";
  }
  if (biome === "pantano") {
    if (level === 1) return "+5 dano, +10 penetração";
    if (level === 2) return "+15 dano, +50 penetração";
    return "+30 dano, +125 penetração";
  }
  if (biome === "montanhoso") {
    if (level === 1) return "+20 dano, +1 regen. vida";
    if (level === 2) return "+45 dano, +2 regen. vida";
    return "+90 dano, +3 regen. vida";
  }
  if (biome === "deserto") {
    if (level === 1) return "+20 dano, +20% crítico, +10% roubo de vida";
    if (level === 2) return "+40 dano, +40% crítico, +20% roubo de vida";
    return "+60 dano, +75% crítico, +25% roubo de vida";
  }
  if (biome === "rochoso") {
    if (level === 1) return "+30 dano, +50% chance crítica";
    if (level === 2) return "+75 dano, +75% chance crítica";
    return "+120 dano, +100% chance crítica";
  }
  if (level === 1) return "+10 dano, +25% chance crítica";
  if (level === 2) return "+25 dano, +50% crítico, +25% dano crítico";
  return "+50 dano, +100% crítico, +50% dano crítico";
}

function forgeFxSeg(icon: StatIconId, uniq: { n: number }, text: string): string {
  return `<span class="forge-fx-seg">${statIconWrap(icon, uniq.n++)}<span class="forge-fx-txt">${escapeForgeHtml(text)}</span></span>`;
}

/**
 * Uma linha de efeito com ícones iguais ao grid do herói no combate (`lol-stat-ico`).
 * Vírgulas ficam dentro do texto do segmento anterior para não aparecerem sozinhas ao fazer wrap no flex.
 */
export function forgePieceEffectHtml(
  kind: ForgeSlotKind,
  level: 1 | 2 | 3,
  uniqBase: number,
  biome: ForgeEssenceId,
): string {
  const u = { n: uniqBase };
  const p: string[] = [];
  if (kind === "helmo") {
    if (biome === "pantano") {
      if (level === 1) p.push(forgeFxSeg("mov", u, "+1 movimento"));
      else if (level === 2) {
        p.push(forgeFxSeg("mov", u, "+1 movimento, "));
        p.push(forgeFxSeg("xp_bonus", u, "bônus XP +50%"));
      } else {
        p.push(forgeFxSeg("mov", u, "+2 movimento, "));
        p.push(forgeFxSeg("xp_bonus", u, "bônus XP +100%"));
      }
    } else if (biome === "montanhoso") {
      if (level === 1) {
        p.push(forgeFxSeg("def", u, "+20 defesa, "));
        p.push(forgeFxSeg("regen_hp", u, "+2 regen. vida"));
      } else if (level === 2) {
        p.push(forgeFxSeg("def", u, "+50 defesa, "));
        p.push(forgeFxSeg("regen_hp", u, "+4 regen. vida"));
      } else {
        p.push(forgeFxSeg("def", u, "+80 defesa, "));
        p.push(forgeFxSeg("regen_hp", u, "+6 regen. vida"));
      }
    } else if (biome === "deserto") {
      if (level === 1) {
        p.push(forgeFxSeg("max_mana", u, "+5 mana máx., "));
        p.push(forgeFxSeg("regen_hp", u, "+1 regen. vida, "));
        p.push(forgeFxSeg("regen_mp", u, "+1 regen. mana"));
      } else if (level === 2) {
        p.push(forgeFxSeg("max_mana", u, "+15 mana máx., "));
        p.push(forgeFxSeg("regen_hp", u, "+2 regen. vida, "));
        p.push(forgeFxSeg("regen_mp", u, "+2 regen. mana"));
      } else {
        p.push(forgeFxSeg("max_mana", u, "+25 mana máx., "));
        p.push(forgeFxSeg("regen_hp", u, "+3 regen. vida, "));
        p.push(forgeFxSeg("regen_mp", u, "+3 regen. mana"));
      }
    } else if (biome === "rochoso") {
      if (level === 1) p.push(forgeFxSeg("basic", u, "+1 ataque básico extra"));
      else if (level === 2)
        p.push(forgeFxSeg("basic", u, "+2 ataques básicos extra"));
      else p.push(forgeFxSeg("basic", u, "+3 ataques básicos extra"));
    } else if (biome === "vulcanico") {
      if (level === 1) {
        p.push(forgeFxSeg("pen_escudo", u, "+10 pen. escudo, "));
        p.push(forgeFxSeg("lifesteal", u, "+5% roubo de vida"));
      } else if (level === 2) {
        p.push(forgeFxSeg("pen_escudo", u, "+25 pen. escudo, "));
        p.push(forgeFxSeg("lifesteal", u, "+12% roubo de vida"));
      } else {
        p.push(forgeFxSeg("pen_escudo", u, "+60 pen. escudo, "));
        p.push(forgeFxSeg("lifesteal", u, "+25% roubo de vida"));
      }
    } else if (level === 1) p.push(forgeFxSeg("mov", u, "+1 movimento"));
    else if (level === 2) {
      p.push(forgeFxSeg("range", u, "+1 alcance, "));
      p.push(forgeFxSeg("mov", u, "+1 movimento"));
    } else {
      p.push(forgeFxSeg("range", u, "+2 alcance, "));
      p.push(forgeFxSeg("mov", u, "+2 movimento"));
    }
  } else if (kind === "capa") {
    if (biome === "pantano") {
      if (level === 1) {
        p.push(forgeFxSeg("max_hp", u, "+150 vida máx., "));
        p.push(forgeFxSeg("def", u, "+20 armadura"));
      } else if (level === 2) {
        p.push(forgeFxSeg("max_hp", u, "+400 vida máx., "));
        p.push(forgeFxSeg("def", u, "+30 armadura"));
      } else {
        p.push(forgeFxSeg("max_hp", u, "+900 vida máx., "));
        p.push(forgeFxSeg("def", u, "+50 armadura"));
      }
    } else if (biome === "montanhoso") {
      if (level === 1) {
        p.push(forgeFxSeg("max_hp", u, "+50 vida máx., "));
        p.push(forgeFxSeg("def", u, "+100 armadura"));
      } else if (level === 2) {
        p.push(forgeFxSeg("max_hp", u, "+200 vida máx., "));
        p.push(forgeFxSeg("def", u, "+150 armadura"));
      } else {
        p.push(forgeFxSeg("max_hp", u, "+300 vida máx., "));
        p.push(forgeFxSeg("def", u, "+200 armadura"));
      }
    } else if (biome === "deserto") {
      if (level === 1) {
        p.push(forgeFxSeg("max_hp", u, "+50 vida máx., "));
        p.push(forgeFxSeg("pot", u, "+25% potencial cura/escudo"));
      } else if (level === 2) {
        p.push(forgeFxSeg("max_hp", u, "+100 vida máx., "));
        p.push(forgeFxSeg("pot", u, "+60% potencial cura/escudo"));
      } else {
        p.push(forgeFxSeg("max_hp", u, "+200 vida máx., "));
        p.push(forgeFxSeg("pot", u, "+150% potencial cura/escudo"));
      }
    } else if (biome === "rochoso") {
      if (level === 1) p.push(forgeFxSeg("max_hp", u, "+450 vida máx."));
      else if (level === 2) p.push(forgeFxSeg("max_hp", u, "+1000 vida máx."));
      else p.push(forgeFxSeg("max_hp", u, "+1800 vida máx."));
    } else if (biome === "vulcanico") {
      if (level === 1) {
        p.push(forgeFxSeg("max_hp", u, "+100 vida máx., "));
        p.push(forgeFxSeg("def", u, "+10 defesa, "));
        p.push(forgeFxSeg("dmg", u, "+20 dano"));
      } else if (level === 2) {
        p.push(forgeFxSeg("max_hp", u, "+150 vida máx., "));
        p.push(forgeFxSeg("def", u, "+20 defesa, "));
        p.push(forgeFxSeg("dmg", u, "+40 dano"));
      } else {
        p.push(forgeFxSeg("max_hp", u, "+200 vida máx., "));
        p.push(forgeFxSeg("def", u, "+30 defesa, "));
        p.push(forgeFxSeg("dmg", u, "+60 dano"));
      }
    } else if (level === 1) {
      p.push(forgeFxSeg("max_hp", u, "+100 vida máx., "));
      p.push(forgeFxSeg("def", u, "+25 armadura"));
    } else if (level === 2) {
      p.push(forgeFxSeg("max_hp", u, "+200 vida máx., "));
      p.push(forgeFxSeg("def", u, "+50 armadura"));
    } else {
      p.push(forgeFxSeg("max_hp", u, "+500 vida máx., "));
      p.push(forgeFxSeg("def", u, "+100 armadura"));
    }
  } else if (biome === "pantano") {
    if (level === 1) {
      p.push(forgeFxSeg("dmg", u, "+5 dano, "));
      p.push(forgeFxSeg("pen", u, "+10 penetração"));
    } else if (level === 2) {
      p.push(forgeFxSeg("dmg", u, "+15 dano, "));
      p.push(forgeFxSeg("pen", u, "+50 penetração"));
    } else {
      p.push(forgeFxSeg("dmg", u, "+30 dano, "));
      p.push(forgeFxSeg("pen", u, "+125 penetração"));
    }
  } else if (biome === "montanhoso") {
    if (level === 1) {
      p.push(forgeFxSeg("dmg", u, "+20 dano, "));
      p.push(forgeFxSeg("regen_hp", u, "+1 regen. vida"));
    } else if (level === 2) {
      p.push(forgeFxSeg("dmg", u, "+45 dano, "));
      p.push(forgeFxSeg("regen_hp", u, "+2 regen. vida"));
    } else {
      p.push(forgeFxSeg("dmg", u, "+90 dano, "));
      p.push(forgeFxSeg("regen_hp", u, "+3 regen. vida"));
    }
  } else if (biome === "deserto") {
    if (level === 1) {
      p.push(forgeFxSeg("dmg", u, "+20 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+20% crítico, "));
      p.push(forgeFxSeg("lifesteal", u, "+10% roubo de vida"));
    } else if (level === 2) {
      p.push(forgeFxSeg("dmg", u, "+40 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+40% crítico, "));
      p.push(forgeFxSeg("lifesteal", u, "+20% roubo de vida"));
    } else {
      p.push(forgeFxSeg("dmg", u, "+60 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+75% crítico, "));
      p.push(forgeFxSeg("lifesteal", u, "+25% roubo de vida"));
    }
  } else if (biome === "rochoso") {
    if (level === 1) {
      p.push(forgeFxSeg("dmg", u, "+30 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+50% chance crítica"));
    } else if (level === 2) {
      p.push(forgeFxSeg("dmg", u, "+75 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+75% chance crítica"));
    } else {
      p.push(forgeFxSeg("dmg", u, "+120 dano, "));
      p.push(forgeFxSeg("crit_hit", u, "+100% chance crítica"));
    }
  } else if (level === 1) {
    p.push(forgeFxSeg("dmg", u, "+10 dano, "));
    p.push(forgeFxSeg("crit_hit", u, "+25% chance crítica"));
  } else if (level === 2) {
    p.push(forgeFxSeg("dmg", u, "+25 dano, "));
    p.push(forgeFxSeg("crit_hit", u, "+50% crítico, "));
    p.push(forgeFxSeg("crit_dmg", u, "+25% dano crítico"));
  } else {
    p.push(forgeFxSeg("dmg", u, "+50 dano, "));
    p.push(forgeFxSeg("crit_hit", u, "+100% crítico, "));
    p.push(forgeFxSeg("crit_dmg", u, "+50% dano crítico"));
  }
  return `<div class="forge-piece-effect-line">${p.join("")}</div>`;
}

export function forgeSynergyDescriptionLines(
  biome: ForgeEssenceId,
): string[] {
  if (biome === "vulcanico") {
    return [
      "1 peça: ignora dano vulcânico no fim do turno. Com Ruler: +10 vida em vez de perder.",
      "2 peças: dano ambiental vulcânico contra inimigos é dobrado.",
      "3 peças: crítico com ataque básico aplica 50% do dano a todos os inimigos.",
    ];
  }
  if (biome === "deserto") {
    return [
      "1 peça: ignora anulação de regen no deserto. Com Ruler: +2 regen de vida e mana.",
      "2 peças: no deserto, dobra regen de vida e mana; aliados recebem 50% da tua regen de vida e mana.",
      "3 peças: ao subir de nível: cura 100% vida/mana da party; excesso vira escudo (100%).",
    ];
  }
  if (biome === "floresta") {
    return [
      "1 peça: na floresta, +2 alcance; inimigos na floresta não ganham +1 de alcance.",
      "2 peças: voo; mantém o bônus de alcance da floresta fora dela.",
      "3 peça: sorte dobrada.",
    ];
  }
  if (biome === "pantano") {
    return [
      "1 peça: ignora penalidade de movimento no pântano; com Ruler: +1 movimento para ti e todos os aliados.",
      "2 peças: inimigos com movimento < 4 causam 50% menos dano.",
      "3 peças: dobra os teus pontos de movimento no turno.",
    ];
  }
  if (biome === "montanhoso") {
    return [
      "1 peça: +100% armadura no montanhoso, +50% fora; com Ruler: inimigos no montanhoso perdem 50% defesa.",
      "2 peças: aliados ganham 25% da tua defesa; +10% da tua defesa como dano extra nos teus golpes.",
      "3 peças: dobra os teus pontos de defesa.",
    ];
  }
  if (biome === "rochoso") {
    return [
      "1 peça: no rochoso, +200% ao multiplicador de crítico; com Ruler: +50% dano crítico por titular (aliados).",
      "2 peças: críticos com básico atingem inimigos até 2 hex do alvo.",
      "3 peças: adjacentes a ti levam 100% do teu dano no fim do turno deles (pode crítar); ao moveres, inimigos focam-te.",
    ];
  }
  return [
    "1 peça: sem efeito.",
    "2 peças: sem efeito.",
    "3 peças: sem efeito.",
  ];
}

/** Tooltip do brasão no cartão de sinergia (3 níveis com destaque do que está ativo). */
export function forgeSynergyCrestTooltipHtml(
  biome: ForgeEssenceId,
  tier: 0 | 1 | 2 | 3,
): string {
  const lines = forgeSynergyDescriptionLines(biome);
  const title = FORGE_ESSENCE_LABELS[biome];
  let html = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeForgeHtml(title)}</div><p class="game-ui-tooltip-passive"><strong>Sinergia ${tier}/3 (só peças nv 3 contam)</strong></p><ul class="forge-tip-syn">`;
  for (let i = 0; i < 3; i++) {
    const line = lines[i] ?? "";
    const on = tier > i;
    html += `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
  }
  html += `</ul></div>`;
  return html;
}

/**
 * @deprecated Cada essência tem progresso próprio; a sinergia usa o loadout real (`forgeSynergyPanelHtml`).
 * Mantido como identidade para não quebrar imports antigos.
 */
export function forgeLoadoutProjectedForSynergy(
  base: ForgeHeroLoadout,
  _selectedPerSlot: Readonly<Record<ForgeSlotKind, ForgeEssenceId>>,
): ForgeHeroLoadout {
  return cloneForgeLoadout(base);
}

/** Tooltip HTML (equipamento modal / cartão inteiro). */
export function forgePieceCardTooltipHtml(
  kind: ForgeSlotKind,
  piece: { biome: ForgeEssenceId; level: 1 | 2 | 3 } | undefined,
  heroLoadout: ForgeHeroLoadout,
): string {
  if (!piece) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas"}</div><p class="game-ui-tooltip-passive">Sem peça forjada neste slot.</p></div>`;
  }
  const title =
    kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas";
  const titleWithLevel = `${title} - nv ${piece.level}`;
  const essenceLine = FORGE_ESSENCE_LABELS[piece.biome];
  const effectHtml = forgePieceEffectHtml(kind, piece.level, 320, piece.biome);
  const tier = forgeSynergyTier(heroLoadout, piece.biome);
  const synLines = forgeSynergyDescriptionLines(piece.biome);
  let synBlock = `<p class="game-ui-tooltip-passive"><strong>Sinergia (${FORGE_ESSENCE_LABELS[piece.biome]}, ${tier}/3 peças nv 3)</strong></p><ul class="forge-tip-syn">`;
  for (let i = 0; i < 3; i++) {
    const line = synLines[i] ?? "";
    const on = tier > i;
    synBlock += `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
  }
  synBlock += `</ul>`;
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeForgeHtml(titleWithLevel)}</div><p class="game-ui-tooltip-passive">${escapeForgeHtml(essenceLine)}</p><p class="game-ui-tooltip-passive"><strong>Efeito desta peça</strong></p>${effectHtml}${synBlock}</div>`;
}

function escapeForgeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Painel de sinergias: só biomas da combinação **equipada** (elmo + capa + manoplas atuais). */
export function forgeSynergyPanelHtml(L: ForgeHeroLoadout): string {
  const equipped = resolveEquippedForgeLoadout(L);
  const present = new Set<ForgeEssenceId>();
  for (const kind of FORGE_SLOT_ORDER) {
    const p = equipped[kind];
    if (p) present.add(p.biome);
  }
  const biomes = COMBAT_BIOMES.map((id) => id as ForgeEssenceId).filter((b) =>
    present.has(b),
  );
  if (biomes.length === 0) {
    return `<div class="forge-synergy-panel forge-synergy-panel--empty"><p class="forge-synergy-empty__hint">Ainda sem equipamento neste slot. Forja e escolhe a essência em cada tipo de peça; aqui só entram sinergias da <strong>combinação equipada</strong> (ex.: 1 vulcânico + 1 pântano + 1 deserto → três cartões). Só nv 3 contam para o tier.</p></div>`;
  }
  const cards = biomes
    .map((biome) => {
      const tier = forgeSynergyTier(L, biome);
      const lines = forgeSynergyDescriptionLines(biome);
      const crest = biomeCrestWrap(biome, 32);
      const lis = lines
        .map((line, i) => {
          const on = tier > i;
          return `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
        })
        .join("");
      return `<div class="forge-syn-card" data-biome="${biome}">
      <div class="forge-syn-card__head">${crest}<span class="forge-syn-card__name">${escapeForgeHtml(FORGE_ESSENCE_LABELS[biome])}</span><span class="forge-syn-tier" title="Peças nv 3 deste bioma">${tier}/3 nv3</span></div>
      <ol class="forge-syn-list">${lis}</ol>
    </div>`;
    })
    .join("");
  return `<div class="forge-synergy-panel">${cards}</div>`;
}

/** Barra de essências com brasão por bioma. */
export function forgeEssenceBarHtml(meta: MetaProgress): string {
  return `<div class="forge-essence-bar">${COMBAT_BIOMES.map((id) => {
    const eid = id as ForgeEssenceId;
    const n = meta.essences[eid] ?? 0;
    return `<span class="forge-essence-item"><span class="forge-essence-crest" aria-hidden="true">${biomeCrestWrap(eid, 28)}</span><span class="forge-essence-txt">${escapeForgeHtml(FORGE_ESSENCE_LABELS[eid])}: <strong>${n}</strong></span></span>`;
  }).join("")}</div>`;
}

/** Tooltip do botão Forjar / Aprimorar (próximo passo). */
function forgeSlotKindLabelPt(kind: ForgeSlotKind): string {
  return kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas";
}

export function forgeUpgradeButtonTooltipHtml(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  selectedBiome: ForgeEssenceId,
): string {
  const loadout = meta.forgeByHeroSlot[heroSlotIndex];
  if (!loadout) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Forja</div><p class="game-ui-tooltip-passive">Dados de herói inválidos; reinicia o jogo ou o meta.</p></div>`;
  }
  const curLv = getForgeLevel(loadout, kind, selectedBiome);
  const heldElsewhere = forgeKindBiomeHeldByOtherHero(
    meta,
    heroSlotIndex,
    kind,
    selectedBiome,
  );
  if (heldElsewhere && curLv == null) {
    const kt = forgeSlotKindLabelPt(kind);
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Indisponível</div><p class="game-ui-tooltip-passive">Já existe um <strong>${escapeForgeHtml(kt)}</strong> de ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} noutro slot de party. Cada tipo de peça + bioma é de <strong>uso único</strong> (não podes duplicar entre heróis).</p></div>`;
  }
  if (curLv != null && curLv >= 3) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Nível máximo</div><p class="game-ui-tooltip-passive">Esta linha (${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])}) já está no nv3. Escolhe outra essência no menu para forjar ou aprimorar outra linha.</p></div>`;
  }
  if (curLv == null) {
    const cost = FORGE_COST_CREATE;
    const have = meta.essences[selectedBiome] ?? 0;
    const fx = forgePieceEffectHtml(kind, 1, 520, selectedBiome);
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Forjar nv1</div><p class="game-ui-tooltip-passive">Nova linha de ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])}; não apaga outras essências já forjadas neste slot.</p><p class="game-ui-tooltip-passive">Custo: <strong>${cost}</strong> ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} (tens ${have}).</p><p class="game-ui-tooltip-passive"><strong>Após forjar</strong></p>${fx}</div>`;
  }
  const cost =
    curLv === 1 ? FORGE_COST_UPGRADE_TO_2 : FORGE_COST_UPGRADE_TO_3;
  const have = meta.essences[selectedBiome] ?? 0;
  const nextLev = (curLv + 1) as 2 | 3;
  const fx = forgePieceEffectHtml(kind, nextLev, 530, selectedBiome);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Aprimorar → nv${nextLev}</div><p class="game-ui-tooltip-passive">Custo: <strong>${cost}</strong> ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} (tens ${have}).</p><p class="game-ui-tooltip-passive"><strong>Estado após aprimorar (nível completo)</strong></p>${fx}</div>`;
}

/** Outro herói (slot de party) já tem esta peça: mesmo tipo + bioma (uso único global). */
export function forgeKindBiomeHeldByOtherHero(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): boolean {
  for (let hi = 0; hi < 3; hi++) {
    if (hi === heroSlotIndex) continue;
    const L = meta.forgeByHeroSlot[hi as 0 | 1 | 2];
    if (getForgeLevel(L, kind, biome) != null) return true;
  }
  return false;
}

export function forgeTryCraftOrUpgrade(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): boolean {
  const s = meta.forgeByHeroSlot;
  if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) {
    meta.forgeByHeroSlot = snapshotForgeByHeroSlotForPersistence(s);
  }
  const loadout = meta.forgeByHeroSlot[heroSlotIndex];
  if (!loadout || typeof loadout !== "object") return false;
  const curLv = getForgeLevel(loadout, kind, biome);
  if (curLv == null) {
    if (forgeKindBiomeHeldByOtherHero(meta, heroSlotIndex, kind, biome))
      return false;
    if ((meta.essences[biome] ?? 0) < FORGE_COST_CREATE) return false;
    meta.essences[biome] = (meta.essences[biome] ?? 0) - FORGE_COST_CREATE;
    setForgeLevel(loadout, kind, biome, 1);
    setEquippedBiome(loadout, kind, biome);
    return true;
  }
  if (curLv >= 3) return false;
  const cost =
    curLv === 1 ? FORGE_COST_UPGRADE_TO_2 : FORGE_COST_UPGRADE_TO_3;
  if ((meta.essences[biome] ?? 0) < cost) return false;
  meta.essences[biome] = (meta.essences[biome] ?? 0) - cost;
  setForgeLevel(loadout, kind, biome, (curLv + 1) as 2 | 3);
  setEquippedBiome(loadout, kind, biome);
  return true;
}
