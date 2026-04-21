const LS_KEY_ENEMY = "gladiadores-skip-combat-animations";
const LEGACY_LS_KEY_ENEMY = "gladiadores-skip-enemy-move";
const LS_KEY_ALLIED = "gladiadores-skip-allied-combat-animations";

function readLsEnemy(): boolean {
  if (typeof localStorage === "undefined") return false;
  const v = localStorage.getItem(LS_KEY_ENEMY);
  if (v === "1") return true;
  if (v === "0") return false;
  return localStorage.getItem(LEGACY_LS_KEY_ENEMY) === "1";
}

function readLsAllied(): boolean {
  if (typeof localStorage === "undefined") return false;
  const v = localStorage.getItem(LS_KEY_ALLIED);
  if (v === "1") return true;
  if (v === "0") return false;
  /** Antes um único toggle lia só `LS_KEY_ENEMY` para quase todo o combate; alinhar o default. */
  return readLsEnemy();
}

let cachedEnemy = readLsEnemy();
let cachedAllied = readLsAllied();

/** Pular animações da **fase dos inimigos** (movimento, wind-up entre golpes). */
export function getSkipEnemyCombatAnimations(): boolean {
  return cachedEnemy;
}

export function setSkipEnemyCombatAnimations(v: boolean): void {
  cachedEnemy = v;
  try {
    localStorage.setItem(LS_KEY_ENEMY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Pular animações **aliadas**: herói (movimento, básico, artefactos, skills com fila),
 * fase de invocações (espada/sombras/golem/mago), VFX associados no renderer.
 * A reação do herói ao ser atingido na fase inimiga usa `getSkipEnemyCombatAnimations`.
 */
export function getSkipAlliedCombatAnimations(): boolean {
  return cachedAllied;
}

export function setSkipAlliedCombatAnimations(v: boolean): void {
  cachedAllied = v;
  try {
    localStorage.setItem(LS_KEY_ALLIED, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** @deprecated Preferir `getSkipEnemyCombatAnimations`. */
export function getSkipCombatAnimations(): boolean {
  return getSkipEnemyCombatAnimations();
}

/** @deprecated Preferir `setSkipEnemyCombatAnimations`. */
export function setSkipCombatAnimations(v: boolean): void {
  setSkipEnemyCombatAnimations(v);
}

/** @deprecated Usar `getSkipEnemyCombatAnimations`. */
export function getSkipEnemyMoveAnim(): boolean {
  return getSkipEnemyCombatAnimations();
}

/** @deprecated Usar `setSkipEnemyCombatAnimations`. */
export function setSkipEnemyMoveAnim(v: boolean): void {
  setSkipEnemyCombatAnimations(v);
}
