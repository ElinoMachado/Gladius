import type { Unit } from "./types";
import {
  ARTIFACT_POOL,
  artifactDefById,
  type ArtifactDef,
} from "./data/artifacts";
import {
  ARTIFACT_RARITY_LABELS,
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

/** Ordem crescente para a faixa de “vagas” na UI (comum → mítico). */
export const ARTIFACT_RARITY_SLOTS_DISPLAY_ORDER: ArtifactRarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
];

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
  alento_morte: 1,
  garra_ferro: 6,
  pulso_verde: 12,
  seda_vampira: 10,
  fio_cruel: 10,
  crystal_extra: 4,
  gota_azul: 4,
  raiz_vida: 4,
  braco_forte: 3,
  passo_gigante: 5,
  torrente_menor: 6,
  sol_interior: 6,
  sorte_prata: 3,
  martelo_juiz: 3,
  muralha_verdade: 3,
  manto_espectral: 5,
  olho_agucado: 6,
  guerra_total: 3,
  ira_dimensao: 2,
  carne_eterna: 3,
  penumbra: 3,
  aura_tita: 6,
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
  opts?: { bypassRarityCaps?: boolean; bannedIds?: Set<string> },
): string[] {
  const out: string[] = [];
  const picked = new Set(exclude);
  const bypass = opts?.bypassRarityCaps ?? false;
  const banned = opts?.bannedIds;

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
          !(banned?.has(a.id)) &&
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

/** Uma carta aleatória (ou null se o pool estiver esgotado com os excludes/bans atuais). */
export function randomOneArtifactChoice(
  u: Unit,
  sorte: number,
  exclude: Set<string>,
  opts?: { bypassRarityCaps?: boolean; bannedIds?: Set<string> },
): string | null {
  const arr = randomArtifactChoicesForHero(u, 1, sorte, exclude, opts);
  return arr[0] ?? null;
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
    case "alento_morte":
      return "Ao iniciar o teu turno, morres de imediato: cada aliado vivo recebe 1 instância de Bravura (+1 ataque básico neste turno; expira no fim do turno de cada um).";
    case "ronin":
      return `+${20 * n}% acerto crítico; acima de 100% o excesso não aumenta crítico; cada 5% de excesso → +1 de dano.`;
    case "imortal":
      return `Abaixo de 50% HP: +${50 * n}% da regen vida.`;
    case "anel_penetrante":
      return `+${6 * n} de penetração.`;
    case "duro_pedra":
      return `Sem mover no turno: +${5 * n} defesa; +${2 * n}% dano crítico ao receber exatamente 1 de dano.`;
    case "ruler":
      return `Ignore os efeitos dos biomas e receba + ${n} de movimento.`;
    case "braco_forte":
      return `+${n} uso(s) extra de básico por turno (máx. 3).`;
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
    case "aura_tita":
      return `+${50 * n} de escudo no início da wave; +${50} de escudo ao ganhar este acúmulo.`;
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
    case "gota_azul":
      return `Ao morrer: +${30 * n} defesa a cada aliado vivo até ao fim da wave (efeitos de morte acumulam).`;
    case "raiz_vida":
      return `Ao morrer: ${6 * n} de dano a cada inimigo na arena (efeitos de morte acumulam).`;
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
    case "passo_gigante":
      return `+${20 * n}% de dano contra elites e chefes (máx. 5 acúmulos).`;
    case "torrente_menor": {
      const inst = 2 * n;
      return `Ao causar dano: +${inst} instância(s) de congelamento; inimigos congelados têm metade do movimento; dano bruto extra = ⌊½ movimento base do inimigo⌋ × ${n}.`;
    }
    case "sol_interior": {
      const inst = 2 * n;
      return `Ao causar dano: +${inst} instância(s) de choque; inimigos em choque têm metade do alcance; dano bruto extra = alcance base do inimigo × ${n}.`;
    }
    case "carne_eterna":
      return `Curas ressuscitam aliados caídos; +${50 * n}% potencial de cura e escudo.`;
    case "sorte_prata": {
      const need = 2 + n;
      return `Embosca: precisas de ${need} ou mais inimigos adjacentes no chão para o movimento ser bloqueado (+${n} face ao mínimo de 2).`;
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
    alento_morte: `<path fill="none" stroke="#78909c" stroke-width="1.4" d="M24 8v32"/><path fill="#b0bec5" d="M16 18c0-4 4-8 8-8s8 4 8 8v6H16v-6z"/><path fill="#37474f" d="M18 26h12v6H18z"/><circle cx="20" cy="22" r="2" fill="#eceff1"/><circle cx="28" cy="22" r="2" fill="#eceff1"/>`,
    ronin: `<path fill="#b71c1c" d="M12 36 L24 10 L36 36 Z" stroke="#3e2723" stroke-width="1"/><path fill="#eceff1" d="M22 20h4v14h-4z"/>`,
    imortal: `<path fill="#c62828" d="M24 12 C32 20 32 32 24 38 C16 32 16 20 24 12"/><path fill="#ffcdd2" d="M24 22v10" stroke="#fff" stroke-width="2"/>`,
    aura_tita: `<path d="M14 28 Q24 8 34 28 L36 34 Q24 40 12 34 Z" fill="#eceff1" stroke="#78909c" stroke-width="1"/><path d="M16 26 Q24 22 32 26" fill="none" stroke="#546e7a"/><ellipse cx="30" cy="16" rx="5" ry="3" fill="#fff59d" opacity="0.95"/><path d="M18 30h12v2Q24 36 18 32z" fill="#b0bec5"/>`,
    sorte_prata: `<path fill="none" stroke="#42a5f5" stroke-width="2" stroke-linecap="round" d="M6 34c10-6 8-18-2-14M4 26c8-4 6-12-2-10"/><circle cx="28" cy="22" r="7" fill="#1976d2"/><path fill="none" stroke="#90caf9" stroke-width="1.8" stroke-linecap="round" d="M36 16l8-3M36 22h10M36 28l8 3"/>`,
    vendaval_arcana: `<rect x="22" y="10" width="4" height="30" rx="1" fill="#4e342e"/><ellipse cx="24" cy="10" rx="7" ry="4" fill="#7e57c2" stroke="#4527a0" stroke-width="0.8"/><path d="M24 6 L19 2 L29 2 Z" fill="#d1c4e9"/>`,
    fio_cruel: `<path fill="#9575cd" d="M12 30l3.5-7 3.5 7-3.5 5z"/><path fill="#7e57c2" d="M22 32l2.5-6 2.5 6-2.5 4z"/><path fill="#b39ddb" d="M30 28l3-6 3 6-3 5z"/><path fill="#5e35b1" d="M17 18l2-4 2 4-2 3z" opacity="0.85"/>`,
    pacto_rubro: `<path fill="#b71c1c" d="M11 36 L24 6 L27 6 L15 38z"/><path fill="#5d4037" d="M22 8h5v28h-5z"/><path fill="#c62828" d="M12 34 Q17 40 24 36 Q20 38 14 36" opacity="0.9"/><path fill="#ff5252" d="M14 32 Q16 35 18 33" opacity="0.7"/>`,
    instinto: `<path fill="#2e7d32" d="M24 10c-3 0-5 3-3 5-3 1-4 5-1 6-2 3 1 6 4 5 1 3 5 3 6 0 3 2 6-1 5-4 3-1 3-5 0-6 2-2 0-5-3-5-1-3-5-3-6-1-2-2-5 0-5z"/><circle cx="24" cy="22" r="2.5" fill="#a5d6a7"/><path fill="none" stroke="#1b5e20" stroke-width="0.8" d="M24 14v16M16 22h16"/>`,
    pulso_verde: `<path fill="#2e7d32" d="M24 38 C10 28 12 14 24 10 C36 14 38 28 24 38z"/><path fill="#66bb6a" d="M24 16 C18 22 20 30 24 34 C28 30 30 22 24 16z"/><path fill="#c8e6c9" d="M24 20 C22 24 23 28 24 30 C25 28 26 24 24 20z"/>`,
    seda_vampira: `<path fill="#311b92" d="M12 18 Q24 36 36 18 Q24 28 12 18"/><path fill="#fce4ec" d="M16 20 Q24 30 32 20 L30 24 Q24 32 18 24 Z"/><path fill="#fff" d="M17 21 L19 27 L21 21 M23 21 L24 27 L25 21 M27 21 L29 27 L31 21" stroke="#880e4f" stroke-width="0.6"/>`,
    furacao_ouro: `<path fill="none" stroke="#f9a825" stroke-width="1.2" d="M24 10 Q38 24 24 38 Q10 24 24 10" opacity="0.7"/><ellipse cx="18" cy="16" rx="6" ry="3.5" fill="#ffc107" stroke="#f57f17"/><ellipse cx="30" cy="20" rx="5" ry="3" fill="#ffca28" stroke="#f9a825" transform="rotate(25 30 20)"/><ellipse cx="20" cy="30" rx="5" ry="3" fill="#ffd54f" stroke="#ff8f00" transform="rotate(-35 20 30)"/><ellipse cx="28" cy="32" rx="4" ry="2.5" fill="#ffe082" stroke="#ffa000"/>`,
    duro_pedra: `<ellipse cx="24" cy="40" rx="11" ry="3.5" fill="#455a64" opacity="0.45"/><path d="M15 18 Q24 12 33 18 L35 34 Q24 38 13 34 Z" fill="#78909c" stroke="#455a64" stroke-width="1"/><circle cx="20" cy="22" r="2.2" fill="#37474f"/><circle cx="28" cy="22" r="2.2" fill="#37474f"/><path d="M19 28h10" stroke="#37474f" stroke-width="1"/><path d="M17 30l3 5M24 30v6M31 30l-3 5" stroke="#607d8b" stroke-width="1.2"/>`,
    anel_penetrante: `<ellipse cx="24" cy="24" rx="15" ry="11" fill="none" stroke="#6a1b9a" stroke-width="3.5"/><ellipse cx="24" cy="24" rx="9" ry="6" fill="none" stroke="#ce93d8" stroke-width="1.8"/><circle cx="24" cy="24" r="4" fill="#4a148c" opacity="0.35"/>`,
    gota_azul: `<path fill="none" stroke="#1565c0" stroke-width="2" d="M24 8v8"/><path fill="#42a5f5" stroke="#0d47a1" stroke-width="0.8" d="M24 14 C18 22 14 28 14 32 C14 38 18 42 24 42 C30 42 34 38 34 32 C34 28 30 22 24 14"/><path fill="#90caf9" d="M20 30h8v6a4 4 0 0 1-8 0v-6" opacity="0.9"/>`,
    raiz_vida: `<circle cx="24" cy="24" r="4" fill="#ffcdd2" stroke="#b71c1c" stroke-width="1.2"/><path fill="none" stroke="#c62828" stroke-width="2.2" stroke-linecap="round" d="M24 10v6M24 32v6M10 24h6M32 24h6M14 14l5 5M29 29l5 5M34 14l-5 5M19 29l-5 5"/><path fill="#e53935" d="M24 18l3 6-3 4-3-4z" opacity="0.85"/>`,
    fel_simples: `<path fill="#558b2f" d="M6 38c4-2 8-1 10 2 2-4 6-6 10-4 2-3 7-4 10-1 1-4-2-7-6-6-3 3-8 8-8 12-3-2-8 0-10 3-4-1-8 1-10 4z"/><path fill="#7cb342" d="M8 36c6-8 14-10 22-6-2 4-8 6-14 6-4 4-10 3-8 0z"/><path fill="#aed581" d="M14 32 Q18 28 22 30 Q20 34 16 34z" opacity="0.9"/>`,
    carne_eterna: `<ellipse cx="24" cy="36" rx="14" ry="5" fill="#e1bee7" opacity="0.5"/><path fill="#fffde7" d="M24 8 L32 14 L30 28 L24 34 L18 28 L16 14 Z" stroke="#fbc02d" stroke-width="0.8"/><circle cx="24" cy="18" r="5" fill="#fff9c4"/><path fill="none" stroke="#fbc02d" stroke-width="1.2" d="M19 16c2 2 8 2 10 0"/><path fill="#7e57c2" d="M12 22 Q24 12 36 22 L34 30 Q24 24 14 30 Z" opacity="0.85"/>`,
    crystal_extra: `<path fill="#b388ff" stroke="#4527a0" stroke-width="1.2" d="M24 6 L38 22 L24 42 L10 22 Z"/><path fill="#e1bee7" d="M24 12 L32 22 L24 34 L16 22 Z"/><path fill="#ede7f6" d="M24 18 L28 22 L24 28 L20 22 Z"/>`,
    passo_gigante: `<path fill="#ffd54f" stroke="#f57f17" stroke-width="1" d="M12 20 L24 8 L36 20 L32 36 L16 36 Z"/><circle cx="24" cy="22" r="5" fill="#ffecb3"/><path fill="none" stroke="#e65100" stroke-width="1.4" d="M18 18 L22 22 L18 26 M26 18 L30 22 L26 26"/><ellipse cx="24" cy="14" rx="10" ry="4" fill="#ffc107" opacity="0.9"/>`,
    torrente_menor: `<path fill="#81d4fa" d="M28 8 L34 18 L30 38 L18 38 L14 18 L20 8 Z" stroke="#0277bd" stroke-width="1"/><path fill="#e1f5fe" d="M26 14 L30 20 L28 32 L20 32 L16 20 Z"/><path fill="#fff" d="M22 20h4v8h-4z" opacity="0.7"/><path fill="none" stroke="#4fc3f7" stroke-width="1" d="M10 26 Q24 18 38 26"/>`,
    sol_interior: `<path fill="none" stroke="#ffeb3b" stroke-width="2.5" stroke-linecap="round" d="M24 6v8M24 34v8M8 24h8M32 24h8M12 12l6 6M30 30l6 6M36 12l-6 6M18 30l-6 6"/><circle cx="24" cy="24" r="8" fill="#fff59d" stroke="#f9a825" stroke-width="1.2"/><path fill="#fbc02d" d="M24 20 L26 24 L24 28 L22 24 Z"/>`,
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

/**
 * Faixa de vagas por raridade: quantos **tipos** distintos ainda pode ter (acúmulos do mesmo tipo não ocupam vaga extra).
 */
export function artifactRaritySlotsStripHtml(u: Unit): string {
  const groups = ARTIFACT_RARITY_SLOTS_DISPLAY_ORDER.map((r) => {
    const max = MAX_DISTINCT_ARTIFACTS_BY_RARITY[r];
    const cur = countDistinctArtifactsOfRarity(u, r);
    const label = ARTIFACT_RARITY_LABELS[r];
    const title = escapeHtml(
      `${label}: ${cur}/${max} tipo(s) distinto(s). Acúmulos do mesmo artefato não ocupam nova vaga.`,
    );
    const slots = Array.from({ length: max }, (_, i) => {
      const filled = i < cur;
      return `<span class="artifact-rarity-slot ${artifactRarityClass(r)} ${
        filled ? "artifact-rarity-slot--filled" : "artifact-rarity-slot--empty"
      }" aria-hidden="true"></span>`;
    }).join("");
    return `<div class="artifact-rarity-slots__group" title="${title}"><span class="artifact-rarity-slots__slots">${slots}</span></div>`;
  }).join("");
  return `<div class="artifact-rarity-slots" role="group" aria-label="Vagas de tipos distintos por raridade: 3 comuns, 3 incomuns, 2 raros, 2 lendários, 1 mítico">${groups}</div>`;
}
