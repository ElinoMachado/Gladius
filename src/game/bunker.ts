/** Estado do bunker na arena (um por run). */
export interface BunkerState {
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  defesa: number;
  /** 0 = base, 1 = 1ª evolução, 2 = 2ª evolução */
  tier: 0 | 1 | 2;
  /** Herói dentro do bunker (mesmo hex). */
  occupantId: string | null;
}

export const BUNKER_EVOLVE_COSTS: [number, number] = [300, 500];

/**
 * Multiplicador de dano recebido pelo bunker (após mitigação), só inimigos → ocupante.
 * Primeiras waves ficam mais perigosas; upgrades de tier compensam com PV/defesa.
 */
export const BUNKER_DAMAGE_TAKEN_MULT = 1.1;

/** Nível de exibição (1–3) em UI; `tier` interno é 0–2. */
export function bunkerDisplayLevel(tier: 0 | 1 | 2): number {
  return tier + 1;
}

/** Tiro preciso exige tier 2 (= bunker nv. 3 na UI). */
export const BUNKER_TIRO_MIN_TIER = 2 as const;

export function bunkerStatsForTier(tier: 0 | 1 | 2): { maxHp: number; defesa: number } {
  if (tier >= 2) return { maxHp: 1650, defesa: 300 };
  if (tier >= 1) return { maxHp: 480, defesa: 150 };
  return { maxHp: 140, defesa: 75 };
}

/** Multiplicador de dano do herói nas minas. */
export function bunkerMinasDamageMult(tier: 0 | 1 | 2): number {
  if (tier >= 2) return 5;
  if (tier >= 1) return 2.5;
  return 1.5;
}

/** Alcance em anéis (1 = só adjacentes ao bunker). */
export function bunkerMinasMaxRing(tier: 0 | 1 | 2): number {
  if (tier >= 2) return 3;
  if (tier >= 1) return 2;
  return 1;
}

export function bunkerMinasCooldownWaves(tier: 0 | 1 | 2): number {
  return tier >= 2 ? 1 : 2;
}

export function bunkerTiroCooldownWaves(): number {
  return 3;
}

export function describeBunkerMinasTier(tier: 0 | 1 | 2): string {
  const mult = bunkerMinasDamageMult(tier);
  const ring = bunkerMinasMaxRing(tier);
  const cd = bunkerMinasCooldownWaves(tier);
  return `Dano ×${mult} · anéis até ${ring} · CD ${cd} onda(s)`;
}

export function describeBunkerTiroTier(): string {
  return `Projétil em arco · CD ${bunkerTiroCooldownWaves()} onda(s)`;
}

export function createInitialBunkerState(q: number, r: number): BunkerState {
  const { maxHp, defesa } = bunkerStatsForTier(0);
  return {
    q,
    r,
    hp: maxHp,
    maxHp,
    defesa,
    tier: 0,
    occupantId: null,
  };
}
