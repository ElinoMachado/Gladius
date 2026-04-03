import type { HeroClassId } from "./types";

/** Nomes normalizados (minúsculas, sem prefixos Mixamo comuns). */
export function normAnimClipName(name: string): string {
  return name
    .replace(/^mixamorig[:/]/i, "")
    .replace(/^armature[:/]/i, "")
    .trim()
    .toLowerCase();
}

const clipMsByNorm = new Map<string, number>();

/** Chamado ao carregar cada GLB de herói. */
export function registerHeroAnimationClips(clips: { name: string; duration: number }[]): void {
  for (const c of clips) {
    clipMsByNorm.set(normAnimClipName(c.name), Math.max(1, c.duration * 1000));
  }
}

function msForClip(...candidates: string[]): number {
  for (const raw of candidates) {
    const k = normAnimClipName(raw);
    const v = clipMsByNorm.get(k);
    if (v !== undefined) return v;
  }
  return 0;
}

/** Fallbacks se o GLB ainda não tiver clip com esse nome. */
const FB = {
  box01: 720,
  atirar: 560,
  magicBasic: 420,
  meleeEnemy: 400,
  hitBody: 600,
  runSeg: 420,
};

export function clipMsOrFallback(clipCandidates: string[], fallback: number): number {
  const d = msForClip(...clipCandidates);
  return d > 0 ? d : fallback;
}

/** Atraso até aplicar dano no básico corpo-a-corpo (gladiador). */
export function heroBasicMeleeDamageDelayMs(): number {
  return clipMsOrFallback(
    ["box_01", "box01", "boxing", "sword", "attack"],
    FB.box01,
  );
}

/** Atraso até o projétil mágico “acertar” (alinhar ao fim do gesto). */
export function heroBasicMagicDamageDelayMs(): number {
  return clipMsOrFallback(
    ["box_01", "box01", "cast", "spell", "attack", "magic"],
    FB.magicBasic,
  );
}

/** Atraso do tiro básico do pistoleiro. */
export function heroBasicShootDamageDelayMs(): number {
  return clipMsOrFallback(["atirar", "shoot", "fire", "shot"], FB.atirar);
}

/** Duração da reação ao dano (herói). */
export function heroHitReactAnimMs(): number {
  return clipMsOrFallback(
    ["golpe_no_corpo_01", "golpenocorpo01", "hit", "damage", "react"],
    FB.hitBody,
  );
}

/** “Vento” do ataque corpo-a-corpo inimigo antes de aplicar dano ao herói. */
export function enemyMeleeAttackWindupMs(): number {
  return clipMsOrFallback(["enemy_attack", "melee", "strike"], FB.meleeEnemy);
}

/** Duração útil do loop de corrida (por segmento de hex). */
export function heroRunSegmentMs(): number {
  return clipMsOrFallback(["correr", "run", "running"], FB.runSeg);
}

export function heroSelectionIdleClip(heroClass: HeroClassId): string | null {
  if (heroClass === "gladiador") return "ocioso";
  if (heroClass === "sacerdotisa") return "concordar";
  return null;
}

export function heroAttackClipName(heroClass: HeroClassId): string {
  if (heroClass === "pistoleiro") return "atirar";
  return "box_01";
}

export function heroRunClipName(): string {
  return "correr";
}

export function heroHitReactClipName(): string {
  return "golpe_no_corpo_01";
}
