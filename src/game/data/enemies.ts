import type { WaveConfig } from "../types";

/** Vitória da run ao limpar esta wave (100 ondas no total). */
export const FINAL_VICTORY_WAVE = 100;

export const XP_TARGET_TOTAL_LEVEL_60 = 2000;
export const XP_PACING_DEFAULT_BIOME_COUNT = 3;

export type EnemyTier = "grunt" | "elite" | "boss" | "emperor";
export type EnemyAttackKind = "single" | "aoe1";

export interface EnemyArchetype {
  id: string;
  name: string;
  tier: EnemyTier;
  baseHp: number;
  baseDano: number;
  baseDefesa: number;
  movimento: number;
  alcance: number;
  xpReward: number;
  goldReward: number;
  crystalDropChance: number;
  /** Ondas em que este tipo pode aparecer no spawn aleatório (exceto bossWaveOnly). */
  firstWave: number;
  lastWave?: number;
  /** Se definido, só aparece nesta onda (chefe de marco). */
  bossWaveOnly?: number;
  /** Chefe de marco 20/40/60/80: garante ≥1 essência do bioma do assassino. */
  grantsBossEssence?: boolean;
  flying?: boolean;
  attackKind?: EnemyAttackKind;
  displayColor?: number;
  /** Peso relativo no pool de spawn (padrão 1). */
  weight?: number;
  /** Texto curto para o compendium (opcional). */
  compendiumTag?: string;
}

/** XP médio usado só para calibrar pacing (spawn misto). */
const PACING_GRUNT_XP = 16;
const PACING_ELITE_XP = 54;

export function pacingBossXp(wave: number): number {
  switch (wave) {
    case 20:
      return 200;
    case 40:
      return 235;
    case 60:
      return 270;
    case 80:
      return 305;
    case 100:
      return 420;
    default:
      return 200;
  }
}

