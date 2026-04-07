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
    id: "imagem_residual",
    name: "Imagem residual",
    rarity: "common",
    description:
      "No início de cada wave invoca sombra(s) ao teu lado: 20 PV, 10 de dano, 10 movimento, 1 alcance, 0 defesa; o dano conta como habilidade. Morrem após o turno delas na fase de invocações. A cada 2 acúmulos surge mais uma sombra (máx. 6 acúmulos). Vida e dano aumentam com os acúmulos.",
  },
  {
    id: "maos_venenosas",
    name: "Mãos venenosas",
    rarity: "common",
    description:
      "Ao causar dano: +2 instâncias de veneno (mais o bónus do Amplicador de onda, se o tiveres). Causa 3 de dano por instância. Ignora a defesa.",
  },
  {
    id: "alento_morte",
    name: "Alento da morte",
    rarity: "common",
    description:
      "Ao iniciar o teu turno, morres imediatamente: cada aliado vivo recebe 1 instância de Bravura. Bravura concede +1 ataque básico neste turno; as instâncias expiram no fim do turno de cada herói (individualmente). Um nível.",
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
    name: "Labareda",
    rarity: "common",
    description:
      "Ao causar dano a um inimigo: aplica instâncias de queimadura (dano por tick) a outros inimigos entre 1 e (1 + alcance adicional na run) hexes do alvo. Cada instância causa o dano do teu nível de Labareda. Enquanto queimam, não regeneram vida naturalmente (curas explícitas funcionam). Acúmulos 1–6: dano 2/4/6/8/10/12 e 1/1/2/2/3/3 instâncias por alvo.",
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
    name: "Sacrifício resiliente",
    rarity: "common",
    description:
      "Ao morreres: +30 de defesa a cada herói aliado ainda vivo até ao fim desta wave, por acúmulo (máx. 4). Os efeitos de morte somam se tiveres vários artefatos.",
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
    description: "+6 de penetração por acúmulo.",
    pickBonusPerStack: { penetracao: 6 },
  },
  {
    id: "raiz_vida",
    name: "Explosão rubra",
    rarity: "common",
    description:
      "Ao morreres: causa 6 de dano a cada inimigo na arena por acúmulo (máx. 4). Os efeitos de morte somam se tiveres vários artefatos.",
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
    id: "ronin",
    name: "Ronin",
    rarity: "uncommon",
    description:
      "+20% acerto crítico por acúmulo. Acima de 100% a chance extra não conta para crítico; cada 5% de excesso viram +1 de dano nos teus golpes.",
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
    name: "Onda creptante",
    rarity: "uncommon",
    description:
      "Danos e curas por instância (veneno, queimadura, sangramento, HoT) podem dar acerto crítico. +10% ao multiplicador de dano crítico por acúmulo em esses ticks (10%…60% em 6 acúmulos).",
  },
  {
    id: "torrente_menor",
    name: "Golpe gélido",
    rarity: "uncommon",
    description:
      "Ao causar dano: aplica 2 instâncias de congelamento por acúmulo (máx. 6). Inimigos congelados têm metade do movimento. Causa dano bruto extra igual à metade do movimento base do alvo × acúmulos.",
  },
  {
    id: "vendaval_arcana",
    name: "Vendaval arcana",
    rarity: "uncommon",
    description: "+8% de dano com habilidades (não básico) por acúmulo.",
  },
  {
    id: "fio_cruel",
    name: "Multi Cristais",
    rarity: "uncommon",
    description:
      "+3% de chance de dropar um cristal ao eliminar inimigos por acúmulo (máx. 10).",
  },
  {
    id: "pacto_rubro",
    name: "Pacto rubro",
    rarity: "uncommon",
    description: "+5% de roubo de vida por acúmulo.",
    pickBonusPerStack: { lifesteal: 5 },
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
    name: "Golpe Relâmpago",
    rarity: "rare",
    description:
      "Ao eliminar um inimigo: salta ao vizinho do inimigo vivo mais próximo no bioma do teu hex (no hub, qualquer inimigo) e um básico imediato com +10% de dano por acúmulo; se matar, pode repetir. Se após o salto não houver alcance, só o próximo básico ganha o bônus.",
  },
  {
    id: "duro_pedra",
    name: "Duro como pedra",
    rarity: "rare",
    description:
      "+5 de defesa por acúmulo se não moveres no turno (5 × acúmulos); +2% dano crítico ao receber exatamente 1 de dano.",
  },
  {
    id: "braco_forte",
    name: "Braço forte",
    rarity: "rare",
    description:
      "+1 uso extra de ataque básico por turno por acúmulo (máx. 3 acúmulos).",
  },
  {
    id: "escudo_sangue",
    name: "Escudo de sangue",
    rarity: "rare",
    description:
      "Com escudo ativo ao receber dano: devolve 75% desse dano ao atacante por acúmulo.",
  },
  {
    id: "sol_interior",
    name: "Sobrecarga",
    rarity: "rare",
    description:
      "Ao causar dano: aplica 2 instâncias de choque por acúmulo (máx. 6). Inimigos em choque têm metade do alcance. Causa dano bruto extra igual ao alcance base do alvo × acúmulos.",
  },
  {
    id: "muralha_verdade",
    name: "Amplicador de onda",
    rarity: "rare",
    description:
      "+1/+2/+3 instâncias em todos os teus efeitos de dano por instância (ex.: Mãos venenosas, Labareda, sangramento da Furacão). Máx. 3 acúmulos.",
  },
  {
    id: "escudo_residual",
    name: "Escudo residual",
    rarity: "rare",
    description:
      "Com vida cheia, a cura por roubo de vida vira escudo azul até 100 (teto sobe por acúmulo: 100 / 250 / 400 / 600 / 900 / 1500).",
  },
  {
    id: "aura_tita",
    name: "Aura do titã",
    rarity: "rare",
    description:
      "No início de cada wave: +50 de escudo azul por acúmulo (máx. 6). Ao ganhares um acúmulo durante a run, recebes já +50 de escudo.",
  },
  {
    id: "potencializar_invocacao",
    name: "Potencializar invocação",
    rarity: "rare",
    description:
      "+1 cópia de cada uma das tuas invocações (sombras, espada flamejante, Mega Golem) e +40% de vida e +40% de dano delas por acúmulo (máx. 3).",
  },
  {
    id: "passo_gigante",
    name: "Ira do sobrevivente",
    rarity: "rare",
    description:
      "+20% de dano contra elites e chefes por acúmulo (máx. 5).",
  },
  {
    id: "sorte_prata",
    name: "Esguio",
    rarity: "rare",
    description:
      "Embosca: no chão, com 2 ou mais inimigos adjacentes o movimento fica bloqueado. Cada acúmulo exige +1 inimigo adjacente para isso (máx. 3 acúmulos).",
  },

  /* ——— Lendários (8) ——— */
  {
    id: "coroa_ferro",
    name: "Espada flamejante",
    rarity: "legendary",
    description:
      "Invoca uma espada de fogo autônoma ao lado do herói. Ela prioriza inimigos mais distantes e ataca 2 vezes por turno (200 PV, 40 dano, 100 defesa, 3 alcance, 7 movimento). Cada acúmulo: +100 PV, +20 dano, +50 defesa e +1 ataque (máx. 3). Crítico igual ao do herói.",
  },
  {
    id: "martelo_juiz",
    name: "Mega Golem",
    rarity: "legendary",
    description:
      "No início de cada wave invoca um Mega Golem ao teu lado: 1000 PV, 100 defesa, 3 movimento, 1 alcance, 60 de dano; 1 ataque por turno que atinge todos os inimigos adjacentes; o dano conta como habilidade. Enquanto viver no bioma, os inimigos desse bioma priorizam-no como alvo. Por acúmulo: +100 PV e +100 defesa (máx. 3).",
  },
  {
    id: "manto_espectral",
    name: "Dobra temporal",
    rarity: "legendary",
    description:
      "Cada acúmulo: +1 instância de dano (veneno, queimadura, sangramento) consumida por turno em todas as unidades (até +5 com 5 acúmulos). HoT não é afetado.",
  },
  {
    id: "anel_dragao",
    name: "Anel do dragão adormecido",
    rarity: "legendary",
    description:
      "Ao ganhares um acúmulo e no início de cada turno: invoca 1 bola de Ar por ataque básico disponível nesse turno. No fim do teu turno, as bolas atingem o inimigo mais distante no teu bioma (no hub, qualquer inimigo). Dano por bola: 100 + 50% do dano do ataque básico; +50 de dano fixo e +25 pontos percentuais na parte do dano do herói por acúmulo (máx. 5).",
  },
  {
    id: "crystal_extra",
    name: "Cristal extra",
    rarity: "legendary",
    description:
      "Sempre que um cristal cair por eliminação, recebe +1 cristal adicional por acúmulo (máx. 4).",
  },
  {
    id: "furacao_ouro",
    name: "Furacão de moedas",
    rarity: "mythic",
    description: "+5 de ouro na bolsa por eliminação por acúmulo.",
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
    name: "Cometa arcano",
    rarity: "mythic",
    description:
      "No início de cada wave: um cometa cai no centro da arena; a onda causa 50+20% / 120+40% / 210+75% da vida máxima a cada inimigo (metade em elites e chefes) e aplica 1/2/3 instâncias de Deslumbro. Inimigos deslumbrados recebem +50% de dano de todas as fontes (cada instância expira após uma rodada de ações dos inimigos). Com Lâmina mágica, este golpe pode dar crítico.",
  },
  {
    id: "carne_eterna",
    name: "Milagre da vida",
    rarity: "mythic",
    description:
      "As tuas curas podem ressuscitar aliados caídos (PV conforme a cura e o potencial). +50% de potencial de cura e escudo por acúmulo (máx. 3).",
    pickBonusPerStack: { potencialCuraEscudo: 50 },
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
    id: "lua_benta",
    name: "Lua benta",
    rarity: "legendary",
    description: "+4 de regen de mana por acúmulo.",
    pickBonusPerStack: { regenMana: 4 },
  },
];

export function artifactDefById(id: string): ArtifactDef | undefined {
  return ARTIFACT_POOL.find((a) => a.id === id);
}
