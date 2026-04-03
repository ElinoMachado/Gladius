import type { HeroClassId } from "../types";

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  cooldownWaves: number;
  manaCost?: number;
}

export interface UltimateDef {
  id: string;
  name: string;
  description: string;
}

export interface HeroTemplate {
  id: HeroClassId;
  name: string;
  colorHint: string;
  maxHp: number;
  maxMana: number;
  movimento: number;
  dano: number;
  defesa: number;
  regenVida: number;
  regenMana: number;
  alcance: number;
  skills: SkillDef[];
  ultimates: UltimateDef[];
  passiveDescription: string;
}

export const HEROES: Record<HeroClassId, HeroTemplate> = {
  pistoleiro: {
    id: "pistoleiro",
    name: "Pistoleiro",
    colorHint: "#c44",
    maxHp: 140,
    maxMana: 5,
    movimento: 6,
    dano: 10,
    defesa: 5,
    regenVida: 1,
    regenMana: 1,
    alcance: 6,
    passiveDescription:
      "Sempre que causa dano recebe +2 de dano nesta wave. A cada 10 niveis do Pistoleiro receba +2 de dano adicional",
    skills: [
      {
        id: "atirar_todo_lado",
        name: "Atirar pra todo lado",
        description: "Dano a todos inimigos no alcance = 65% do seu dano.",
        cooldownWaves: 3,
      },
    ],
    ultimates: [
      {
        id: "arauto_caos",
        name: "Arauto do Caos",
        description:
          "Substitui «Atirar pra todo lado» por Tiro destruidor: feixe em linha reta de hexes; +200% de dano por turno sem usar (até 5 cargas, 1200% no máximo).",
      },
      {
        id: "especialista_destruicao",
        name: "Especialista da destruição",
        description: "700% de dano em um único alvo.",
      },
    ],
  },
  gladiador: {
    id: "gladiador",
    name: "Gladiador",
    colorHint: "#4a4",
    maxHp: 240,
    maxMana: 3,
    movimento: 5,
    dano: 8,
    defesa: 20,
    regenVida: 2,
    regenMana: 0,
    alcance: 1,
    passiveDescription:
      'Ao derrotar um inimigo com a habilidade "até a morte": ganha +5 de vida máxima e atual. Esse valor sobe em +5 a cada 10 niveis do Gladiador',
    skills: [
      {
        id: "ate_a_morte",
        name: "Até a morte",
        description:
          "Duelo mortal: trocam golpes até morrer; você causa 120% no duelo.",
        cooldownWaves: 2,
      },
    ],
    ultimates: [
      {
        id: "campeao",
        name: "Campeão",
        description: "+10% vida e +5% dano por inimigo que você eliminou.",
      },
      {
        id: "estrategista_nato",
        name: "Estrategista nato",
        description:
          "Loja -50%, +100% chance de cristal; +1% dano por 1 de ouro acumulado.",
      },
    ],
  },
  sacerdotisa: {
    id: "sacerdotisa",
    name: "Sacerdotisa",
    colorHint: "#48c",
    maxHp: 80,
    maxMana: 10,
    movimento: 4,
    dano: 6,
    defesa: 0,
    regenVida: 0,
    regenMana: 2,
    alcance: 3,
    passiveDescription:
      "Reduz perda de ouro entre rodadas em 1. Potencial de cura/escudo +25% base +25% a cada 10 níveis.",
    skills: [
      {
        id: "sentenca",
        name: "Sentença",
        description:
          "2 mana: 85% dano a inimigos no teu bioma; cura aliados (50% do dano); excesso de cura vira 50% em escudo. 1 uso por turno (CD 2).",
        cooldownWaves: 2,
        manaCost: 2,
      },
    ],
    ultimates: [
      {
        id: "fada_cura",
        name: "Fada da cura",
        description:
          "+100% potencial cura/escudo; início wave escudo 50% vida max aliados; voo.",
      },
      {
        id: "rainha_desespero",
        name: "Rainha do desespero",
        description:
          "Fim do turno: 200% potencial cura como dano em todos; cura igual; +5 ouro por kill seu.",
      },
    ],
  },
};