const _catalog: EnemyArchetype[] = [
  {
    id: "escravo",
    name: "Escravo",
    tier: "grunt",
    baseHp: 18,
    baseDano: 3,
    baseDefesa: 0,
    movimento: 5,
    alcance: 1,
    xpReward: 44,
    goldReward: 12,
    crystalDropChance: 0.05,
    firstWave: 1,
    lastWave: 1,
    weight: 1,
    compendiumTag: "Introdução",
  },
  {
    id: "gladinio",
    name: "Gladiador inimigo",
    tier: "grunt",
    baseHp: 40,
    baseDano: 5,
    baseDefesa: 1,
    movimento: 4,
    alcance: 1,
    xpReward: 15,
    goldReward: 18,
    crystalDropChance: 0.08,
    firstWave: 2,
    weight: 4,
  },
  {
    id: "leao_selvagem",
    name: "Leão da arena",
    tier: "grunt",
    baseHp: 48,
    baseDano: 6,
    baseDefesa: 1,
    movimento: 5,
    alcance: 1,
    xpReward: 18,
    goldReward: 20,
    crystalDropChance: 0.08,
    firstWave: 5,
    weight: 2,
    compendiumTag: "Besta",
  },
  {
    id: "cobra_imperial",
    name: "Cobra imperial",
    tier: "grunt",
    baseHp: 38,
    baseDano: 7,
    baseDefesa: 0,
    movimento: 4,
    alcance: 1,
    xpReward: 16,
    goldReward: 16,
    crystalDropChance: 0.09,
    firstWave: 8,
    weight: 2,
    compendiumTag: "Besta",
  },
  {
    id: "aranha_ruinosa",
    name: "Aranha gigante",
    tier: "grunt",
    baseHp: 42,
    baseDano: 6,
    baseDefesa: 2,
    movimento: 4,
    alcance: 1,
    xpReward: 17,
    goldReward: 18,
    crystalDropChance: 0.08,
    firstWave: 10,
    weight: 2,
    compendiumTag: "Besta",
  },
  {
    id: "cultista_cinzas",
    name: "Cultista das cinzas",
    tier: "grunt",
    baseHp: 36,
    baseDano: 5,
    baseDefesa: 0,
    movimento: 4,
    alcance: 2,
    xpReward: 16,
    goldReward: 14,
    crystalDropChance: 0.07,
    firstWave: 12,
    weight: 2,
    attackKind: "aoe1",
    compendiumTag: "Mago (área)",
  },
  {
    id: "fera_voraz",
    name: "Fera voraz",
    tier: "grunt",
    baseHp: 52,
    baseDano: 7,
    baseDefesa: 2,
    movimento: 5,
    alcance: 1,
    xpReward: 19,
    goldReward: 22,
    crystalDropChance: 0.09,
    firstWave: 15,
    weight: 2,
    compendiumTag: "Besta",
  },
  {
    id: "batedor_montado",
    name: "Batedor montado",
    tier: "grunt",
    baseHp: 44,
    baseDano: 5,
    baseDefesa: 1,
    movimento: 6,
    alcance: 2,
    xpReward: 17,
    goldReward: 20,
    crystalDropChance: 0.08,
    firstWave: 18,
    weight: 2,
  },
  {
    id: "dragao_filhote",
    name: "Filhote de dragão",
    tier: "grunt",
    baseHp: 70,
    baseDano: 9,
    baseDefesa: 3,
    movimento: 3,
    alcance: 2,
    xpReward: 28,
    goldReward: 30,
    crystalDropChance: 0.12,
    firstWave: 20,
    lastWave: 74,
    flying: true,
    weight: 2,
    compendiumTag: "Dragão (fraco)",
  },
  {
    id: "gargula_petrea",
    name: "Gárgula petrificada",
    tier: "grunt",
    baseHp: 46,
    baseDano: 6,
    baseDefesa: 3,
    movimento: 4,
    alcance: 1,
    xpReward: 18,
    goldReward: 18,
    crystalDropChance: 0.09,
    firstWave: 50,
    flying: true,
    weight: 2,
    compendiumTag: "Voador",
  },
  {
    id: "ogro_esmagador",
    name: "Ogro esmagador",
    tier: "elite",
    baseHp: 130,
    baseDano: 14,
    baseDefesa: 5,
    movimento: 3,
    alcance: 1,
    xpReward: 52,
    goldReward: 50,
    crystalDropChance: 0.35,
    firstWave: 5,
    weight: 2,
  },
  {
    id: "atirador_elite",
    name: "Atirador de elite",
    tier: "elite",
    baseHp: 95,
    baseDano: 24,
    baseDefesa: 2,
    movimento: 4,
    alcance: 5,
    xpReward: 55,
    goldReward: 45,
    crystalDropChance: 0.35,
    firstWave: 10,
    weight: 2,
    compendiumTag: "Atirador",
  },
  {
    id: "mago_vazio",
    name: "Mago do vazio",
    tier: "elite",
    baseHp: 88,
    baseDano: 11,
    baseDefesa: 2,
    movimento: 3,
    alcance: 3,
    xpReward: 54,
    goldReward: 42,
    crystalDropChance: 0.35,
    firstWave: 15,
    weight: 2,
    attackKind: "aoe1",
    compendiumTag: "Mago (área)",
  },
  {
    id: "general_brigada",
    name: "General de brigada",
    tier: "elite",
    baseHp: 115,
    baseDano: 15,
    baseDefesa: 5,
    movimento: 3,
    alcance: 2,
    xpReward: 58,
    goldReward: 52,
    crystalDropChance: 0.35,
    firstWave: 25,
    weight: 2,
  },
  {
    id: "elemental_tormenta",
    name: "Elemental da tormenta",
    tier: "elite",
    baseHp: 90,
    baseDano: 13,
    baseDefesa: 2,
    movimento: 4,
    alcance: 2,
    xpReward: 56,
    goldReward: 44,
    crystalDropChance: 0.35,
    firstWave: 28,
    weight: 2,
    attackKind: "aoe1",
    compendiumTag: "Mago (área)",
  },
  {
    id: "corruptor_abissal",
    name: "Corruptor abissal",
    tier: "elite",
    baseHp: 105,
    baseDano: 14,
    baseDefesa: 4,
    movimento: 4,
    alcance: 2,
    xpReward: 57,
    goldReward: 48,
    crystalDropChance: 0.35,
    firstWave: 35,
    weight: 2,
  },
  {
    id: "harpia_ceifadora",
    name: "Harpia ceifadora",
    tier: "elite",
    baseHp: 85,
    baseDano: 13,
    baseDefesa: 2,
    movimento: 6,
    alcance: 1,
    xpReward: 55,
    goldReward: 46,
    crystalDropChance: 0.35,
    firstWave: 50,
    flying: true,
    weight: 2,
    compendiumTag: "Voador",
  },
  {
    id: "serpente_alada",
    name: "Serpente alada",
    tier: "elite",
    baseHp: 92,
    baseDano: 12,
    baseDefesa: 3,
    movimento: 5,
    alcance: 2,
    xpReward: 56,
    goldReward: 48,
    crystalDropChance: 0.35,
    firstWave: 55,
    flying: true,
    weight: 2,
    compendiumTag: "Voador",
  },
  {
    id: "dragao_antigo",
    name: "Dragão antigo",
    tier: "elite",
    baseHp: 185,
    baseDano: 21,
    baseDefesa: 6,
    movimento: 4,
    alcance: 3,
    xpReward: 95,
    goldReward: 90,
    crystalDropChance: 0.45,
    firstWave: 75,
    flying: true,
    weight: 2,
    attackKind: "aoe1",
    compendiumTag: "Dragão (poderoso)",
  },
  {
    id: "boss_sentinela_bronze",
    name: "Sentinela de bronze",
    tier: "boss",
    baseHp: 400,
    baseDano: 22,
    baseDefesa: 8,
    movimento: 3,
    alcance: 2,
    xpReward: 200,
    goldReward: 220,
    crystalDropChance: 1,
    firstWave: 20,
    lastWave: 20,
    bossWaveOnly: 20,
    grantsBossEssence: true,
    displayColor: 0x8d6e63,
  },
  {
    id: "boss_carrasco_legiao",
    name: "Carrasco da legião",
    tier: "boss",
    baseHp: 480,
    baseDano: 26,
    baseDefesa: 9,
    movimento: 3,
    alcance: 2,
    xpReward: 235,
    goldReward: 260,
    crystalDropChance: 1,
    firstWave: 40,
    lastWave: 40,
    bossWaveOnly: 40,
    grantsBossEssence: true,
    displayColor: 0xb71c1c,
  },
  {
    id: "boss_general_negra",
    name: "General da legião negra",
    tier: "boss",
    baseHp: 560,
    baseDano: 30,
    baseDefesa: 10,
    movimento: 3,
    alcance: 2,
    xpReward: 270,
    goldReward: 300,
    crystalDropChance: 1,
    firstWave: 60,
    lastWave: 60,
    bossWaveOnly: 60,
    grantsBossEssence: true,
    attackKind: "aoe1",
    displayColor: 0x37474f,
  },
  {
    id: "boss_tita_cerco",
    name: "Titã de cerco",
    tier: "boss",
    baseHp: 650,
    baseDano: 34,
    baseDefesa: 12,
    movimento: 3,
    alcance: 3,
    xpReward: 305,
    goldReward: 340,
    crystalDropChance: 1,
    firstWave: 80,
    lastWave: 80,
    bossWaveOnly: 80,
    grantsBossEssence: true,
    attackKind: "aoe1",
    displayColor: 0x5d4037,
  },
  {
    id: "imperador_supremo",
    name: "O Imperador",
    tier: "emperor",
    baseHp: 920,
    baseDano: 42,
    baseDefesa: 14,
    movimento: 3,
    alcance: 3,
    xpReward: 420,
    goldReward: 520,
    crystalDropChance: 1,
    firstWave: 100,
    lastWave: 100,
    bossWaveOnly: 100,
    grantsBossEssence: true,
    attackKind: "aoe1",
    displayColor: 0xffd700,
  },
];

