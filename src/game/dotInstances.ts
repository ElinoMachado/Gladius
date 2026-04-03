import type { Unit } from "./types";

/**
 * Helpers para **instâncias de dano** (veneno, queimadura, sangramento) e **instâncias de cura**
 * (HoT). Efeitos como Deslumbro vivem em `effectInstances` — ver `effectInstances.ts`.
 */

/** Quantas instâncias de DoT são consumidas por tick (mínimo 1). */
export function dotTickConsumeCount(u: Unit): number {
  return Math.max(1, Math.floor(u.dotConsumePerTick ?? 1));
}

export function poisonInstanceCount(u: Unit): number {
  return u.poison?.instances.length ?? 0;
}

export function hotInstanceCount(u: Unit): number {
  return u.hot?.instances.length ?? 0;
}

export function bleedInstanceCount(u: Unit): number {
  return u.bleed?.instances.length ?? 0;
}

/** Soma do dano das próximas instâncias de veneno consumidas num tick. */
export function sumNextPoisonTickDamage(u: Unit): number {
  const rate = dotTickConsumeCount(u);
  const arr = u.poison?.instances ?? [];
  const n = Math.min(rate, arr.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i]!;
  return s;
}

/** Soma da cura das próximas instâncias de HoT consumidas num tick. */
export function sumNextHotTickHeal(u: Unit): number {
  const rate = dotTickConsumeCount(u);
  const arr = u.hot?.instances ?? [];
  const n = Math.min(rate, arr.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i]!;
  return s;
}

/** Soma do dano das próximas instâncias de sangramento consumidas num tick. */
export function sumNextBleedTickDamage(u: Unit): number {
  const rate = dotTickConsumeCount(u);
  const arr = u.bleed?.instances ?? [];
  const n = Math.min(rate, arr.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i]!;
  return s;
}
