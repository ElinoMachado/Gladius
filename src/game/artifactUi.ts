import type { Unit } from "./types";
import {
  ARTIFACT_POOL,
  artifactDefById,
  type ArtifactDef,
} from "./data/artifacts";
import {
  ARTIFACT_RARITY_ORDER,
  rollArtifactRarity,
  type ArtifactRarity,
} from "./data/artifactRarity";

/** Na run normal: quantos artefatos *diferentes* por raridade o herói pode ter (acúmulos à parte). */
export const MAX_DISTINCT_ARTIFACTS_BY_RARITY: Record<ArtifactRarity, number> =
  {
    common: 3,
    uncommon: 3,
    rare: 2,
    legendary: 2,
    mythic: 1,
  };

export function countDistinctArtifactsOfRarity(
  u: Unit,
  rarity: ArtifactRarity,
): number {
  let n = 0;
  for (const id of Object.keys(u.artifacts)) {
    const stacks = u.artifacts[id] ?? 0;
    if (stacks <= 0) continue;
    const d = artifactDefById(id);
    if (d?.rarity === rarity) n++;
  }
  return n;
}

/** Pode ganhar +1 acúmulo deste artefato (teto de stack e teto de tipos por raridade). */
export function canIncrementArtifactStack(
  u: Unit,
  artifactId: string,
  opts?: { bypassRarityCaps?: boolean },
): boolean {
  if (artifactId.startsWith("_")) return false;
  const cap = getArtifactMaxStacks(artifactId);
  const prev = u.artifacts[artifactId] ?? 0;
  if (prev >= cap) return false;
  if (prev > 0) return true;
  if (opts?.bypassRarityCaps) return true;
  const def = artifactDefById(artifactId);
  if (!def) return false;
  const n = countDistinctArtifactsOfRarity(u, def.rarity);
  return n < MAX_DISTINCT_ARTIFACTS_BY_RARITY[def.rarity];
}

/** Limite padrão de empilhamento (cartas). */
export const DEFAULT_ARTIFACT_MAX_STACK = 6;

/** Limites explícitos por ID. */
const SPECIAL_MAX: Record<string, number> = {
  garra_ferro: 6,
  pulso_verde: 12,
  seda_vampira: 10,
  fio_cruel: 10,
  crystal_extra: 4,
  passo_gigante: 3,
  martelo_juiz: 3,
  muralha_verdade: 3,
  manto_espectral: 5,
  olho_agucado: 6,
  guerra_total: 3,
  ira_dimensao: 2,
  carne_eterna: 3,
  penumbra: 3,
};

export function getArtifactMaxStacks(artifactId: string): number {
  if (artifactId.startsWith("_")) return 999;
  return SPECIAL_MAX[artifactId] ?? DEFAULT_ARTIFACT_MAX_STACK;
}

export function isArtifactVisibleInHud(artifactId: string): boolean {
  if (artifactId.startsWith("_")) return false;
  return ARTIFACT_POOL.some((a) => a.id === artifactId);
}

export function randomArtifactChoicesForHero(
  u: Unit,
  count: number,
  sorte: number,
  exclude: Set<string> = new Set(),
  opts?: { bypassRarityCaps?: boolean },
): string[] {
  const out: string[] = [];
  const picked = new Set(exclude);
  const bypass = opts?.bypassRarityCaps ?? false;

  const tryPickOne = (): string | null => {
    const primary = rollArtifactRarity(sorte);
    const order: ArtifactRarity[] = [
      primary,
      ...ARTIFACT_RARITY_ORDER.filter((r) => r !== primary),
    ];
    for (const tr of order) {
      const pool = ARTIFACT_POOL.filter(
        (a) =>
          a.rarity === tr &&
          !picked.has(a.id) &&
          canIncrementArtifactStack(u, a.id, { bypassRarityCaps: bypass }),
      );
      if (pool.length > 0) {
        return pool[Math.floor(Math.random() * pool.length)]!.id;
      }
    }
    return null;
  };

  for (let i = 0; i < count; i++) {
    const id = tryPickOne();
    if (!id) break;
    out.push(id);
    picked.add(id);
  }

  while (out.length < count) {
    if (!picked.has("_pick_gold")) {
      out.push("_pick_gold");
      picked.add("_pick_gold");
      continue;
    }
    if (!picked.has("_pick_restore")) {
      out.push("_pick_restore");
      picked.add("_pick_restore");
      continue;
    }
    if (!picked.has("_pick_crystals")) {
      out.push("_pick_crystals");
      picked.add("_pick_crystals");
      continue;
    }
    break;
  }
  return out;
}

