export type ArtifactRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "legendary"
  | "mythic";

export const ARTIFACT_RARITY_LABELS: Record<ArtifactRarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  legendary: "Lendário",
  mythic: "Mítico",
};

/** Ordem de exibição no codex (mais raro primeiro). */
export const ARTIFACT_RARITY_ORDER: ArtifactRarity[] = [
  "mythic",
  "legendary",
  "rare",
  "uncommon",
  "common",
];

function luckBracket(sorte: number): number {
  const s = Math.floor(Math.max(0, sorte));
  if (s <= 5) return 0;
  if (s <= 10) return 1;
  if (s <= 15) return 2;
  if (s <= 20) return 3;
  if (s <= 25) return 4;
  if (s <= 30) return 5;
  if (s <= 35) return 6;
  return 7;
}

/** Pesos [comum, incomum, raro, lendário, mítico] em % (somam 100). */
const BRACKET_WEIGHTS: [number, number, number, number, number][] = [
  [60, 40, 0, 0, 0],
  [50, 40, 10, 0, 0],
  [40, 35, 15, 5, 0],
  [30, 35, 25, 8, 2],
  [10, 30, 40, 10, 10],
  [5, 20, 30, 30, 15],
  [0, 10, 20, 35, 35],
  [0, 0, 25, 30, 45],
];

const RARITIES: ArtifactRarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
];

export function rarityWeightsForSorte(sorte: number): Record<ArtifactRarity, number> {
  const w = BRACKET_WEIGHTS[luckBracket(sorte)]!;
  const out: Record<ArtifactRarity, number> = {
    common: w[0]!,
    uncommon: w[1]!,
    rare: w[2]!,
    legendary: w[3]!,
    mythic: w[4]!,
  };
  return out;
}

export function rollArtifactRarity(sorte: number): ArtifactRarity {
  const w = BRACKET_WEIGHTS[luckBracket(sorte)]!;
  const r = Math.random() * 100;
  let acc = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    acc += w[i]!;
    if (r < acc) return RARITIES[i]!;
  }
  return "common";
}

export function formatRarityOddsLines(sorte: number): string[] {
  const w = rarityWeightsForSorte(sorte);
  return [
    "Raridade dos artefatos:",
    `Comum ${w.common}% · Incomum ${w.uncommon}% · Raro ${w.rare}% · Lendário ${w.legendary}% · Mítico ${w.mythic}%`,
  ];
}

const RARITY_ODDS_COLORS: Record<ArtifactRarity, string> = {
  common: "#9e9e9e",
  uncommon: "#66bb6a",
  rare: "#42a5f5",
  legendary: "#ffa726",
  mythic: "#ab47bc",
};

/** HTML com nomes de raridade coloridos (para HUD de combate). */
export function formatRarityOddsLinesHtml(sorte: number): string[] {
  const w = rarityWeightsForSorte(sorte);
  const plain = formatRarityOddsLines(sorte);
  const parts = RARITIES.map(
    (r) =>
      `<span style="color:${RARITY_ODDS_COLORS[r]}">${ARTIFACT_RARITY_LABELS[r]}</span> ${w[r]}%`,
  );
  return [plain[0]!, `${parts.join(" · ")}`];
}
