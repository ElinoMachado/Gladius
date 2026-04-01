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

/** Limite padrão de empilhamento (cartas). */
export const DEFAULT_ARTIFACT_MAX_STACK = 6;

/** Limites explícitos por ID. */
const SPECIAL_MAX: Record<string, number> = {
  garra_ferro: 6,
  pulso_verde: 12,
  seda_vampira: 10,
  fio_cruel: 10,
  crystal_extra: 4,
  braco_forte: 999,
  passo_gigante: 3,
  martelo_juiz: 3,
  manto_espectral: 3,
  guerra_total: 2,
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

function canTakeArtifact(u: Unit, id: string): boolean {
  if (id.startsWith("_pick")) return true;
  return (u.artifacts[id] ?? 0) < getArtifactMaxStacks(id);
}

export function randomArtifactChoicesForHero(
  u: Unit,
  count: number,
  sorte: number,
  exclude: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  const picked = new Set(exclude);

  const tryPickOne = (): string | null => {
    const primary = rollArtifactRarity(sorte);
    const order: ArtifactRarity[] = [
      primary,
      ...ARTIFACT_RARITY_ORDER.filter((r) => r !== primary),
    ];
    for (const tr of order) {
      const pool = ARTIFACT_POOL.filter(
        (a) => a.rarity === tr && !picked.has(a.id) && canTakeArtifact(u, a.id),
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
  return defOr(id)?.name ?? id;
}

export function pickChoiceRarity(id: string): ArtifactRarity | null {
  if (id === "_pick_gold" || id === "_pick_restore") return null;
  return defOr(id)?.rarity ?? null;
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
    case "tonico": {
      const rv = u?.regenVida ?? 0;
      const bonus = Math.floor(rv * 0.5 * n);
      return `+${bonus} mana por turno (metade da regen vida × ${n} acúmulo(s); base regen ${rv}).`;
    }
    case "motor_morte":
      return `Ao matar: salto ao inimigo mais próximo; próximo básico +${10 * n}% dano.`;
    case "maos_venenosas":
      return `Veneno em qualquer dano seu: ${25 * n}% do dano bruto por turno, ${3 + n} turno(s).`;
    case "ronin":
      return `+${20 * n}% acerto crítico; acima de 100% o excesso não aumenta crítico; cada 5% de excesso → +1 de dano.`;
    case "imortal":
      return `Abaixo de 50% HP: +${50 * n}% da regen vida.`;
    case "duro_pedra":
      return `Sem mover no turno: +${n} defesa; +${2 * n}% dano crítico ao receber exatamente 1 de dano.`;
    case "ruler":
      return `Ignora penalidades de bioma (defesa, alcance, regen, movimento pantano) e dano ambiental do vulcânico; +${n} movimento.`;
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
    case "vendaval_arcana":
      return `+${8 * n}% de dano com habilidades (não básico).`;
    case "ceu_partido":
      return `+${15 * n}% de dano com habilidades (não básico).`;
    case "espinhos_reais":
      return `Devolve ${8 * n}% do dano recebido de inimigos ao atacante.`;
    case "furacao_ouro":
      return `+${5 * n} ouro na bolsa por eliminação.`;
    case "garra_ferro": {
      const pct = 30 * n;
      return `+${pct}% da defesa convertidos em dano bruto (${Math.floor((u?.defesa ?? 0) * (pct / 100))} com defesa atual).`;
    }
    case "pulso_verde":
      return `Ao matar: cura +${5 * n} em você e em cada aliado.`;
    case "seda_vampira":
      return `Cura em HP: ${20 * n}% desse valor como dano bruto a inimigos no seu bioma.`;
    case "fio_cruel":
      return `+${3 * n}% chance de cristal ao eliminar inimigos.`;
    case "crystal_extra":
      return `+${n} cristal(is) extra(s) sempre que um cristal cair por kill.`;
    case "passo_gigante": {
      const eff = Math.min(n, 3);
      return `+${eff} movimento (máx. 3 com efeito).`;
    }
    case "_pick_gold":
      return "+75 ouro na bolsa.";
    case "_pick_restore":
      return "Recupera toda a vida e mana.";
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
  if (id === "_pick_gold" || id === "_pick_restore") {
    return `<div class="artifact-tt"><div class="artifact-tt-name">${escapeHtml(pickChoiceDisplayName(id))}</div><div class="artifact-tt-cur">${escapeHtml(describeArtifactAtStack(id, 1, u))}</div></div>`;
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
    trevo: `<path fill="#2e7d32" d="M24 8c-2 4-6 6-8 10 4 0 8-2 10-6-4 2-6-1-2-4zm0 0c2 4 6 6 8 10-4 0-8-2-10-6 4 2 6-1 2-4zm-8 12c4 3 4 9 0 12 3-4 9-4 12 0-3-4-1-8-5-8-3 4-7 4-7zm16 0c-4 3-4 9 0 12-3-4-9-4-12 0 3-4 1-8 5-8 3 4 7 4 7z"/><circle cx="24" cy="28" r="3" fill="#66bb6a"/>`,
    tonico: `<rect x="14" y="12" width="20" height="26" rx="3" fill="#5c6bc0" stroke="#3949ab"/><path fill="#9fa8da" d="M18 18h12v8H18z"/><path fill="#fff" d="M20 22h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2z"/>`,
    motor_morte: `<circle cx="24" cy="26" r="14" fill="#424242" stroke="#212121"/><path fill="#ff7043" d="M24 10 L32 28 L16 28 Z"/><circle cx="24" cy="24" r="4" fill="#ffab91"/>`,
    maos_venenosas: `<path fill="#6a1b9a" d="M18 32 Q24 8 30 32 Z"/><circle cx="20" cy="26" r="2" fill="#ce93d8"/><circle cx="28" cy="26" r="2" fill="#ce93d8"/>`,
    ronin: `<path fill="#b71c1c" d="M12 36 L24 10 L36 36 Z" stroke="#3e2723" stroke-width="1"/><path fill="#eceff1" d="M22 20h4v14h-4z"/>`,
    imortal: `<path fill="#c62828" d="M24 12 C32 20 32 32 24 38 C16 32 16 20 24 12"/><path fill="#ffcdd2" d="M24 22v10" stroke="#fff" stroke-width="2"/>`,
    duro_pedra: `<rect x="10" y="14" width="28" height="22" rx="2" fill="#78909c" stroke="#455a64"/><path fill="#546e7a" d="M14 18h20v4H14zm0 8h20v4H14z"/>`,
    ruler: `<rect x="8" y="10" width="32" height="28" rx="2" fill="#eceff1" stroke="#37474f"/><path fill="none" stroke="#1976d2" stroke-width="2" d="M14 18h20M14 24h16M14 30h20"/><circle cx="24" cy="20" r="3" fill="#ffd54f"/>`,
    braco_forte: `<ellipse cx="24" cy="28" rx="12" ry="8" fill="#d7ccc8"/><path fill="#8d6e63" d="M16 20h16v12H16z"/><path fill="#5d4037" d="M20 14h8v10h-8z"/>`,
    curandeiro_batalha: `<path fill="#43a047" d="M24 8v32M8 24h32" stroke="#2e7d32" stroke-width="4"/><circle cx="24" cy="24" r="10" fill="none" stroke="#66bb6a" stroke-width="2"/>`,
    sylfid: `<path fill="#26a69a" d="M14 36 Q24 6 34 36 Q24 28 14 36"/><circle cx="24" cy="22" r="6" fill="#b2dfdb"/>`,
    escudo_sangue: `<path fill="#c62828" d="M24 8 L38 14 V28 Q24 38 10 28 V14 Z" stroke="#5d1010" stroke-width="1"/><path fill="#ff8a80" d="M24 14 L32 18 V26 Q24 32 16 26 V18 Z"/>`,
    lamina_magica: `<path fill="#7e57c2" d="M14 34 L24 8 L34 34 Z" stroke="#311b92"/><path fill="#b39ddb" d="M22 16h4v12h-4z"/><circle cx="24" cy="30" r="3" fill="#ffd54f"/>`,
    _pick_gold: `<circle cx="24" cy="24" r="14" fill="#c9a227" stroke="#6a5018"/><circle cx="24" cy="22" r="9" fill="#e8c84a"/><ellipse cx="24" cy="19" rx="6" ry="2.5" fill="#f5d76e"/>`,
    _pick_restore: `<path fill="#43a047" d="M24 8v32M8 24h32" stroke="#1b5e20" stroke-width="3"/><circle cx="24" cy="24" r="12" fill="none" stroke="#66bb6a" stroke-width="2"/>`,
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
  if (id === "_pick_gold" || id === "_pick_restore") {
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
