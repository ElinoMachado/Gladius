const LS_KEY = "gladius-sandbox-no-cd-ult-ready";

function readLs(): boolean {
  if (typeof localStorage === "undefined") return true;
  const v = localStorage.getItem(LS_KEY);
  if (v === null) return true;
  return v === "1";
}

let cached = readLs();

/**
 * Sandbox (DEV): quando ativo, skills sem cooldown visível e ultimate da arma sempre pronta.
 * Economia ampla continua ligada ao modo sandbox em geral.
 */
export function getSandboxNoCdUltReady(): boolean {
  return cached;
}

export function setSandboxNoCdUltReady(v: boolean): void {
  cached = v;
  try {
    localStorage.setItem(LS_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}
