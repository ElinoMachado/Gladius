/**
 * Cinco fases narrativas de 20 ondas (run total 100 ondas — alinhado com FINAL_VICTORY_WAVE em enemies.ts).
 */

export type ColiseumTierId = 1 | 2 | 3 | 4 | 5;

/** Nível em que a escolha de forma final substitui o fluxo normal de level-up. */
export const FORMA_FINAL_LEVEL = 20;

export const COLISEUM_PHASE_WAVE_COUNT = 20;

export const COLISEUM_COUNT = 5;

/** Manter igual a `FINAL_VICTORY_WAVE` em `enemies.ts`. */
export const COLISEUM_RUN_TOTAL_WAVES = 100;

export interface ColiseumDefinition {
  tier: ColiseumTierId;
  title: string;
  blurb: string;
}

export const COLISEUMS: readonly ColiseumDefinition[] = [
  {
    tier: 1,
    title: "Primeiro coliseu",
    blurb: "Arena menor — aquecimento e primeiros adversários.",
  },
  {
    tier: 2,
    title: "Segundo coliseu",
    blurb: "Tribunas mais cheias; os combates endurecem.",
  },
  {
    tier: 3,
    title: "Terceiro coliseu",
    blurb: "A multidão exige espetáculo; a pressão aumenta.",
  },
  {
    tier: 4,
    title: "Quarto coliseu",
    blurb: "Gladiadores de elite sob o olhar da capital.",
  },
  {
    tier: 5,
    title: "Quinto coliseu",
    blurb: "Arena imperial: o imperador preside; o desfecho da run.",
  },
];

export function coliseumDefinition(tier: ColiseumTierId): ColiseumDefinition {
  return COLISEUMS[tier - 1]!;
}

/** Fase 1–5 a partir da onda global 1–100. */
export function coliseumPhaseIndexFromWave(wave: number): ColiseumTierId {
  if (wave < 1) return 1;
  const idx =
    Math.floor((wave - 1) / COLISEUM_PHASE_WAVE_COUNT) + 1;
  return Math.min(
    COLISEUM_COUNT,
    Math.max(1, idx),
  ) as ColiseumTierId;
}

export function waveIndexWithinColiseumPhase(wave: number): number {
  return ((wave - 1) % COLISEUM_PHASE_WAVE_COUNT) + 1;
}

export function coliseumTitleForPhase(phase: number): string {
  const t = Math.min(
    COLISEUM_COUNT,
    Math.max(1, phase),
  ) as ColiseumTierId;
  return COLISEUMS[t - 1]!.title;
}

/**
 * Coliseu em que a run está nesta onda: começa em `startTier` e avança +1 a cada bloco de 20 ondas (cap 5).
 */
export function coliseumTierAtRunWave(
  wave: number,
  startTier: ColiseumTierId,
): ColiseumTierId {
  const phaseBlock = coliseumPhaseIndexFromWave(wave);
  const t = startTier + (phaseBlock - 1);
  return Math.min(COLISEUM_COUNT, Math.max(1, t)) as ColiseumTierId;
}

export function coliseumTitleAtRunWave(
  wave: number,
  startTier: ColiseumTierId,
): string {
  return coliseumDefinition(coliseumTierAtRunWave(wave, startTier)).title;
}

/** Multiplicador nas stats dos inimigos conforme o coliseu escolhido no arranque (1.º ×1 … 5.º ×5). */
export function coliseumTierEnemyMultiplier(tier: ColiseumTierId): number {
  return Math.min(COLISEUM_COUNT, Math.max(1, tier));
}

/** Multiplicador extra por fase dentro da run (cada bloco de 20 ondas). */
export function coliseumPhaseProgressEnemyMultiplier(wave: number): number {
  const phaseIdx = coliseumPhaseIndexFromWave(wave);
  return 1 + 0.042 * (phaseIdx - 1);
}

/**
 * Texto do resumo de onda. Usa o coliseu **atual** na run (tier inicial + blocos de 20 ondas, até ao 5.º).
 */
export function coliseumRunWaveTaglinePt(
  wave: number,
  chosenColiseumTier: ColiseumTierId,
): string {
  const wIn = waveIndexWithinColiseumPhase(wave);
  const title = coliseumTitleAtRunWave(wave, chosenColiseumTier);
  return `${title} — Onda ${wIn}/${COLISEUM_PHASE_WAVE_COUNT} (run ${wave}/${COLISEUM_RUN_TOTAL_WAVES})`;
}

/**
 * XP cumulativo para um herói atingir `FORMA_FINAL_LEVEL` com curva linear entre níveis.
 * `killXpScaleForParty` calibra a run para ~este total por herói até à onda 12 (XP base, sem bónus).
 */
export const XP_FORMA_TOTAL = 2000;
