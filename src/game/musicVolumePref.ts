const LS_KEY = "gladiadores-music-volume-percent";
/** 0–100; padrão mais baixo (música não tapa SFX). */
const DEFAULT_PERCENT = 28;

function readLs(): number {
  if (typeof localStorage === "undefined") return DEFAULT_PERCENT;
  const s = localStorage.getItem(LS_KEY);
  if (s === null) return DEFAULT_PERCENT;
  const n = Number(s);
  if (!Number.isFinite(n)) return DEFAULT_PERCENT;
  return Math.round(Math.min(100, Math.max(0, n)));
}

let cachedPercent = readLs();

export function getMusicVolumePercent(): number {
  return cachedPercent;
}

export function setMusicVolumePercent(percent: number): void {
  cachedPercent = Math.round(Math.min(100, Math.max(0, percent)));
  try {
    localStorage.setItem(LS_KEY, String(cachedPercent));
  } catch {
    /* ignore */
  }
}

/** Multiplicador 0–1 para `HTMLAudioElement.volume`. */
export function getMusicVolumeFactor(): number {
  return cachedPercent / 100;
}