function defOr(id: string): ArtifactDef | undefined {
  return artifactDefById(id);
}

export function artifactRarityClass(r: ArtifactRarity): string {
  return `artifact-rarity--${r}`;
}

export function pickChoiceDisplayName(id: string): string {
  if (id === "_pick_gold") return "Saco de ouro";
  if (id === "_pick_restore") return "Descanso do campeão";
  if (id === "_pick_crystals") return "Cristais de arena";
  return defOr(id)?.name ?? id;
}

export function pickChoiceRarity(id: string): ArtifactRarity | null {
  if (id === "_pick_gold" || id === "_pick_restore" || id === "_pick_crystals")
    return null;
  return defOr(id)?.rarity ?? null;
}

const TONICO_DESC_FALLBACK =
  "Receba {valor} de regeneração de mana adicional, equivalente a {pct}% da sua regeneração de vida.";

/** Texto do Tônico na run: `{pct}` = 50%×acúmulos; `{valor}` = mana extra (regen vida × 50% × acúmulos). */
function describeTonicoForRun(stacks: number, u: Unit | undefined): string {
  const tpl = defOr("tonico")?.description ?? TONICO_DESC_FALLBACK;
  const n = Math.max(1, stacks);
  const pct = 50 * n;
  let out = tpl.replace("{pct}", String(pct));
  if (!u) return out;
  const bonus = Math.floor(u.regenVida * 0.5 * n);
  return out.replace("{valor}", String(bonus));
}

