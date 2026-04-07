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

const RARITIES: ArtifactRarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
];

/**
 * Pesos em % (somam 100) por sorte.
 *
 * Regras de desenho:
 * - Até 59: só comum / incomum / raro (sem lendário nem mítico).
 * - A partir de 60: entra lendário; mítico continua 0.
 * - A partir de 100: entra mítico.
 * - Em 200 de sorte: 50% mítico (interpolado linearmente entre 100 e 200).
 */
export function rarityWeightsForSorte(sorte: number): Record<ArtifactRarity, number> {
  const s = Math.floor(Math.max(0, sorte));

  if (s < 60) {
    const t = s <= 0 ? 0 : s / 59;
    const common = 50 - 25 * t;
    const uncommon = 35;
    const rare = 15 + 25 * t;
    return {
      common,
      uncommon,
      rare,
      legendary: 0,
      mythic: 0,
    };
  }

  if (s < 100) {
    const u = (s - 60) / 39;
    const legendary = 5 + 15 * u;
    const common = 23.75 - 3.75 * u;
    const uncommon = 33.25 - 5.25 * u;
    const rare = 38 - 6 * u;
    return {
      common,
      uncommon,
      rare,
      legendary,
      mythic: 0,
    };
  }

  if (s <= 200) {
    const t = (s - 100) / 100;
    const mythic = 2 + 48 * t;
    const legendary = 18 - 13 * t;
    const common = 20 - 8 * t;
    const uncommon = 28 - 10 * t;
    const rare = 32 - 17 * t;
    return {
      common,
      uncommon,
      rare,
      legendary,
      mythic,
    };
  }

  return {
    common: 12,
    uncommon: 18,
    rare: 15,
    legendary: 5,
    mythic: 50,
  };
}

/**
 * Raridades que podem aparecer nas escolhas de level-up para este valor de sorte
 * (alinhado com `rarityWeightsForSorte`: sem lendário abaixo de 60, sem mítico abaixo de 100).
 */
export function artifactRaritiesAllowedForSorte(sorte: number): ArtifactRarity[] {
  const s = Math.floor(Math.max(0, sorte));
  if (s < 60) return ["common", "uncommon", "rare"];
  if (s < 100) return ["common", "uncommon", "rare", "legendary"];
  return ["common", "uncommon", "rare", "legendary", "mythic"];
}

export function rollArtifactRarity(sorte: number): ArtifactRarity {
  const w = rarityWeightsForSorte(sorte);
  const arr = RARITIES.map((r) => w[r]);
  const sum = arr.reduce((a, b) => a + b, 0);
  const r0 = Math.random() * sum;
  let acc = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    acc += arr[i]!;
    if (r0 < acc) return RARITIES[i]!;
  }
  return "common";
}

export function formatRarityOddsLines(sorte: number): string[] {
  const w = rarityWeightsForSorte(sorte);
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  return [
    "Raridade dos artefatos:",
    `Comum ${fmt(w.common)}% · Incomum ${fmt(w.uncommon)}% · Raro ${fmt(w.rare)}% · Lendário ${fmt(w.legendary)}% · Mítico ${fmt(w.mythic)}%`,
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
  const fmtPct = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  const plain = formatRarityOddsLines(sorte);
  const parts = RARITIES.map(
    (r) =>
      `<span style="color:${RARITY_ODDS_COLORS[r]}">${ARTIFACT_RARITY_LABELS[r]}</span> ${fmtPct(w[r])}%`,
  );
  return [plain[0]!, `${parts.join(" · ")}`];
}
