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
  /**
   * Compras permanentes na loja (Auto reparo): cada rank cura `BUNKER_AUTO_REPAIR_HP_PER_RANK`
   * PV do bunker após cada ciclo de turnos dos heróis (antes da fase inimiga).
   */
  autoRepairRank: number;
  /**
   * Escudo atual do Fortificar (gasto no combate). No início de cada wave repõe-se até `fortifyShieldCap`.
   */
  fortifyShield: number;
  /** Teto de escudo comprado com Fortificar (persiste entre waves; renova o valor atual cada wave). */
  fortifyShieldCap: number;
  /** Quantas vezes se comprou Fortificar nesta visita à loja da wave (máx. `BUNKER_FORTIFY_MAX_BUYS_PER_WAVE`). */
  fortifyBuysThisWave: number;
}

export const BUNKER_EVOLVE_COSTS: [number, number] = [300, 500];

export const BUNKER_AUTO_REPAIR_GOLD = 50;
export const BUNKER_AUTO_REPAIR_MAX_RANK = 10;
/** PV curados por rank após cada ciclo de turnos dos heróis. */
export const BUNKER_AUTO_REPAIR_HP_PER_RANK = 2;
/** Bunker nv. 2 em UI (= tier 1). */
export const BUNKER_AUTO_REPAIR_MIN_TIER = 1 as const;

export const BUNKER_FORTIFY_GOLD = 100;
export const BUNKER_FORTIFY_SHIELD = 100;
export const BUNKER_FORTIFY_MAX_BUYS_PER_WAVE = 5;
/** Bunker nv. 3 em UI (= tier 2). */
export const BUNKER_FORTIFY_MIN_TIER = 2 as const;

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

/**
 * Nível usado em loja/regras quando `tier` está ausente ou incoerente com `maxHp`
 * (ex.: dados antigos); infere pelo PV máximo esperado por nível.
 */
export function effectiveBunkerTier(b: BunkerState): 0 | 1 | 2 {
  const raw = b.tier;
  if (raw === 0 || raw === 1 || raw === 2) return raw;
  const st2 = bunkerStatsForTier(2).maxHp;
  const st1 = bunkerStatsForTier(1).maxHp;
  if (b.maxHp >= st2 - 2) return 2;
  if (b.maxHp >= st1 - 2) return 1;
  return 0;
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
    autoRepairRank: 0,
    fortifyShield: 0,
    fortifyShieldCap: 0,
    fortifyBuysThisWave: 0,
  };
}