export const ENEMY_CATALOG: readonly EnemyArchetype[] = _catalog;

export const ENEMY_BY_ID: Record<string, EnemyArchetype> = Object.fromEntries(
  _catalog.map((e) => [e.id, e]),
);

/** @deprecated Use ENEMY_BY_ID["gladinio"] ou pickGruntForWave. */
export const GRUNT = ENEMY_BY_ID["gladinio"]!;
/** @deprecated */
export const ELITE = ENEMY_BY_ID["ogro_esmagador"]!;
/** @deprecated */
export const BOSS = ENEMY_BY_ID["boss_sentinela_bronze"]!;
export const ESCRAVO = ENEMY_BY_ID["escravo"]!;

export function getEnemyArchetype(id: string | undefined): EnemyArchetype | undefined {
  if (!id) return undefined;
  return ENEMY_BY_ID[id];
}

export function enemyTierFromId(id: string | undefined): EnemyTier {
  return getEnemyArchetype(id)?.tier ?? "grunt";
}

export function enemyIsBossLikeId(id: string | undefined): boolean {
  const t = enemyTierFromId(id);
  return t === "boss" || t === "emperor";
}

export function enemyIsEliteId(id: string | undefined): boolean {
  return enemyTierFromId(id) === "elite";
}

function weightedPick(pool: EnemyArchetype[]): EnemyArchetype {
  const w = pool.map((e) => e.weight ?? 1);
  let sum = 0;
  for (const x of w) sum += x;
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i]!;
    if (r <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

function inRandomSpawnWindow(e: EnemyArchetype, wave: number): boolean {
  if (e.bossWaveOnly != null) return false;
  if (wave < e.firstWave) return false;
  if (e.lastWave != null && wave > e.lastWave) return false;
  return true;
}

export function pickGruntForWave(wave: number): EnemyArchetype {
  const pool = _catalog.filter(
    (e) => e.tier === "grunt" && inRandomSpawnWindow(e, wave),
  );
  return pool.length ? weightedPick(pool) : ENEMY_BY_ID["gladinio"]!;
}

export function pickEliteForWave(wave: number): EnemyArchetype {
  const pool = _catalog.filter(
    (e) => e.tier === "elite" && inRandomSpawnWindow(e, wave),
  );
  return pool.length ? weightedPick(pool) : ENEMY_BY_ID["ogro_esmagador"]!;
}

export function pickBossForWave(wave: number): EnemyArchetype {
  const b = _catalog.find((e) => e.bossWaveOnly === wave);
  return b ?? ENEMY_BY_ID["boss_sentinela_bronze"]!;
}

export function allEnemyArchetypesSorted(): EnemyArchetype[] {
  return [..._catalog].sort(
    (a, b) =>
      a.firstWave - b.firstWave ||
      (a.bossWaveOnly ?? 999) - (b.bossWaveOnly ?? 999) ||
      a.name.localeCompare(b.name),
  );
}

export function enemyAppearsInWave(e: EnemyArchetype, wave: number): boolean {
  if (e.bossWaveOnly != null) return e.bossWaveOnly === wave;
  if (wave < e.firstWave) return false;
  if (e.lastWave != null && wave > e.lastWave) return false;
  return true;
}

export function enemyWaveRangeLabel(e: EnemyArchetype): string {
  if (e.bossWaveOnly != null) return `Onda ${e.bossWaveOnly} (chefe)`;
  const hi = e.lastWave == null ? "100" : String(e.lastWave);
  return `Ondas ${e.firstWave}–${hi}`;
}

export function filterEnemiesByWaveInterval(
  list: EnemyArchetype[],
  wMin: number,
  wMax: number,
): EnemyArchetype[] {
  const lo = Math.min(wMin, wMax);
  const hi = Math.max(wMin, wMax);
  return list.filter((e) => {
    for (let w = lo; w <= hi; w++) {
      if (enemyAppearsInWave(e, w)) return true;
    }
    return false;
  });
}

export function waveMultiplier(wave: number): number {
  return 1 + (wave - 1) * 0.12;
}

export function partyScaleMultiplier(partySize: number): number {
  if (partySize <= 1) return 1;
  if (partySize === 2) return 1.35;
  return 1.75;
}

/** @deprecated Usar pickGruntForWave / pickEliteForWave / pickBossForWave. */
export function pickArchetype(cfg: WaveConfig): EnemyArchetype {
  if (cfg.isBoss) return pickBossForWave(cfg.index);
  if (cfg.isElite) return pickEliteForWave(cfg.index);
  return pickGruntForWave(cfg.index);
}

export function countEnemiesForWave(wave: number, partySize: number): number {
  const base = 2 + Math.min(6, Math.floor(wave / 2));
  const extra = partySize - 1;
  if (cfgIsBoss(wave)) return 1;
  if (cfgIsElite(wave)) return Math.min(5, base + extra);
  return base + extra;
}

function cfgIsBoss(wave: number): boolean {
  return (
    wave === 20 ||
    wave === 40 ||
    wave === 60 ||
    wave === 80 ||
    wave === FINAL_VICTORY_WAVE
  );
}

function cfgIsElite(wave: number): boolean {
  if (cfgIsBoss(wave)) return false;
  return wave % 5 === 0;
}

export function totalEnemyCountForWave(
  wave: number,
  partySize: number,
  biomeCount: number = XP_PACING_DEFAULT_BIOME_COUNT,
): number {
  const cfg = waveConfigFromIndex(wave);
  if (wave === 1 && !cfg.isBoss && !cfg.isElite) return 3 * partySize;
  if (cfg.isBoss) return 1;
  const raw = countEnemiesForWave(wave, partySize);
  if (biomeCount <= 1) return raw;
  const nEach = Math.ceil(raw / biomeCount);
  return nEach * biomeCount;
}

export function rawKillXpForWave(
  wave: number,
  partySize: number,
  biomeCount: number = XP_PACING_DEFAULT_BIOME_COUNT,
): number {
  const cfg = waveConfigFromIndex(wave);
  if (wave === 1 && !cfg.isBoss && !cfg.isElite) {
    return 3 * partySize * ESCRAVO.xpReward;
  }
  if (cfg.isBoss) return pacingBossXp(wave);
  const n = totalEnemyCountForWave(wave, partySize, biomeCount);
  const xpPer = cfg.isElite ? PACING_ELITE_XP : PACING_GRUNT_XP;
  return n * xpPer;
}

export function cumulativeKillXpRawThroughWave(
  lastWave: number,
  partySize: number,
  biomeCount: number = XP_PACING_DEFAULT_BIOME_COUNT,
): number {
  let s = 0;
  for (let w = 1; w <= lastWave; w++) {
    s += rawKillXpForWave(w, partySize, biomeCount);
  }
  return s;
}

export function killXpScaleForParty(
  partySize: number,
  biomeCount: number = XP_PACING_DEFAULT_BIOME_COUNT,
): number {
  const s50 = cumulativeKillXpRawThroughWave(50, partySize, biomeCount);
  if (s50 <= 0) return 1;
  return XP_TARGET_TOTAL_LEVEL_60 / s50;
}

export function waveConfigFromIndex(wave: number): WaveConfig {
  return {
    index: wave,
    isElite: cfgIsElite(wave),
    isBoss: cfgIsBoss(wave),
  };
}

export function enemyTierLabelPt(tier: EnemyTier): string {
  switch (tier) {
    case "elite":
      return "Elite";
    case "boss":
      return "Chefe de marco";
    case "emperor":
      return "Chefe final";
    default:
      return "Comum";
  }
}

export function enemyLootSummaryLines(e: EnemyArchetype): string[] {
  const lines: string[] = [];
  lines.push(`XP (recompensa): ${e.xpReward} (multiplicada pela escala da party na run)`);
  lines.push(`Ouro (ficha do inimigo): ${e.goldReward}`);
  const pct = Math.round(e.crystalDropChance * 1000) / 10;
  if (e.tier === "elite") {
    lines.push("Cristal: 100% garantido (elites).");
  } else {
    lines.push(
      `Cristal: chance base ${pct}% + sorte do assassino, meta, ultimate e cartas.`,
    );
  }
  if (e.grantsBossEssence) {
    lines.push(
      "Essência: pelo menos 1 do bioma do hex do herói que mata (chefe de marco / imperador).",
    );
  } else {
    lines.push(
      "Essência: chance por onda + sorte; só se o assassino estiver num bioma de combate.",
    );
  }
  if (e.flying) lines.push("Voo: atravessa biomas sem passar pelo hub.");
  if (e.attackKind === "aoe1") {
    lines.push("Ataque em área: heróis adjacentes ao alvo principal também recebem o dano.");
  }
  return lines;
}
