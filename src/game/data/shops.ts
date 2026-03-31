import type { Unit } from "../types";

export type GoldShopId =
  | "dano"
  | "vida"
  | "movimento"
  | "crit_chance"
  | "crit_dmg"
  | "regen_hp"
  | "regen_mana"
  | "defesa"
  | "heal_shield"
  | "xp_pct";

export interface GoldShopItem {
  id: GoldShopId;
  label: string;
  cost: number;
  apply: (u: Unit) => void;
}

export const GOLD_SHOP: GoldShopItem[] = [
  {
    id: "dano",
    label: "Dano +1",
    cost: 10,
    apply: (u) => {
      u.dano += 1;
    },
  },
  {
    id: "vida",
    label: "Vida +5 (máx.)",
    cost: 5,
    apply: (u) => {
      u.maxHp += 5;
      u.hp += 5;
    },
  },
  {
    id: "movimento",
    label: "Movimento +1",
    cost: 50,
    apply: (u) => {
      u.movimento += 1;
    },
  },
  {
    id: "crit_chance",
    label: "Acerto crítico +10%",
    cost: 30,
    apply: (u) => {
      u.acertoCritico += 10;
    },
  },
  {
    id: "crit_dmg",
    label: "Dano crítico +10%",
    cost: 25,
    apply: (u) => {
      u.danoCritico += 0.1;
    },
  },
  {
    id: "regen_hp",
    label: "Regen vida +1",
    cost: 40,
    apply: (u) => {
      u.regenVida += 1;
    },
  },
  {
    id: "regen_mana",
    label: "Regen mana +1",
    cost: 55,
    apply: (u) => {
      u.regenMana += 1;
    },
  },
  {
    id: "defesa",
    label: "Defesa +1",
    cost: 35,
    apply: (u) => {
      u.defesa += 1;
    },
  },
  {
    id: "heal_shield",
    label: "Potencial cura/escudo +5%",
    cost: 20,
    apply: (u) => {
      u.potencialCuraEscudo += 5;
    },
  },
  {
    id: "xp_pct",
    label: "XP +10%",
    cost: 15,
    apply: (u) => {
      const capStacks = 6;
      const cur = u.artifacts["_xp_shop"] ?? 0;
      u.artifacts["_xp_shop"] = Math.min(capStacks * 10, cur + 10);
    },
  },
];

/** Por ciclo (todos os heróis jogaram): base 5 de `ouroWave`, menos `goldDrainReduction` (mín. 0). */
export function goldDrainPerTurn(u: Unit, _partySize: number): number {
  const base = 5;
  return Math.max(0, base - Math.max(0, u.goldDrainReduction));
}
