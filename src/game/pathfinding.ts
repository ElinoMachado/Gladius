import { axialKey, hexNeighbors, hexDistance, type Axial } from "./hex";
import type { HexCell } from "./grid";
import { canCrossBiome } from "./grid";
import { movementStepEnterCost } from "./combatMath";

function reconstruct(
  came: Map<string, string | null>,
  end: string,
): Axial[] {
  const path: Axial[] = [];
  let cur: string | null = end;
  while (cur) {
    const [q, r] = cur.split(",").map(Number) as [number, number];
    path.push({ q, r });
    cur = came.get(cur) ?? null;
  }
  path.reverse();
  return path;
}

/**
 * A* em hex; `flying` e `ignoreTerrain` afetam cruzamento entre biomas.
 */
export function findPath(
  grid: Map<string, HexCell>,
  start: Axial,
  goal: Axial,
  flying: boolean,
  ignoreTerrain: boolean,
  maxCost: number,
  blocked?: Set<string>,
  /** Sinergia forja pântano (nv1+): hexes de pântano custam 1 ponto como terreno normal. */
  ignorePantanoMoveCost = false,
): Axial[] | null {
  const startK = axialKey(start.q, start.r);
  const goalK = axialKey(goal.q, goal.r);
  if (!grid.has(startK) || !grid.has(goalK)) return null;

  const open = new Set<string>([startK]);
  const g = new Map<string, number>([[startK, 0]]);
  const f = new Map<string, number>([
    [startK, hexDistance(start, goal)],
  ]);
  const came = new Map<string, string | null>([[startK, null]]);

  while (open.size > 0) {
    let best: string | null = null;
    let bestF = Infinity;
    for (const k of open) {
      const fv = f.get(k) ?? Infinity;
      if (fv < bestF) {
        bestF = fv;
        best = k;
      }
    }
    if (best === null) break;
    if (best === goalK) return reconstruct(came, goalK);

    open.delete(best);
    const [bq, br] = best.split(",").map(Number) as [number, number];
    const fromCell = grid.get(best)!;

    for (const n of hexNeighbors(bq, br)) {
      const nk = axialKey(n.q, n.r);
      const toCell = grid.get(nk);
      if (!toCell) continue;
      if (blocked?.has(nk)) continue;
      if (!canCrossBiome(fromCell, toCell, flying, ignoreTerrain)) continue;

      const step = ignoreTerrain
        ? 1
        : movementStepEnterCost(toCell, ignorePantanoMoveCost);
      const ng = (g.get(best) ?? Infinity) + step;
      if (ng > maxCost) continue;
      if (ng < (g.get(nk) ?? Infinity)) {
        came.set(nk, best);
        g.set(nk, ng);
        f.set(nk, ng + hexDistance(n, goal));
        open.add(nk);
      }
    }
  }
  return null;
}

/** Alcance alcançável com custo <= movimento */
export function reachableHexes(
  grid: Map<string, HexCell>,
  start: Axial,
  movement: number,
  flying: boolean,
  ignoreTerrain: boolean,
  blocked?: Set<string>,
  ignorePantanoMoveCost = false,
): Map<string, number> {
  const startK = axialKey(start.q, start.r);
  if (!grid.has(startK)) return new Map();
  const costs = new Map<string, number>([[startK, 0]]);
  const q: string[] = [startK];

  while (q.length) {
    const cur = q.shift()!;
    const curCost = costs.get(cur)!;
    const [cq, cr] = cur.split(",").map(Number) as [number, number];
    const fromCell = grid.get(cur)!;

    for (const n of hexNeighbors(cq, cr)) {
      const nk = axialKey(n.q, n.r);
      const toCell = grid.get(nk);
      if (!toCell) continue;
      if (blocked?.has(nk)) continue;
      if (!canCrossBiome(fromCell, toCell, flying, ignoreTerrain)) continue;
      const nc =
        curCost +
        (ignoreTerrain
          ? 1
          : movementStepEnterCost(toCell, ignorePantanoMoveCost));
      if (nc > movement) continue;
      if (nc < (costs.get(nk) ?? Infinity)) {
        costs.set(nk, nc);
        q.push(nk);
      }
    }
  }
  return costs;
}
