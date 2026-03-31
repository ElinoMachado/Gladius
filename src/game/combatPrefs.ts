const LS_KEY = "gladiadores-skip-enemy-move";

function readLs(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(LS_KEY) === "1";
}

let cached = readLs();

/** Sem animação hex-a-hex dos inimigos; posição atualiza de imediato. */
export function getSkipEnemyMoveAnim(): boolean {
  return cached;
}

export function setSkipEnemyMoveAnim(v: boolean): void {
  cached = v;
  try {
    localStorage.setItem(LS_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}
