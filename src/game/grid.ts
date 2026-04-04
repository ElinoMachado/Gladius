import { axialKey, axialToWorld, hexDistance, type Axial } from "./hex";
import type { BiomeId } from "./types";
import { COMBAT_BIOMES } from "./data/biomes";

export interface HexCell {
  q: number;
  r: number;
  biome: BiomeId;
}

/** Distância axial máxima ao centro (0,0) para bioma hub (castelo). Era 1 (+6 hex); +2 anéis ⇒ 3. */
const HUB_MAX_DIST = 3;

function sectorFromAxial(q: number, r: number): number {
  const x = Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r;
  const z = (3 / 2) * r;
  let ang = Math.atan2(z, x);
  if (ang < 0) ang += Math.PI * 2;
  const sector = Math.floor(ang / ((Math.PI * 2) / 6)) % 6;
  return sector;
}

export function buildHexArena(radius: number): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > radius) continue;
      const dist = hexDistance({ q, r }, { q: 0, r: 0 });
      let biome: BiomeId;
      if (dist <= HUB_MAX_DIST) {
        biome = "hub";
      } else {
        biome = COMBAT_BIOMES[sectorFromAxial(q, r)]!;
      }
      map.set(axialKey(q, r), { q, r, biome });
    }
  }
  return map;
}

export function getCell(map: Map<string, HexCell>, q: number, r: number): HexCell | undefined {
  return map.get(axialKey(q, r));
}

/** Hex do bioma cujo centro está mais próximo de (wx, wz) no plano XZ (âncora lógica do bunker após arrasto). */
export function nearestHexInBiomeForWorldXz(
  map: Map<string, HexCell>,
  biome: BiomeId,
  wx: number,
  wz: number,
  hexSize: number,
): { q: number; r: number } | null {
  let best: { q: number; r: number } | null = null;
  let bestD = Infinity;
  for (const c of map.values()) {
    if (c.biome !== biome) continue;
    const p = axialToWorld(c.q, c.r, hexSize);
    const d = (p.x - wx) ** 2 + (p.z - wz) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { q: c.q, r: c.r };
    }
  }
  return best;
}

export function canCrossBiome(
  from: HexCell,
  to: HexCell,
  flying: boolean,
  ignoreTerrain: boolean,
): boolean {
  if (flying || ignoreTerrain) return true;
  if (from.biome === to.biome) return true;
  if (from.biome === "hub" || to.biome === "hub") return true;
  return false;
}

export function findHubCells(map: Map<string, HexCell>): Axial[] {
  const out: Axial[] = [];
  for (const c of map.values()) {
    if (c.biome === "hub") out.push({ q: c.q, r: c.r });
  }
  return out;
}