/** Efeito resumido no nível de stack `s` (≥1). */
export function describeArtifactAtStack(
  id: string,
  s: number,
  u?: Unit,
): string {
  const n = Math.max(1, s);
  switch (id) {
    case "trevo":
      return `+${25 * n}% XP recebida (acúmulos somam).`;
    case "tonico":
      return describeTonicoForRun(n, u);
    case "motor_morte":
      return `Ao matar: salto ao vizinho do inimigo mais próximo no bioma do teu hex (hub = todos), básico imediato +${10 * n}% dano; se matar, encadeia. Sem alcance após salto: só o próximo básico leva o bônus.`;
    case "maos_venenosas": {
      const mv = Math.min(3, u?.artifacts["muralha_verdade"] ?? 0);
      const amp = mv <= 0 ? 0 : [1, 2, 3][mv - 1]!;
      const inst = 2 + amp;
      return `Ao causar dano: +${inst} instâncias de veneno. Causa ${3 * n} de dano por instância. Ignora a defesa.${amp > 0 ? ` (Amplicador de onda +${amp}.)` : ""}`;
    }
    case "ronin":
      return `+${20 * n}% acerto crítico; acima de 100% o excesso não aumenta crítico; cada 5% de excesso → +1 de dano.`;
    case "imortal":
      return `Abaixo de 50% HP: +${50 * n}% da regen vida.`;
    case "duro_pedra":
      return `Sem mover no turno: +${n} defesa; +${2 * n}% dano crítico ao receber exatamente 1 de dano.`;
    case "ruler":
      return `Ignore os efeitos dos biomas e receba + ${n} de movimento.`;
    case "braco_forte": {
      const eff = Math.min(n, 3);
      return `+${eff} uso(s) extra de básico por turno (máx. 3 com efeito).`;
    }
    case "curandeiro_batalha":
      return `Ao curar: +${2 * n} dano durante a wave.`;
    case "sylfid":
      return `+${15 * n}% potencial cura/escudo.`;
    case "escudo_sangue":
      return `Com escudo ao receber dano: devolve ${75 * n}% desse dano ao atacante.`;
    case "lamina_magica":
      return `Habilidades podem crítar; +${25 * n}% dano crítico em habilidades (mult. extra).`;
    case "olho_agucado":
      return `Instâncias de dano e cura podem dar crítico. +${10 * n}% ao multiplicador de dano crítico nesses ticks (máx. 6 acúmulos).`;
    case "vendaval_arcana":
      return `+${8 * n}% de dano com habilidades (não básico).`;
    case "ceu_partido":
      return `+${15 * n}% de dano com habilidades (não básico).`;
    case "espinhos_reais":
      return `Devolve ${8 * n}% do dano recebido de inimigos ao atacante.`;
    case "guerra_total": {
      const flat = [50, 120, 210][n - 1] ?? 210;
      const pct = [20, 40, 75][n - 1] ?? 75;
      const ins = [1, 2, 3][n - 1] ?? 3;
      return `No início da wave: ${flat} + ${pct}% PV máx. por inimigo (metade em elite/chefe), ${ins} instância(s) de efeito Deslumbro (+50% dano recebido; não é DoT).`;
    }
    case "furacao_ouro":
      return `+${5 * n} ouro na bolsa por eliminação.`;
    case "garra_ferro": {
      const pct = 30 * n;
      return `+${pct}% da defesa convertidos em dano bruto (${Math.floor((u?.defesa ?? 0) * (pct / 100))} com defesa atual).`;
    }
    case "escama_leve": {
      const d = [2, 4, 6, 8, 10, 12][n - 1] ?? 12;
      const ins = [1, 1, 2, 2, 3, 3][n - 1] ?? 3;
      const ar = u ? Math.max(0, u.alcance - (u.statBaseline?.alcance ?? u.alcance)) : 0;
      return `Ao causar dano: ${ins} instância(s) de queimadura (${d} cada) por inimigo entre 1 e ${1 + ar} hexes do alvo (alcance extra na run = ${ar}). Regen natural bloqueada enquanto queimam.`;
    }
    case "muralha_verdade":
      return `+${[1, 2, 3][n - 1] ?? 3} instância(s) extra(s) nos teus efeitos de dano por instância (veneno, Labareda, sangramento da Furacão, etc.).`;
    case "manto_espectral":
      return `+${n} instância(s) de dano (veneno/queimadura/sangramento) consumida(s) por turno em todas as unidades. HoT não muda.`;
    case "pulso_verde":
      return `Ao matar: cura +${5 * n} em você e em cada aliado.`;
    case "seda_vampira":
      return `Sempre que se curar com roubo de vida, cause ${20 * n}% da sua cura como dano a todos inimigos no bioma.`;
    case "escudo_residual": {
      const caps = [100, 250, 400, 600, 900, 1500];
      const cap = caps[Math.min(n, caps.length) - 1] ?? 1500;
      return `Com vida cheia, cura por roubo de vida vira escudo até ${cap} (só este efeito conta para o teto).`;
    }
    case "fio_cruel":
      return `+${3 * n}% chance de cristal ao eliminar inimigos.`;
    case "crystal_extra":
      return `+${n} cristal(is) extra(s) sempre que um cristal cair por kill.`;
    case "passo_gigante": {
      const eff = Math.min(n, 3);
      return `+${eff} movimento (máx. 3 com efeito).`;
    }
    case "_pick_gold":
      return "+50 ouro na bolsa.";
    case "_pick_restore":
      return "Recupera toda a vida e mana.";
    case "_pick_crystals":
      return "+5 cristais na conta da run.";
    default: {
      const d = defOr(id);
      return d?.description ?? id;
    }
  }
}

export function describeArtifactNextStack(
  id: string,
  current: number,
  u?: Unit,
): string | null {
  const max = getArtifactMaxStacks(id);
  if (current >= max) return null;
  return describeArtifactAtStack(id, current + 1, u);
}

export function artifactStackCounterLabel(id: string, stacks: number): string {
  const max = getArtifactMaxStacks(id);
  return `${Math.min(stacks, max)}/${max}`;
}

