import { axialKey } from "./hex";
import { HEROES } from "./data/heroes";
import type { EnemyArchetype } from "./data/enemies";
import {
  cumulativeKillXpRawThroughWave,
  partyScaleMultiplier,
  waveMultiplier,
  XP_PACING_DEFAULT_BIOME_COUNT,
  XP_TARGET_TOTAL_LEVEL_60,
} from "./data/enemies";
import type {
  BiomeId,
  ForgeHeroLoadout,
  HeroClassId,
  HeroStatBaseline,
  MetaProgress,
  TeamColor,
  Unit,
  WeaponLevel,
} from "./types";
import { priestPassivePotencialPoints } from "./weaponData";
import { applyForgeGearToUnit } from "./forge";
import { applyPartyBonusToUnit, computePartyBonus } from "./colorSynergy";
import { permPercent } from "./metaStore";

let uid = 1;
function nid(prefix: string): string {
  return `${prefix}-${uid++}`;
}

function metaPct(level: number): number {
  return permPercent(level) / 100;
}

export function applyMetaToBaseStats(
  h: {
    maxHp: number;
    dano: number;
    defesa: number;
    potencialCuraEscudo: number;
  },
  meta: MetaProgress,
): typeof h {
  return {
    maxHp: Math.round(h.maxHp * (1 + metaPct(meta.permHp))),
    dano: Math.round(h.dano * (1 + metaPct(meta.permDamage))),
    defesa: Math.round(h.defesa * (1 + metaPct(meta.permDef))),
    potencialCuraEscudo: h.potencialCuraEscudo * (1 + metaPct(meta.permHealShield)),
  };
}

export function createHeroUnit(
  cls: HeroClassId,
  teamColor: TeamColor,
  partyColors: TeamColor[],
  meta: MetaProgress,
  startQ: number,
  startR: number,
  forgeLoadout?: ForgeHeroLoadout,
  weaponLevel: WeaponLevel = 1,
): Unit {
  const t = HEROES[cls];
  const mb = applyMetaToBaseStats(
    {
      maxHp: t.maxHp,
      dano: t.dano,
      defesa: t.defesa,
      potencialCuraEscudo: 0,
    },
    meta,
  );
  const bonus = computePartyBonus(partyColors);
  const baseSorte =
    cls === "gladiador" ? 5 : cls === "pistoleiro" ? 3 : 10;

  const u: Unit = {
    id: nid("hero"),
    name: t.name,
    isPlayer: true,
    heroClass: cls,
    teamColor,
    q: startQ,
    r: startR,
    flying: false,
    immobileThisTurn: false,
    shieldGGBlue: 0,
    goldDrainReduction: cls === "sacerdotisa" ? 1 : 0,
    bunkerReentryBlocked: false,
    ouro: Math.round(100 * (1 + permPercent(meta.permGold) / 100)),
    ouroWave: 0,
    level: 1,
    xp: 0,
    xpToNext: xpCurve(1),
    artifacts: {},
    skillCd: {},
    formaFinal: false,
    pistoleiroBonusDanoWave: 0,
    gladiadorKills: 0,
    curandeiroDanoWave: 0,
    duroPedraDefStacks: 0,
    motorMorteNextBasicPct: 0,
    poison: undefined,
    hot: undefined,
    bleed: undefined,
    weaponLevel,
    weaponUltMeter: 0,
    displayColor: 0xffffff,
    maxHp: mb.maxHp,
    hp: mb.maxHp,
    maxMana: t.maxMana,
    mana: t.maxMana,
    movimento: t.movimento,
    dano: mb.dano,
    defesa: mb.defesa,
    acertoCritico:
      cls === "sacerdotisa" ? 0 : cls === "gladiador" ? 10 : 25,
    danoCritico:
      cls === "sacerdotisa" ? 1.5 : cls === "gladiador" ? 1.75 : 2,
    penetracao: 0,
    penetracaoEscudo: 0,
    regenVida: t.regenVida,
    regenMana: t.regenMana,
    alcance: t.alcance,
    lifesteal: 0,
    potencialCuraEscudo: mb.potencialCuraEscudo,
    sorte: baseSorte,
  };

  applyPartyBonusToUnit(u, bonus);
  applyForgeGearToUnit(u, forgeLoadout ?? {});
  if (cls === "sacerdotisa") {
    const pp = priestPassivePotencialPoints(u.level);
    u.potencialCuraEscudo += pp;
    u.priestPassivePotencialSnapshot = pp;
  }
  if (cls === "gladiador") {
    u.gladiadorDuelWins = 0;
    u.gladiadorDuelHpGranted = 0;
  }

  const xpBonus = metaPct(meta.permXp);
  if (xpBonus > 0) {
    u.artifacts["_meta_xp"] = Math.round(xpBonus * 100);
  }

  const b: HeroStatBaseline = {
    level: u.level,
    maxHp: u.maxHp,
    maxMana: u.maxMana,
    dano: u.dano,
    defesa: u.defesa,
    acertoCritico: u.acertoCritico,
    danoCritico: u.danoCritico,
    penetracao: u.penetracao,
    penetracaoEscudo: u.penetracaoEscudo,
    regenVida: u.regenVida,
    regenMana: u.regenMana,
    movimento: u.movimento,
    alcance: u.alcance,
    lifesteal: u.lifesteal,
    potencialCuraEscudo: u.potencialCuraEscudo,
    sorte: u.sorte,
    goldDrainReduction: u.goldDrainReduction,
    /** Ignora gasto da loja inicial para não mostrar delta negativo na bolsa. */
    ouro: 0,
    ouroWave: u.ouroWave,
    shieldGGBlue: u.shieldGGBlue,
    flying: u.flying,
    artifacts: { ...u.artifacts },
  };
  u.statBaseline = b;

  return u;
}

