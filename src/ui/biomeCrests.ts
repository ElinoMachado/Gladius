import type { ForgeEssenceId } from "../game/types";

/** Brasão compacto (SVG) por bioma — uso na forja e painel de sinergia. */
export function biomeCrestSvg(biome: ForgeEssenceId, size = 36): string {
  const s = size;
  switch (biome) {
    case "vulcanico":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path fill="#c62828" stroke="#3d0a00" stroke-width="0.6" d="M16 2L28 8v10c0 6-5.2 11.2-12 14C9.2 29.2 4 24 4 18V8L16 2z"/><path fill="#ffcc00" d="M16 8l4 6-4 10-4-6 4-10z" opacity="0.9"/></svg>`;
    case "pantano":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="12" ry="9" fill="#1b5e20" stroke="#0d3310" stroke-width="0.8"/><path fill="#4caf50" d="M8 16c2-4 6-6 8-8 2 2 6 4 8 8-2 3-6 5-8 7-2-2-6-4-8-7z" opacity="0.85"/><circle cx="12" cy="14" r="1.5" fill="#81c784"/><circle cx="20" cy="15" r="1.2" fill="#a5d6a7"/></svg>`;
    case "floresta":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path fill="#2e7d32" stroke="#1b5e20" stroke-width="0.6" d="M16 4l3 8h6l-5 4 2 8-6-4-6 4 2-8-5-4h6l3-8z"/><path fill="#66bb6a" d="M16 10l2 5h4l-3 2 1 4-4-3-4 3 1-4-3-2h4l2-5z"/></svg>`;
    case "montanhoso":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path fill="#90a4ae" stroke="#546e7a" stroke-width="0.6" d="M4 26L12 10l4 6 6-10 6 20H4z"/><path fill="#eceff1" d="M18 8l2 4h-4l2-4z"/><path fill="#b0bec5" d="M10 14l2 12H6l4-12z"/></svg>`;
    case "rochoso":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path fill="#6d4c41" stroke="#3e2723" stroke-width="0.6" d="M6 26L10 12l4 4 4-8 8 18H6z"/><circle cx="14" cy="16" r="2" fill="#a1887f"/><rect x="18" y="18" width="5" height="4" rx="0.5" fill="#5d4037"/></svg>`;
    case "deserto":
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#ffe082" stroke="#f9a825" stroke-width="0.8"/><path fill="#ffca28" d="M4 22c4-2 8-1 12 0s8 2 12 0v6H4v-6z"/><circle cx="22" cy="12" r="3" fill="#fff59d"/></svg>`;
    default:
      return `<svg class="forge-biome-crest" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="#78909c" stroke="#455a64"/></svg>`;
  }
}

export function biomeCrestWrap(biome: ForgeEssenceId, size?: number): string {
  return `<span class="forge-biome-crest-wrap" data-biome="${biome}">${biomeCrestSvg(biome, size)}</span>`;
}
