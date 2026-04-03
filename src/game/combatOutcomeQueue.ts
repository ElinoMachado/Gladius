/**
 * Fila global de efeitos pós-combate que competem com o mesmo “momento” (ex.: fim de wave).
 * Ordem: primeiro esvazia-se `combatSchedule` (dano/VFX dos inimigos e projéteis); só depois
 * correm estes jobs, por prioridade crescente (`levelUpAfterCombat` antes de `waveClear`).
 * Level-up / ultimate_pick interrompem o drain até o jogador resolver (restante fica na fila).
 */

type OutcomeJob = { priority: number; id: string; fn: () => void };

const queue: OutcomeJob[] = [];

/** Prioridades: menor número = corre primeiro (após schedule vazio). */
export const combatOutcomePriority = {
  /** Level-up pós-floats (antes do fecho de wave no mesmo tick). */
  levelUpAfterCombat: 10,
  /** Fecho de wave / resumo de loot. */
  waveClear: 20,
} as const;

export function enqueueCombatOutcome(
  priority: number,
  id: string,
  fn: () => void,
): void {
  if (queue.some((x) => x.id === id)) return;
  queue.push({ priority, id, fn });
  queue.sort((a, b) => a.priority - b.priority);
}

export function clearCombatOutcomeQueue(): void {
  queue.length = 0;
}

/**
 * Executa jobs enquanto não houver VFX/dano pendente e a UI não bloquear em level/ultimate.
 */
export function flushCombatOutcomeQueue(opts: {
  hasPendingCombatSchedule: () => boolean;
  getPhase: () => string;
}): void {
  if (opts.hasPendingCombatSchedule()) return;
  while (queue.length > 0) {
    const j = queue.shift()!;
    j.fn();
    const ph = opts.getPhase();
    if (ph === "level_up_pick" || ph === "ultimate_pick") break;
    if (opts.hasPendingCombatSchedule()) break;
  }
}
