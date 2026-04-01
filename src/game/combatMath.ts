import type { BiomeId } from "./types";
import type { Unit } from "./types";

export interface DamageContext {
  attackerBiome: BiomeId;
  defenderBiome: BiomeId;
  /** Atacante em rochoso: +100% ao multiplicador de dano crítico */
  rochosoCritBonus?: boolean;
}

export function rollCrit(chancePercent: number): boolean {
  return Math.random() * 100 < chancePercent;
}

/**
 * Dano base após defesa com retornos decrescentes por "centenas":
 * 0..100 defesa => 0..50% redução
 * 101..200 defesa => 50..75% redução
 * 201..300 defesa => 75..87.5% redução
 * ... indefinidamente (cada faixa de 100 agrega metade da anterior).
 *
 * Penetração > 0 reduz defesa efetiva.
 * Penetração <= 0 aumenta defesa efetiva (mesmo comportamento legado).
 */
export function effectiveDefenseForMitigation(
  defense: number,
  penetration: number,
): number {
  let effDef = Math.floor(defense - Math.max(0, penetration));
  if (penetration <= 0) {
    effDef = Math.floor(effDef - penetration);
  }
  return Math.max(0, Math.floor(effDef));
}

/** Fração do dano bruto bloqueada (0..~1) após defesa e penetração. */
export function damageReductionFractionFromDefense(
  defense: number,
  penetration: number,
): number {
  const effDef = effectiveDefenseForMitigation(defense, penetration);
  const block = Math.floor(effDef / 100);
  const rem = Math.floor(effDef % 100);
  const baseReduction = 1 - Math.pow(0.5, block);
  const gainThisBlock = Math.pow(0.5, block + 1);
  return Math.min(
    0.999999,
    baseReduction + (rem / 100) * gainThisBlock,
  );
}

/** Percentual de redução do dano recebido (0–100), mesmo modelo que `computeMitigatedDamage`. */
export function damageReductionPercentFromDefense(
  defense: number,
  penetration: number,
): number {
  return damageReductionFractionFromDefense(defense, penetration) * 100;
}

export function computeMitigatedDamage(
  rawDamage: number,
  defense: number,
  penetration: number,
): number {
  const raw = Math.floor(rawDamage);
  const reduction = damageReductionFractionFromDefense(defense, penetration);
  const mitigated = Math.floor(raw * (1 - reduction));
  return Math.max(1, mitigated);
}

export function applyCritMultiplier(
  mitigated: number,
  critDamageMult: number,
  isCrit: boolean,
  rochosoBonus: boolean,
): number {
  if (!isCrit) return mitigated;
  let m = critDamageMult;
  if (rochosoBonus) m += 1;
  return Math.max(1, Math.floor(mitigated * m));
}

/** Com `ignoreBiomeEffects` (ex.: artefato ruler), defesa não é alterada pelo bioma. */
export function effectiveDefenseForBiome(
  base: number,
  biome: BiomeId,
  ignoreBiomeEffects = false,
): number {
  if (ignoreBiomeEffects) return base;
  if (biome === "montanhoso") return Math.floor(base * 1.5);
  return base;
}

/** Com `ignoreBiomeEffects`, alcance não recebe bônus/penalidade de bioma. */
export function effectiveAlcanceForBiome(
  base: number,
  biome: BiomeId,
  ignoreBiomeEffects = false,
  opts?: { suppressForestEnemyBonus?: boolean },
): number {
  if (ignoreBiomeEffects) return base;
  if (biome === "floresta") {
    if (opts?.suppressForestEnemyBonus) return base;
    return base + 1;
  }
  return base;
}

/**
 * Pontos de movimento do turno = `base` (+ bônus ruler na GameModel).
 * No **pântano**, cada hex **entrado** custa 2 pontos (ver `movementStepEnterCost` em pathfinding).
 */
export function effectiveMovimentoForBiome(base: number, _biome: BiomeId): number {
  return base;
}

/**
 * Custo para entrar num hex: pântano gasta o dobro (mobilidade −50%), salvo
 * ruler (`ignoreTerrain` no pathfinding) ou sinergia forja pântano nv1+.
 */
export function movementStepEnterCost(
  toCell: { biome: BiomeId },
  ignorePantanoPenalty = false,
): number {
  if (toCell.biome === "pantano") return ignorePantanoPenalty ? 1 : 2;
  return 1;
}

export function biomeVolcanicDamage(): number {
  return 10;
}

/**
 * Artefato ruler: ignora penalidades de bioma em combate (defesa, alcance, regen, movimento no pântano,
 * deserto, rochoso, etc.) e o dano ambiental do vulcânico no fim do turno.
 */
export function unitIgnoresTerrain(u: Unit): boolean {
  return (u.artifacts["ruler"] ?? 0) > 0;
}

export function rulerMovementBonus(u: Unit): number {
  return u.artifacts["ruler"] ?? 0;
}
