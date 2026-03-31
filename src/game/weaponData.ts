import type { HeroClassId, WeaponLevel } from "./types";

/** Cristais por passo 1→2 … 4→5 (último degrau 30 💎). */
const WEAPON_UPGRADE_CRYSTAL_BY_LEVEL: readonly number[] = [
  10, 15, 20, 30,
];

export function weaponUpgradeCrystalCost(
  currentLevel: WeaponLevel,
): number | null {
  if (currentLevel < 1 || currentLevel >= 5) return null;
  return WEAPON_UPGRADE_CRYSTAL_BY_LEVEL[currentLevel - 1] ?? null;
}

export function normalizeWeaponLevel(n: unknown): WeaponLevel {
  const x = typeof n === "number" ? Math.floor(n) : 1;
  if (x < 1) return 1;
  if (x > 5) return 5;
  return x as WeaponLevel;
}

function idx(level: WeaponLevel): number {
  return level - 1;
}

/** +25% potencial cura/escudo base + +25% a cada 10 níveis do herói (pontos percentuais). */
export function priestPassivePotencialPoints(heroLevel: number): number {
  return 25 + 25 * Math.floor(Math.max(1, heroLevel) / 10);
}

/** +2 dano por acerto na wave, × (1 + floor(nível/10)). */
export function pistoleiroPassiveBonusPerProc(heroLevel: number): number {
  return 2 * (1 + Math.floor(Math.max(1, heroLevel) / 10));
}

/** +5 PV máx e atual por vitória no duelo, × (1 + floor(nível/10)) por vitória. */
export function gladiadorDuelHpPerWin(heroLevel: number): number {
  return 5 * (1 + Math.floor(Math.max(1, heroLevel) / 10));
}

// --- Sacerdotisa Sentença ---
const SENT_MANA = [3, 2, 2, 1, 1] as const;
const SENT_CDR = [2, 2, 2, 1, 0] as const;
const SENT_DMG_PCT = [0.85, 1, 1.25, 1.75, 2.5] as const;
const SENT_HEAL_PCT = [0.5, 0.6, 0.75, 0.9, 1.2] as const;
const SENT_SHIELD_OVERFLOW = [0.5, 0.55, 0.6, 0.7, 0.75] as const;

export function sentencaManaCost(w: WeaponLevel): number {
  return SENT_MANA[idx(w)] ?? 3;
}
export function sentencaCooldownWaves(w: WeaponLevel): number {
  return SENT_CDR[idx(w)] ?? 2;
}
export function sentencaDamageMult(w: WeaponLevel): number {
  return SENT_DMG_PCT[idx(w)] ?? 0.85;
}
export function sentencaHealMult(w: WeaponLevel): number {
  return SENT_HEAL_PCT[idx(w)] ?? 0.5;
}
export function sentencaShieldOverflowRatio(w: WeaponLevel): number {
  return SENT_SHIELD_OVERFLOW[idx(w)] ?? 0.5;
}

// --- Paraíso na terra ---
/** Base 10×5 vs original; multiplicador de mana 2× o anterior em cada evolução. */
const PAR_SHIELD_FLAT = [50, 125, 250, 650, 1250] as const;
const PAR_MANA_MULT = [2, 2.5, 3, 4, 5] as const;
const PAR_REGEN = [10, 15, 25, 40, 60] as const;
const PAR_REGEN_TURNS = [3, 3, 4, 4, 5] as const;

export function paraisoShieldFlat(w: WeaponLevel): number {
  return PAR_SHIELD_FLAT[idx(w)] ?? 10;
}
export function paraisoManaShieldMult(w: WeaponLevel): number {
  return PAR_MANA_MULT[idx(w)] ?? 1;
}
export function paraisoRegenBonus(w: WeaponLevel): number {
  return PAR_REGEN[idx(w)] ?? 10;
}
export function paraisoRegenTurns(w: WeaponLevel): number {
  return PAR_REGEN_TURNS[idx(w)] ?? 3;
}

// --- Pistoleiro Atirar ---
const ATIRAR_CDR = [3, 3, 2, 2, 1] as const;
const ATIRAR_DMG_PCT = [0.65, 0.9, 1.3, 1.8, 2.75] as const;

export function atirarCooldownWaves(w: WeaponLevel): number {
  return ATIRAR_CDR[idx(w)] ?? 3;
}
export function atirarDamageMult(w: WeaponLevel): number {
  return ATIRAR_DMG_PCT[idx(w)] ?? 0.65;
}

// --- Furacão de balas ---
const FUR_DMG_MULT = [2, 2.5, 3, 3.5, 4] as const;
const FUR_BLEED_PCT = [0.05, 0.1, 0.15, 0.2, 0.25] as const;
const FUR_BLEED_TURNS = [4, 4, 4, 5, 5] as const;

export function furacaoDamageMult(w: WeaponLevel): number {
  return FUR_DMG_MULT[idx(w)] ?? 2;
}
export function furacaoBleedPct(w: WeaponLevel): number {
  return FUR_BLEED_PCT[idx(w)] ?? 0.05;
}
export function furacaoBleedTurns(w: WeaponLevel): number {
  return FUR_BLEED_TURNS[idx(w)] ?? 4;
}

// --- Gladiador Até a morte ---
const DUEL_CDR = [2, 2, 1, 1, 0] as const;
const DUEL_DMG_MULT = [1.2, 1.4, 1.6, 1.8, 2] as const;

export function ateMorteManaCost(_w: WeaponLevel): number {
  return 1;
}
export function ateMorteCooldownWaves(w: WeaponLevel): number {
  return DUEL_CDR[idx(w)] ?? 2;
}
export function ateMorteDamageMult(w: WeaponLevel): number {
  return DUEL_DMG_MULT[idx(w)] ?? 1.2;
}

// --- Pisotear (durante Fúria do gigante) ---
const PISO_MANA = [2, 2, 2, 1, 1] as const;
const PISO_CDR = [3, 2, 2, 1, 0] as const;
const PISO_RANGE = [1, 1, 2, 2, 3] as const;
const PISO_DMG_MULT = [1, 2, 3, 4, 5] as const;

export function pisotearManaCost(w: WeaponLevel): number {
  return PISO_MANA[idx(w)] ?? 2;
}
export function pisotearCooldownWaves(w: WeaponLevel): number {
  return PISO_CDR[idx(w)] ?? 3;
}
export function pisotearMaxHexDistance(w: WeaponLevel): number {
  return PISO_RANGE[idx(w)] ?? 1;
}
export function pisotearDamageMult(w: WeaponLevel): number {
  return PISO_DMG_MULT[idx(w)] ?? 1;
}

/** Pontos necessários (soma de PV curados + escudo gerado pelas curas da sacerdotisa) para a ultimate da arma. */
export const WEAPON_ULT_HEAL_THRESHOLD_SACERDOTISA = 30;
export const WEAPON_ULT_DAMAGE_HITS_PISTOLEIRO = 18;
export const WEAPON_ULT_DAMAGE_TAKEN_GLADIADOR = 100;

export function weaponUltThreshold(cls: HeroClassId): number {
  if (cls === "sacerdotisa") return WEAPON_ULT_HEAL_THRESHOLD_SACERDOTISA;
  if (cls === "pistoleiro") return WEAPON_ULT_DAMAGE_HITS_PISTOLEIRO;
  return WEAPON_ULT_DAMAGE_TAKEN_GLADIADOR;
}
