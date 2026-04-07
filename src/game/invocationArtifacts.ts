/**
 * Artefatos cujo efeito inclui “invocação” visível no combate (espada ligada ao herói ou unidades no grid).
 * Novos artefatos deste tipo: registe em `GRID_SUMMON_INVOCATION_RULES` e/ou em `HERO_BOUND_SWORD_INVOCATION_ARTIFACT_ID`,
 * depois chame `GameModel.syncInvocationArtifactsAfterChange` ao mudar acúmulos (já ligado a `pickArtifact` / sandbox).
 */
export const HERO_BOUND_SWORD_INVOCATION_ARTIFACT_ID = "coroa_ferro" as const;

export type GridSummonInvocationKind = "shadow" | "mega_golem";

export interface GridSummonInvocationRule {
  readonly artifactId: string;
  readonly summonKind: GridSummonInvocationKind;
  readonly maxArtifactStacks: number;
}

/** Invocações que são `Unit` no tabuleiro (`isAllySummon` + `summonKind`). */
export const GRID_SUMMON_INVOCATION_RULES: readonly GridSummonInvocationRule[] = [
  { artifactId: "imagem_residual", summonKind: "shadow", maxArtifactStacks: 6 },
  { artifactId: "martelo_juiz", summonKind: "mega_golem", maxArtifactStacks: 3 },
] as const;

const GRID_IDS = new Set(GRID_SUMMON_INVOCATION_RULES.map((r) => r.artifactId));

/** Acúmulos que alteram cópias ou escala das invocações deste herói. */
export function artifactAffectsInvocationSync(artifactId: string): boolean {
  return (
    artifactId === HERO_BOUND_SWORD_INVOCATION_ARTIFACT_ID ||
    artifactId === "potencializar_invocacao" ||
    GRID_IDS.has(artifactId)
  );
}