/** Tooltip do codex: todos os tiers. `u` opcional (ex.: loja sandbox) para textos que dependem do herói. */
export function artifactCodexAllTiersHtml(id: string, u?: Unit): string {
  if (
    id === "_pick_gold" ||
    id === "_pick_restore" ||
    id === "_pick_crystals"
  ) {
    return `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(pickChoiceDisplayName(id))}</div><div class="artifact-tt-cur">${escapeHtml(describeArtifactAtStack(id, 1, u))}</div></div>`;
  }
  if (id === "tonico") {
    const d = defOr(id);
    const name = d?.name ?? id;
    const base = d?.description ?? TONICO_DESC_FALLBACK;
    const max = getArtifactMaxStacks(id);
    const parts: string[] = [
      `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(name)}</div>`,
    ];
    for (let s = 1; s <= max; s++) {
      const line = base.replace("{pct}", String(50 * s));
      parts.push(
        `<div class="artifact-tt-next"><strong>${s}/${max}:</strong> ${escapeHtml(line)}</div>`,
      );
    }
    parts.push(`</div>`);
    return parts.join("");
  }
  const d = defOr(id);
  const name = d?.name ?? id;
  const max = getArtifactMaxStacks(id);
  const parts: string[] = [
    `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(name)}</div>`,
  ];
  for (let s = 1; s <= max; s++) {
    parts.push(
      `<div class="artifact-tt-next"><strong>${s}/${max}:</strong> ${escapeHtml(describeArtifactAtStack(id, s, u))}</div>`,
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

/** SVG decorativo da “figura” da carta (símbolo central). */
export function artifactCardFigureSvg(artifactId: string): string {
  const sym: Record<string, string> = {
    garra_ferro: `<path fill="#5d4037" stroke="#3e2723" stroke-width="1" d="M14 38c2-8 4-14 8-18 2 6 1 12-2 18M20 36c1-7 3-12 6-16 3 5 2 11 0 16M26 34c0-6 2-10 4-13 3 4 3 9 2 13M32 32c-1-5 0-9 2-12 2 3 4 7 3 12"/><path fill="#8d6e63" d="M18 38 L22 22 L26 20 L30 24 L28 38 Z"/><path fill="#ff7043" stroke="#bf360c" stroke-width="0.8" d="M20 24 L24 18 L28 24 L26 28 L22 28 Z"/>`,
    escama_leve: `<circle cx="24" cy="26" r="10" fill="#e65100" opacity="0.35"/><path fill="#ff6f00" d="M24 10 Q34 18 32 28 Q30 38 24 42 Q18 38 16 28 Q14 18 24 10"/><path fill="#ffca28" d="M24 16 Q28 20 27 26 Q26 32 24 34 Q22 32 21 26 Q20 20 24 16"/><path fill="#fff59d" d="M22 22h4v6h-4z" opacity="0.7"/>`,
    muralha_verdade: `<path fill="none" stroke="#0277bd" stroke-width="2.5" d="M8 28 Q24 12 40 28"/><path fill="none" stroke="#4fc3f7" stroke-width="2" d="M10 32 Q24 20 38 32"/><path fill="none" stroke="#81d4fa" stroke-width="1.6" d="M12 36 Q24 26 36 36"/><circle cx="24" cy="26" r="4" fill="#01579b"/><circle cx="16" cy="30" r="2" fill="#29b6f6"/><circle cx="32" cy="30" r="2" fill="#29b6f6"/>`,
    manto_espectral: `<circle cx="24" cy="24" r="14" fill="none" stroke="#7e57c2" stroke-width="1.5" stroke-dasharray="4 3"/><path fill="none" stroke="#b39ddb" stroke-width="2" d="M12 24h24M24 12v24"/><circle cx="24" cy="24" r="6" fill="#5e35b1" opacity="0.5"/><path fill="none" stroke="#d1c4e9" stroke-width="1.2" d="M18 18 Q24 22 30 18 M18 30 Q24 26 30 30"/>`,
    trevo: `<path fill="#2e7d32" d="M24 8c-2 4-6 6-8 10 4 0 8-2 10-6-4 2-6-1-2-4zm0 0c2 4 6 6 8 10-4 0-8-2-10-6 4 2 6-1 2-4zm-8 12c4 3 4 9 0 12 3-4 9-4 12 0-3-4-1-8-5-8-3 4-7 4-7zm16 0c-4 3-4 9 0 12-3-4-9-4-12 0 3-4 1-8 5-8 3 4 7 4 7z"/><circle cx="24" cy="28" r="3" fill="#66bb6a"/>`,
    tonico: `<rect x="14" y="12" width="20" height="26" rx="3" fill="#5c6bc0" stroke="#3949ab"/><path fill="#9fa8da" d="M18 18h12v8H18z"/><path fill="#fff" d="M20 22h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2z"/>`,
    motor_morte: `<path fill="#ffee58" stroke="#e65100" stroke-width="1.4" stroke-linejoin="round" d="M30 3 L14 25h11l-7 21 22-26h-10l10-17z"/>`,
    maos_venenosas: `<path fill="#6a1b9a" d="M18 32 Q24 8 30 32 Z"/><circle cx="20" cy="26" r="2" fill="#ce93d8"/><circle cx="28" cy="26" r="2" fill="#ce93d8"/>`,
    ronin: `<path fill="#b71c1c" d="M12 36 L24 10 L36 36 Z" stroke="#3e2723" stroke-width="1"/><path fill="#eceff1" d="M22 20h4v14h-4z"/>`,
    imortal: `<path fill="#c62828" d="M24 12 C32 20 32 32 24 38 C16 32 16 20 24 12"/><path fill="#ffcdd2" d="M24 22v10" stroke="#fff" stroke-width="2"/>`,
    duro_pedra: `<rect x="10" y="14" width="28" height="22" rx="2" fill="#78909c" stroke="#455a64"/><path fill="#546e7a" d="M14 18h20v4H14zm0 8h20v4H14z"/>`,
    ruler: `<rect x="8" y="10" width="32" height="28" rx="2" fill="#eceff1" stroke="#37474f"/><path fill="none" stroke="#1976d2" stroke-width="2" d="M14 18h20M14 24h16M14 30h20"/><circle cx="24" cy="20" r="3" fill="#ffd54f"/>`,
    braco_forte: `<ellipse cx="24" cy="28" rx="12" ry="8" fill="#d7ccc8"/><path fill="#8d6e63" d="M16 20h16v12H16z"/><path fill="#5d4037" d="M20 14h8v10h-8z"/>`,
    curandeiro_batalha: `<path fill="#43a047" d="M24 8v32M8 24h32" stroke="#2e7d32" stroke-width="4"/><circle cx="24" cy="24" r="10" fill="none" stroke="#66bb6a" stroke-width="2"/>`,
    sylfid: `<path fill="#26a69a" d="M14 36 Q24 6 34 36 Q24 28 14 36"/><circle cx="24" cy="22" r="6" fill="#b2dfdb"/>`,
    escudo_sangue: `<path fill="#c62828" d="M24 8 L38 14 V28 Q24 38 10 28 V14 Z" stroke="#5d1010" stroke-width="1"/><path fill="#ff8a80" d="M24 14 L32 18 V26 Q24 32 16 26 V18 Z"/>`,
    escudo_residual: `<path fill="#1565c0" d="M24 8 L38 14 V28 Q24 38 10 28 V14 Z" stroke="#0d47a1" stroke-width="1"/><path fill="#81d4fa" d="M24 14 L32 18 V26 Q24 32 16 26 V18 Z"/><path fill="none" stroke="#e3f2fd" stroke-width="1" d="M18 22h12M24 16v14"/>`,
    lamina_magica: `<path fill="#7e57c2" d="M14 34 L24 8 L34 34 Z" stroke="#311b92"/><path fill="#b39ddb" d="M22 16h4v12h-4z"/><circle cx="24" cy="30" r="3" fill="#ffd54f"/>`,
    guerra_total: `<path fill="#e8eaf6" stroke="#b0bec5" stroke-width="0.6" d="M38 6 L28 22 L32 24 L24 40 L26 18 L20 16 Z"/><path fill="#ffffff" stroke="#eceff1" stroke-width="0.5" opacity="0.95" d="M34 8 L27 20 L30 21 L24 34 L25 19 L21 17 Z"/><path fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.9" d="M36 7 Q22 14 10 26"/><path fill="none" stroke="#f5f5f5" stroke-width="1.4" stroke-linecap="round" opacity="0.75" d="M33 10 Q20 16 8 28"/>`,
    olho_agucado: `<ellipse cx="24" cy="26" rx="16" ry="6" fill="none" stroke="#00838f" stroke-width="1.4" opacity="0.85"/><ellipse cx="24" cy="26" rx="11" ry="4" fill="none" stroke="#26c6da" stroke-width="1.2"/><ellipse cx="24" cy="26" rx="6" ry="2.2" fill="none" stroke="#80deea" stroke-width="1"/><circle cx="24" cy="26" r="2.5" fill="#b2ebf2"/><path fill="none" stroke="#4dd0e1" stroke-width="1" d="M8 26 Q24 14 40 26"/>`,
    _pick_gold: `<circle cx="24" cy="24" r="14" fill="#c9a227" stroke="#6a5018"/><circle cx="24" cy="22" r="9" fill="#e8c84a"/><ellipse cx="24" cy="19" rx="6" ry="2.5" fill="#f5d76e"/>`,
    _pick_restore: `<path fill="#43a047" d="M24 8v32M8 24h32" stroke="#1b5e20" stroke-width="3"/><circle cx="24" cy="24" r="12" fill="none" stroke="#66bb6a" stroke-width="2"/>`,
    _pick_crystals: `<path fill="#7e57c2" d="M24 8l4 8 8 2-6 6 1 9-7-4-7 4 1-9-6-6 8-2z" stroke="#4527a0" stroke-width="0.8"/><path fill="#b39ddb" d="M24 14l2.5 5 5.5 1.2-4 4 .7 5.8-4.7-2.5-4.7 2.5.7-5.8-4-4 5.5-1.2z"/>`,
  };
  return (
    sym[artifactId] ??
    `<circle cx="24" cy="24" r="16" fill="#78909c"/><path fill="#eceff1" d="M18 24h12M24 18v12" stroke="#37474f" stroke-width="2"/>`
  );
}

export function artifactCardInnerHtml(artifactId: string): string {
  const inner = artifactCardFigureSvg(artifactId);
  return `<svg class="artifact-card-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

export function artifactTooltipHtml(
  id: string,
  stacks: number,
  u: Unit | undefined,
  opts?: { showNext?: boolean },
): string {
  const d = defOr(id);
  const name = d?.name ?? pickChoiceDisplayName(id);
  const s = Math.max(1, stacks);
  const cur = describeArtifactAtStack(id, s, u);
  const next =
    opts?.showNext !== false
      ? describeArtifactNextStack(id, stacks, u)
      : null;
  let body = `<div class="artifact-tt-name">${escapeHtml(name)}</div><div class="artifact-tt-cur"><strong>Agora (${artifactStackCounterLabel(id, stacks)}):</strong> ${escapeHtml(cur)}</div>`;
  if (next) {
    body += `<div class="artifact-tt-next"><strong>Próximo (${artifactStackCounterLabel(id, stacks + 1)}):</strong> ${escapeHtml(next)}</div>`;
  } else {
    body += `<div class="artifact-tt-max">Nível máximo.</div>`;
  }
  return `<div class="artifact-tt">${body}</div>`;
}

export function artifactPickChoiceTooltip(id: string, u: Unit): string {
  if (
    id === "_pick_gold" ||
    id === "_pick_restore" ||
    id === "_pick_crystals"
  ) {
    return `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(pickChoiceDisplayName(id))}</div><div class="artifact-tt-cur">${escapeHtml(describeArtifactAtStack(id, 1))}</div></div>`;
  }
  const cur = u.artifacts[id] ?? 0;
  const max = getArtifactMaxStacks(id);
  const d = defOr(id);
  const name = d?.name ?? id;
  const nextSt = Math.min(cur + 1, max);
  const nextDesc = describeArtifactAtStack(id, nextSt, u);
  let html = `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(name)}</div>`;
  if (cur > 0) {
    html += `<div class="artifact-tt-cur"><strong>Atual (${artifactStackCounterLabel(id, cur)}):</strong> ${escapeHtml(describeArtifactAtStack(id, cur, u))}</div>`;
  }
  html += `<div class="artifact-tt-next"><strong>Se escolher (${nextSt}/${max}):</strong> ${escapeHtml(nextDesc)}</div>`;
  if (cur + 2 <= max) {
    const after = describeArtifactAtStack(id, cur + 2, u);
    html += `<div class="artifact-tt-next"><strong>Depois (${cur + 2}/${max}):</strong> ${escapeHtml(after)}</div>`;
  }
  html += `</div>`;
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
