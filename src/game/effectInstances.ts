import type { Unit } from "./types";

/** Contagem de instâncias de efeito Deslumbro (não é instância de dano/DoT). */
export function deslumbroInstancesCount(u: Unit): number {
  return u.effectInstances?.deslumbro ?? 0;
}

/**
 * Só inimigos. `delta` positivo aplica Deslumbro; negativo consome (ex.: −1 por fase inimiga).
 */
export function addDeslumbroInstances(u: Unit, delta: number): void {
  if (u.isPlayer) return;
  const cur = deslumbroInstancesCount(u);
  const next = cur + delta;
  if (next <= 0) {
    if (u.effectInstances) {
      delete u.effectInstances.deslumbro;
      if (Object.keys(u.effectInstances).length === 0) delete u.effectInstances;
    }
  } else {
    if (!u.effectInstances) u.effectInstances = {};
    u.effectInstances.deslumbro = next;
  }
}
