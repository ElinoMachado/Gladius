const LS_KEY = "gladiadores-sfx-volume-percent";
/** 0–100; padrão alto (SFX independentes da música). */
const DEFAULT_PERCENT = 88;

function readLs(): number {
  if (typeof localStorage === "undefined") return DEFAULT_PERCENT;
  const s = localStorage.getItem(LS_KEY);
  if (s === null) return DEFAULT_PERCENT;
  const n = Number(s);
  if (!Number.isFinite(n)) return DEFAULT_PERCENT;
  return Math.round(Math.min(100, Math.max(0, n)));
}

let cachedPercent = readLs();

export function getSfxVolumePercent(): number {
  return cachedPercent;
}

export function setSfxVolumePercent(percent: number): void {
  cachedPercent = Math.round(Math.min(100, Math.max(0, percent)));
  try {
    localStorage.setItem(LS_KEY, String(cachedPercent));
  } catch {
    /* ignore */
  }
}

/** Multiplicador 0–1 para o ganho global de efeitos (Web Audio). */
export function getSfxVolumeFactor(): number {
  return cachedPercent / 100;
}
