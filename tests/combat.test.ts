import { describe, it, expect } from "vitest";
import { GameModel } from "../src/game/gameModel";
import {
  computeMitigatedDamage,
  applyCritMultiplier,
  effectiveDefenseForBiome,
  effectiveMovimentoForBiome,
  effectiveAlcanceForBiome,
  movementStepEnterCost,
} from "../src/game/combatMath";
import { buildHexArena, canCrossBiome } from "../src/game/grid";
import { axialKey, hexDistance } from "../src/game/hex";
import { findPath, reachableHexes } from "../src/game/pathfinding";
import { goldDrainPerTurn } from "../src/game/data/shops";
import type { Unit } from "../src/game/types";

describe("combatMath", () => {
  it("mitigates with floor 1 damage", () => {
    /* 100 def → ~50% redução no 1.º bloco; 10 * 0,5 = 5 */
    expect(computeMitigatedDamage(10, 100, 0)).toBe(5);
    /* 2 def → redução pequena */
    expect(computeMitigatedDamage(10, 2, 0)).toBe(9);
    /* Defesa muito alta: dano mínimo 1 */
    expect(computeMitigatedDamage(10, 500, 0)).toBe(1);
  });

  it("applies crit multiplier", () => {
    expect(applyCritMultiplier(10, 1.5, false, false)).toBe(10);
    expect(applyCritMultiplier(10, 1.5, true, false)).toBe(15);
    expect(applyCritMultiplier(10, 1.5, true, true)).toBe(25);
  });

  it("montanhoso adds defense", () => {
    expect(effectiveDefenseForBiome(4, "montanhoso")).toBe(6);
    expect(effectiveDefenseForBiome(4, "montanhoso", true)).toBe(4);
  });

  it("pontos de movimento não são mais cortados no pântano (custo por hex)", () => {
    expect(effectiveMovimentoForBiome(6, "pantano")).toBe(6);
    expect(movementStepEnterCost({ biome: "pantano" })).toBe(2);
    expect(movementStepEnterCost({ biome: "floresta" })).toBe(1);
  });

  it("floresta adds range", () => {
    expect(effectiveAlcanceForBiome(3, "floresta")).toBe(4);
    expect(effectiveAlcanceForBiome(3, "floresta", true)).toBe(3);
  });
});

describe("grid path hub", () => {
  const grid = buildHexArena(6);
  const hub = [...grid.values()].find((c) => c.biome === "hub")!;
  const floresta = [...grid.values()].find((c) => c.biome === "floresta")!;
  const pantano = [...grid.values()].find((c) => c.biome === "pantano")!;

  it("blocks direct biome jump without hub for walkers", () => {
    const a = grid.get(`${floresta.q},${floresta.r}`)!;
    const b = grid.get(`${pantano.q},${pantano.r}`)!;
    if (floresta.q === pantano.q && floresta.r === pantano.r) return;
    const neigh = canCrossBiome(a, b, false, false);
    expect(neigh).toBe(false);
  });

  it("reaches hub from floresta on foot", () => {
    const path = findPath(
      grid,
      { q: floresta.q, r: floresta.r },
      { q: hub.q, r: hub.r },
      false,
      false,
      24,
    );
    expect(path).not.toBeNull();
  });

  it("flying can cross biomes without hub", () => {
    const path = findPath(
      grid,
      { q: floresta.q, r: floresta.r },
      { q: pantano.q, r: pantano.r },
      true,
      false,
      40,
    );
    expect(path).not.toBeNull();
  });

  it("ignoreTerrain (ruler) faz custo 1 em hexes de pântano", () => {
    const pantanoCells = [...grid.values()].filter((c) => c.biome === "pantano");
    const from = pantanoCells[0];
    if (!from) return;
    const neigh = pantanoCells.find(
      (c) => hexDistance({ q: c.q, r: c.r }, { q: from.q, r: from.r }) === 1,
    );
    if (!neigh) return;
    const k = axialKey(neigh.q, neigh.r);
    const reachNormal = reachableHexes(
      grid,
      { q: from.q, r: from.r },
      2,
      false,
      false,
    );
    const reachRuler = reachableHexes(
      grid,
      { q: from.q, r: from.r },
      2,
      false,
      true,
    );
    expect(reachNormal.get(k)).toBe(2);
    expect(reachRuler.get(k)).toBe(1);
  });
});

describe("GameModel startNewRun", () => {
  it("preenche partyOrder e getParty após nova run", () => {
    const m = new GameModel();
    m.startNewRun({
      heroes: ["pistoleiro"],
      biomes: ["floresta"],
      colors: ["vermelho", "azul", "verde"],
      partySlotByHero: [0],
    });
    expect(m.partyOrder.length).toBe(1);
    expect(m.getParty().length).toBe(1);
    expect(m.getParty()[0]!.heroClass).toBe("pistoleiro");
  });
});

describe("goldDrainPerTurn", () => {
  it("base 5 sem redução", () => {
    expect(goldDrainPerTurn({ goldDrainReduction: 0 } as Unit, 3)).toBe(5);
  });
  it("redução subtrai do base; não fica negativo", () => {
    expect(goldDrainPerTurn({ goldDrainReduction: 2 } as Unit, 3)).toBe(3);
    expect(goldDrainPerTurn({ goldDrainReduction: 10 } as Unit, 3)).toBe(0);
  });
});
