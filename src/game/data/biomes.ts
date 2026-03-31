import type { BiomeId } from "../types";

export const COMBAT_BIOMES: BiomeId[] = [
  "floresta",
  "pantano",
  "montanhoso",
  "deserto",
  "rochoso",
  "vulcanico",
];

export const BIOME_LABELS: Record<BiomeId, string> = {
  hub: "Castelo",
  floresta: "Floresta",
  pantano: "Pântano",
  montanhoso: "Montanhoso",
  deserto: "Deserto",
  rochoso: "Rochoso",
  vulcanico: "Vulcânico",
};

/** Textos para UI de escolha de bioma (hover / painel). */
export const BIOME_DESCRIPTIONS: Record<BiomeId, string> = {
  hub:
    "Centro neutro da arena: passagem entre setores. Não é bioma inicial de herói.",
  floresta:
    "Criaturas na floresta recebem +1 de alcance no seu ataque básico e em habilidades que escalem com alcance.",
  pantano:
    "A mobilidade de todas as criaturas é reduzida em 50%.",
  montanhoso:
    "Criaturas na montanha recebem +50% de defesa.",
  deserto:
    "Criaturas no deserto têm sua regeneração de mana e vida iguais a 0.",
  rochoso:
    "Acertos críticos recebem +100% de dano crítico.",
  vulcanico:
    "Todas as criaturas dentro do solo vulcânico recebem 10 de dano no final de seus turnos.",
};
