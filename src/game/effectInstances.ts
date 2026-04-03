import type { Unit } from "./types";

/** Contagem de instâncias de efeito Deslumbro (não é instância de dano/DoT). */
export function deslumbroInstancesCount(u: Unit): number {
  return u.effectInstances?.deslumbro ?? 0;
}

/** Instâncias de Bravura (+ataques básicos neste turno; só heróis). */
export function bravuraInstancesCount(u: Unit): number {
  if (!u.isPlayer) return 0;
  return u.effectInstances?.bravura ?? 0;
}

export function addBravuraInstances(u: Unit, delta: number): void {
  if (!u.isPlayer || u.hp <= 0) return;
  const cur = bravuraInstancesCount(u);
  const next = cur + delta;
  if (next <= 0) {
    if (u.effectInstances) {
      delete u.effectInstances.bravura;
      if (Object.keys(u.effectInstances).length === 0) delete u.effectInstances;
    }
  } else {
    if (!u.effectInstances) u.effectInstances = {};
    u.effectInstances.bravura = next;
  }
}

/** Fim do turno do herói: remove todas as instâncias de Bravura. */
export function clearBravuraInstances(u: Unit): void {
  if (!u.effectInstances?.bravura) return;
  delete u.effectInstances.bravura;
  if (Object.keys(u.effectInstances).length === 0) delete u.effectInstances;
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