const XP_TOTAL_LEVEL_100 = Math.round(
  (XP_TARGET_TOTAL_LEVEL_60 *
    cumulativeKillXpRawThroughWave(75, 1, XP_PACING_DEFAULT_BIOME_COUNT)) /
    cumulativeKillXpRawThroughWave(50, 1, XP_PACING_DEFAULT_BIOME_COUNT),
);

/**
 * XP total acumulado para **estar** no nível `targetLevel` (nível 1 = 0).
 * Calibrado: sem bônus de XP, ~nível 60 ao fim da wave 50 e ~100 ao fim da 75 (100 ondas).
 */
export function totalXpToReachLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  const t60 = XP_TARGET_TOTAL_LEVEL_60;
  const t100 = XP_TOTAL_LEVEL_100;
  if (targetLevel <= 60) {
    return Math.floor((t60 * (targetLevel - 1)) / 59);
  }
  if (targetLevel <= 100) {
    return (
      t60 +
      Math.floor(((t100 - t60) * (targetLevel - 60)) / 40)
    );
  }
  const per = (t100 - t60) / 40;
  return t100 + Math.floor(per * (targetLevel - 100));
}

/** XP para subir do nível atual `level` para o próximo. */
export function xpCurve(level: number): number {
  return Math.max(
    1,
    totalXpToReachLevel(level + 1) - totalXpToReachLevel(level),
  );
}

function displayColorForEnemy(arch: EnemyArchetype): number {
  if (arch.displayColor != null) return arch.displayColor;
  switch (arch.tier) {
    case "emperor":
      return 0xffd700;
    case "boss":
      return 0x7b1fa2;
    case "elite":
      return 0xc62828;
    default:
      return arch.id === "escravo" ? 0x9e7b65 : 0xff6f3c;
  }
}

export function createEnemyUnit(
  arch: EnemyArchetype,
  wave: number,
  partySize: number,
  q: number,
  r: number,
  spawnBiome: BiomeId,
): Unit {
  const wm = waveMultiplier(wave);
  const pm = partyScaleMultiplier(partySize);
  const mult = wm * pm;
  const hp = Math.round(arch.baseHp * mult);
  const dano = Math.round(arch.baseDano * mult);
  const def = Math.round(arch.baseDefesa * mult);
  const guaranteeCrystal = arch.tier === "elite";
  return {
    id: nid("enemy"),
    name: arch.name,
    isPlayer: false,
    enemyArchetypeId: arch.id,
    enemySpawnBiome: spawnBiome,
    enemyXpReward: arch.xpReward,
    enemyGoldReward: 0,
    enemyCrystalBase: arch.crystalDropChance,
    enemyGuaranteeCrystal: guaranteeCrystal,
    enemyGrantsBossEssence: arch.grantsBossEssence ?? false,
    enemyAttackKind: arch.attackKind ?? "single",
    q,
    r,
    flying: arch.flying ?? false,
    immobileThisTurn: false,
    shieldGGBlue: 0,
    goldDrainReduction: 0,
    ouro: 0,
    ouroWave: 0,
    level: 1,
    xp: 0,
    xpToNext: 999,
    artifacts: {},
    skillCd: {},
    formaFinal: false,
    pistoleiroBonusDanoWave: 0,
    gladiadorKills: 0,
    curandeiroDanoWave: 0,
    duroPedraDefStacks: 0,
    motorMorteNextBasicPct: 0,
    displayColor: displayColorForEnemy(arch),
    maxHp: hp,
    hp,
    maxMana: 0,
    mana: 0,
    movimento: arch.movimento + 2,
    dano,
    defesa: def,
    acertoCritico: 8,
    danoCritico: 1.45,
    penetracao: 0,
    penetracaoEscudo: 0,
    regenVida: 0,
    regenMana: 0,
    alcance: arch.alcance,
    lifesteal: 0,
    potencialCuraEscudo: 0,
    sorte: 0,
    poison: undefined,
    hot: undefined,
    bleed: undefined,
    weaponLevel: 1,
    weaponUltMeter: 0,
  };
}

export function biomeAt(
  grid: Map<string, { biome: string }>,
  q: number,
  r: number,
): string {
  return grid.get(axialKey(q, r))?.biome ?? "hub";
}
