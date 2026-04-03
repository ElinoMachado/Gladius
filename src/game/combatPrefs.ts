const LS_KEY = "gladiadores-skip-combat-animations";
/** Legado: mesmo significado que o novo toggle. */
const LEGACY_LS_KEY = "gladiadores-skip-enemy-move";

function readLs(): boolean {
  if (typeof localStorage === "undefined") return false;
  const v = localStorage.getItem(LS_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return localStorage.getItem(LEGACY_LS_KEY) === "1";
}

let cached = readLs();

/**
 * Sem animações de combate (movimentos hex-a-hex, ataques, reações a dano):
 * tudo resolve no modelo de forma instantânea.
 */
export function getSkipCombatAnimations(): boolean {
  return cached;
}

export function setSkipCombatAnimations(v: boolean): void {
  cached = v;
  try {
    localStorage.setItem(LS_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** @deprecated Usar `getSkipCombatAnimations`. */
export function getSkipEnemyMoveAnim(): boolean {
  return getSkipCombatAnimations();
}

/** @deprecated Usar `setSkipCombatAnimations`. */
export function setSkipEnemyMoveAnim(v: boolean): void {
  setSkipCombatAnimations(v);
}
