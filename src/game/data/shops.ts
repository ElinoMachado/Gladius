import type { Unit } from "../types";

export type GoldShopId =
  | "vida"
  | "max_mana"
  | "regen_hp"
  | "regen_mana"
  | "dano"
  | "crit_chance"
  | "crit_dmg"
  | "defesa"
  | "penetracao"
  | "movimento"
  | "heal_shield"
  | "xp_pct";

export interface GoldShopItem {
  id: GoldShopId;
  label: string;
  cost: number;
  apply: (u: Unit) => void;
}

/** Compras em lote na loja de ouro (custo e efeito = N × uma compra). */
export type GoldShopBatchSize = 1 | 5 | 10;

export const GOLD_SHOP_BATCH_SIZES: readonly GoldShopBatchSize[] = [1, 5, 10];

/** Custo de uma unidade (respeita Estrategista nato). */
export function goldShopUnitCost(item: GoldShopItem, u: Unit): number {
  let c = item.cost;
  if (u.ultimateId === "estrategista_nato") c = Math.ceil(c * 0.5);
  return c;
}

/** Quantas vezes se pode aplicar `item.apply` seguidas (ouro à parte). */
export function goldShopMaxPurchases(item: GoldShopItem, u: Unit): number {
  if (item.id === "xp_pct") {
    const cur = u.artifacts["_xp_shop"] ?? 0;
    return Math.max(0, Math.floor((60 - cur) / 10));
  }
  return 9999;
}

export function goldShopBatchAffordable(
  item: GoldShopItem,
  u: Unit,
  batch: GoldShopBatchSize,
): boolean {
  const uc = goldShopUnitCost(item, u);
  const maxP = goldShopMaxPurchases(item, u);
  return batch <= maxP && u.ouro >= uc * batch;
}

/** Rótulo do efeito para N compras de uma vez (alinhado com `apply` × N). */
export function goldShopBatchLabel(id: GoldShopId, n: number): string {
  switch (id) {
    case "vida":
      return `Vida +${5 * n} (máx.)`;
    case "max_mana":
      return `Mana máxima +${n}`;
    case "regen_hp":
      return `Regen vida +${n}`;
    case "regen_mana":
      return `Regen mana +${n}`;
    case "dano":
      return `Dano +${n}`;
    case "crit_chance":
      return `Acerto crítico +${5 * n}%`;
    case "crit_dmg":
      return `Dano crítico +${10 * n}%`;
    case "defesa":
      return `Defesa +${10 * n}`;
    case "penetracao":
      return `Penetração +${3 * n}`;
    case "movimento":
      return `Movimento +${n}`;
    case "heal_shield":
      return `Potencial cura/escudo +${10 * n}%`;
    case "xp_pct":
      return `XP +${10 * n}%`;
    default:
      return id;
  }
}

/** Ordem de exibição na loja (e referência para o HUD de atributos). */
export const GOLD_SHOP: GoldShopItem[] = [
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
    id: "max_mana",
    label: "Mana máxima +1",
    cost: 40,
    apply: (u) => {
      u.maxMana += 1;
      u.mana += 1;
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
    id: "dano",
    label: "Dano +1",
    cost: 10,
    apply: (u) => {
      u.dano += 1;
    },
  },
  {
    id: "crit_chance",
    label: "Acerto crítico +5%",
    cost: 15,
    apply: (u) => {
      u.acertoCritico += 5;
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
    id: "defesa",
    label: "Defesa +10",
    cost: 35,
    apply: (u) => {
      u.defesa += 10;
    },
  },
  {
    id: "penetracao",
    label: "Penetração +3",
    cost: 5,
    apply: (u) => {
      u.penetracao += 3;
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
    id: "heal_shield",
    label: "Potencial cura/escudo +10%",
    cost: 20,
    apply: (u) => {
      u.potencialCuraEscudo += 10;
    },
  },
  {
    id: "xp_pct",
    label: "XP +10%",
    cost: 45,
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
