import type { ArtifactRarity } from "./artifactRarity";

/** Definição de artefato jogável (pool de level-up / codex). */
export interface ArtifactDef {
  id: string;
  name: string;
  description: string;
  rarity: ArtifactRarity;
  /** Bônus aplicados ao escolher cada acúmulo (modifica stats base do herói). */
  pickBonusPerStack?: {
    dano?: number;
    defesa?: number;
    maxHp?: number;
    hp?: number;
    acertoCritico?: number;
    danoCritico?: number;
    penetracao?: number;
    regenVida?: number;
    regenMana?: number;
    alcance?: number;
    movimento?: number;
    lifesteal?: number;
    sorte?: number;
    potencialCuraEscudo?: number;
  };
}

export const ARTIFACT_POOL: ArtifactDef[] = [
  /* ——— Comuns (12) ——— */
  {
    id: "tonico",
    name: "Tônico",
    rarity: "common",
    description:
      "Receba {valor} de regeneração de mana adicional, equivalente a {pct}% da sua regeneração de vida.",
  },
  {
    id: "maos_venenosas",
    name: "Mãos venenosas",
    rarity: "common",
    description:
      "Ao causar dano: +2 instâncias de veneno. Causa 3 de dano. Este efeito é acumulável e ignora a defesa.",
  },
  {
    id: "ronin",
    name: "Ronin",
    rarity: "common",
    description:
      "+20% acerto crítico por acúmulo. Acima de 100% a chance extra não conta para crítico; cada 5% de excesso viram +1 de dano nos teus golpes.",
  },
  {
    id: "sylfid",
    name: "Sylfid",
    rarity: "common",
    description: "+15% potencial de cura e escudo por acúmulo.",
    pickBonusPerStack: { potencialCuraEscudo: 15 },
  },
  {
    id: "garra_ferro",
    name: "Garra de ferro",
    rarity: "common",
    description:
      "Converte 30% da sua defesa em dano bruto; +30 pontos percentuais de conversão por acúmulo (máx. 6).",
  },
  {
    id: "escama_leve",
    name: "Escama leve",
    rarity: "common",
    description: "+1 de defesa por acúmulo.",
    pickBonusPerStack: { defesa: 1 },
  },
  {
    id: "pulso_verde",
    name: "Pulso verde",
    rarity: "common",
    description:
      "Ao eliminar um inimigo: você e os aliados curam +5 de vida por acúmulo (máx. 12).",
  },
  {
    id: "gota_azul",
    name: "Gota azul",
    rarity: "common",
    description: "+1 de regen de mana por acúmulo.",
    pickBonusPerStack: { regenMana: 1 },
  },
  {
    id: "fel_simples",
    name: "Fio de fel",
    rarity: "common",
    description: "+2 de sorte por acúmulo.",
    pickBonusPerStack: { sorte: 2 },
  },
  {
    id: "anel_penetrante",
    name: "Anel penetrante",
    rarity: "common",
    description: "+1 de penetração por acúmulo.",
    pickBonusPerStack: { penetracao: 1 },
  },
  {
    id: "raiz_vida",
    name: "Raiz da vida",
    rarity: "common",
    description: "+1 de regen de vida por acúmulo.",
    pickBonusPerStack: { regenVida: 1 },
  },
  {
    id: "seda_vampira",
    name: "Seda vampira",
    rarity: "common",
    description:
      "Sempre que se curar com roubo de vida, cause 20% da sua cura como dano a todos inimigos no bioma.",
  },

  /* ——— Incomuns (12) ——— */
  {
    id: "trevo",
    name: "Trevo de quatro folhas",
    rarity: "uncommon",
    description: "+25% XP recebida por acúmulo (os efeitos somam).",
  },
  {
    id: "imortal",
    name: "Imortal",
    rarity: "uncommon",
    description: "+50% da regen de vida quando abaixo de 50% HP por acúmulo.",
  },
  {
    id: "ruler",
    name: "Ruler",
    rarity: "uncommon",
    description:
      "Ignore os efeitos dos biomas e receba + 1 de movimento.",
  },
  {
    id: "curandeiro_batalha",
    name: "Curandeiro de batalha",
    rarity: "uncommon",
    description: "Ao curar aliado ou a si: +2 de dano durante a wave por acúmulo.",
  },
  {
    id: "lamina_magica",
    name: "Lâmina mágica",
    rarity: "uncommon",
    description:
      "Habilidades podem causar crítico. Por acúmulo: +25% de dano crítico em dano de habilidades (não básico). Sem este artefato, só o ataque básico crita.",
  },
  {
    id: "olho_agucado",
    name: "Olho aguçado",
    rarity: "uncommon",
    description: "+4% de acerto crítico por acúmulo.",
    pickBonusPerStack: { acertoCritico: 4 },
  },
  {
    id: "couraca_reforcada",
    name: "Couraça reforçada",
    rarity: "uncommon",
    description: "+2 de defesa por acúmulo.",
    pickBonusPerStack: { defesa: 2 },
  },
  {
    id: "torrente_menor",
    name: "Torrente menor",
    rarity: "uncommon",
    description: "+2 regen de mana e +1 regen de vida por acúmulo.",
    pickBonusPerStack: { regenMana: 2, regenVida: 1 },
  },
  {
    id: "alcance_mistico",
    name: "Alcance místico",
    rarity: "uncommon",
    description: "+1 de alcance por acúmulo.",
    pickBonusPerStack: { alcance: 1 },
  },
  {
    id: "fio_cruel",
    name: "Fio cruel",
    rarity: "uncommon",
    description:
      "+3% de chance de dropar um cristal ao eliminar inimigos por acúmulo (máx. 10).",
  },
  {
    id: "pacto_rubro",
    name: "Pacto rubro",
    rarity: "uncommon",
    description: "+2% de roubo de vida por acúmulo.",
    pickBonusPerStack: { lifesteal: 2 },
  },
  {
    id: "instinto",
    name: "Instinto de arena",
    rarity: "uncommon",
    description: "+3 de sorte por acúmulo.",
    pickBonusPerStack: { sorte: 3 },
  },

  /* ——— Raros (10) ——— */
  {
    id: "motor_morte",
    name: "Motor da morte",
    rarity: "rare",
    description:
      "Ao eliminar um inimigo: teleporta ao mais próximo e +10% de dano no próximo básico por acúmulo.",
  },
  {
    id: "duro_pedra",
    name: "Duro como pedra",
    rarity: "rare",
    description:
      "+1 defesa se não mover no turno por acúmulo; +2% dano crítico ao receber exatamente 1 de dano.",
  },
  {
    id: "braco_forte",
    name: "Braço forte",
    rarity: "rare",
    description:
      "+1 uso extra de ataque básico por turno por acúmulo (até 3 stacks com efeito).",
  },
  {
    id: "escudo_sangue",
    name: "Escudo de sangue",
    rarity: "rare",
    description:
      "Com escudo ativo ao receber dano: devolve 75% desse dano ao atacante por acúmulo.",
  },
  {
    id: "crystal_extra",
    name: "Cristal extra",
    rarity: "rare",
    description:
      "Sempre que um cristal cair por eliminação, recebe +1 cristal adicional por acúmulo (máx. 4).",
  },
  {
    id: "muralha_verdade",
    name: "Muralha da verdade",
    rarity: "rare",
    description: "+4 de defesa por acúmulo.",
    pickBonusPerStack: { defesa: 4 },
  },
  {
    id: "escudo_residual",
    name: "Escudo residual",
    rarity: "rare",
    description:
      "Com vida cheia, a cura por roubo de vida vira escudo azul até 100 (teto sobe por acúmulo: 100 / 250 / 400 / 600 / 900 / 1500).",
  },
  {
    id: "vendaval_arcana",
    name: "Vendaval arcana",
    rarity: "rare",
    description: "+8% de dano com habilidades (não básico) por acúmulo.",
  },
  {
    id: "passo_gigante",
    name: "Passo de gigante",
    rarity: "rare",
    description: "+1 movimento por acúmulo (máx. 3 com efeito).",
    pickBonusPerStack: { movimento: 1 },
  },
  {
    id: "sorte_prata",
    name: "Sorte de prata",
    rarity: "rare",
    description: "+6 de sorte por acúmulo.",
    pickBonusPerStack: { sorte: 6 },
  },

  /* ——— Lendários (8) ——— */
  {
    id: "coroa_ferro",
    name: "Coroa de ferro",
    rarity: "legendary",
    description: "+4 de dano e +4 de defesa por acúmulo.",
    pickBonusPerStack: { dano: 4, defesa: 4 },
  },
  {
    id: "martelo_juiz",
    name: "Martelo do juiz",
    rarity: "legendary",
    description: "+7 de dano por acúmulo (máx. 3).",
    pickBonusPerStack: { dano: 7 },
  },
  {
    id: "manto_espectral",
    name: "Manto espectral",
    rarity: "legendary",
    description: "+10 de sorte por acúmulo (máx. 3).",
    pickBonusPerStack: { sorte: 10 },
  },
  {
    id: "anel_dragao",
    name: "Anel do dragão adormecido",
    rarity: "legendary",
    description: "+0,12 ao multiplicador de dano crítico por acúmulo.",
    pickBonusPerStack: { danoCritico: 0.12 },
  },
  {
    id: "sol_interior",
    name: "Sol interior",
    rarity: "legendary",
    description: "+4 de regen de vida por acúmulo.",
    pickBonusPerStack: { regenVida: 4 },
  },
  {
    id: "lua_benta",
    name: "Lua benta",
    rarity: "legendary",
    description: "+4 de regen de mana por acúmulo.",
    pickBonusPerStack: { regenMana: 4 },
  },
  {
    id: "espinhos_reais",
    name: "Espinhos reais",
    rarity: "legendary",
    description:
      "Ao receber dano de inimigos, devolve 8% desse dano por acúmulo ao atacante.",
  },
  {
    id: "anel_vinculo",
    name: "Anel de vínculo",
    rarity: "legendary",
    description: "+5 de potencial de cura e escudo por acúmulo.",
    pickBonusPerStack: { potencialCuraEscudo: 5 },
  },

  /* ——— Míticos (6) ——— */
  {
    id: "guerra_total",
    name: "Guerra total",
    rarity: "mythic",
    description: "+12 de dano e +8 de defesa por acúmulo (máx. 2).",
    pickBonusPerStack: { dano: 12, defesa: 8 },
  },
  {
    id: "carne_eterna",
    name: "Carne eterna",
    rarity: "mythic",
    description:
      "+20 de vida máxima e vida atual e +3 de dano por acúmulo (máx. 3).",
    pickBonusPerStack: { maxHp: 20, hp: 20, dano: 3 },
  },
  {
    id: "ceu_partido",
    name: "Céu partido",
    rarity: "mythic",
    description: "+15% de dano com habilidades (não básico) por acúmulo.",
  },
  {
    id: "penumbra",
    name: "Penumbra",
    rarity: "mythic",
    description: "+12 de penetração por acúmulo (máx. 3).",
    pickBonusPerStack: { penetracao: 12 },
  },
  {
    id: "ira_dimensao",
    name: "Ira de outra dimensão",
    rarity: "mythic",
    description:
      "+25% acerto crítico e +0,15 ao mult. de dano crítico por acúmulo (máx. 2).",
    pickBonusPerStack: { acertoCritico: 25, danoCritico: 0.15 },
  },
  {
    id: "furacao_ouro",
    name: "Furacão de moedas",
    rarity: "mythic",
    description: "+5 de ouro na bolsa por eliminação por acúmulo.",
  },
];

export function artifactDefById(id: string): ArtifactDef | undefined {
  return ARTIFACT_POOL.find((a) => a.id === id);
}
