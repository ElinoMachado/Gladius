import type {
  BiomeId,
  ForgeEssenceId,
  ForgeHeroLoadout,
  ForgeSlotKind,
  MetaProgress,
  Unit,
} from "./types";
import { COMBAT_BIOMES } from "./data/biomes";
import { biomeCrestWrap } from "../ui/biomeCrests";
import { statIconWrap, type StatIconId } from "../ui/statIcons";

export const FORGE_ESSENCE_LABELS: Record<ForgeEssenceId, string> = {
  vulcanico: "Essência vulcânica",
  pantano: "Essência do pântano",
  floresta: "Essência da floresta",
  montanhoso: "Essência da montanha",
  rochoso: "Essência rochosa",
  deserto: "Essência do deserto",
};

export function biomeToEssenceId(b: BiomeId): ForgeEssenceId | null {
  if (b === "hub") return null;
  return b as ForgeEssenceId;
}

/** Chance base só por wave: 5% na wave 1 → 50% na wave 50 (e depois). */
const ESS_PCT_WAVE_1 = 5;
const ESS_PCT_WAVE_CAP = 50;
const ESS_WAVE_CAP_AT = 50;

export function essenceBasePercentFromWave(wave: number): number {
  const w = Math.max(1, wave);
  if (w >= ESS_WAVE_CAP_AT) return ESS_PCT_WAVE_CAP;
  return (
    ESS_PCT_WAVE_1 +
    (ESS_PCT_WAVE_CAP - ESS_PCT_WAVE_1) *
      ((w - 1) / (ESS_WAVE_CAP_AT - 1))
  );
}

/** +1% por ponto de sorte (somado à base da wave). */
export function essenceSorteBonusPercent(sorte: number): number {
  return sorte;
}

/** Chance total em % (pode passar de 100; ver `resolveEssenceDropCount`). */
export function essenceDropTotalPercent(wave: number, sorte: number): number {
  return essenceBasePercentFromWave(wave) + essenceSorteBonusPercent(sorte);
}

/**
 * 1) Rola uma vez com chance min(total%, 100%).
 * 2) Para cada 10% acima de 100%, +1 essência garantida (sem rolar).
 */
export function resolveEssenceDropCount(totalPercent: number): number {
  const rollCap = Math.min(100, totalPercent);
  let count = Math.floor(Math.max(0, totalPercent - 100) / 10);
  if (Math.random() * 100 < rollCap) count += 1;
  return count;
}

/** Custo em essência do bioma do item: criar nv1, nv1→2, nv2→3 */
export const FORGE_COST_CREATE = 2;
export const FORGE_COST_UPGRADE_TO_2 = 4;
export const FORGE_COST_UPGRADE_TO_3 = 5;

/** Conta slots com peça **nv 3** daquele bioma (só nv 3 entra na sinergia). */
export function countForgeBiomePieces(
  loadout: ForgeHeroLoadout | undefined,
  biome: ForgeEssenceId,
): number {
  if (!loadout) return 0;
  let n = 0;
  for (const k of ["helmo", "capa", "manoplas"] as const) {
    const p = loadout[k];
    if (p?.biome === biome && p.level === 3) n++;
  }
  return n;
}

export function forgeSynergyTier(
  loadout: ForgeHeroLoadout | undefined,
  biome: ForgeEssenceId,
): 0 | 1 | 2 | 3 {
  const n = countForgeBiomePieces(loadout, biome);
  if (n >= 3) return 3;
  if (n === 2) return 2;
  if (n === 1) return 1;
  return 0;
}

export function emptyForgeLoadout(): ForgeHeroLoadout {
  return {};
}

export function cloneForgeLoadout(l: ForgeHeroLoadout): ForgeHeroLoadout {
  const o: ForgeHeroLoadout = {};
  if (l.helmo) o.helmo = { ...l.helmo };
  if (l.capa) o.capa = { ...l.capa };
  if (l.manoplas) o.manoplas = { ...l.manoplas };
  return o;
}

/** Aplica bônus de forja ao herói (stats já com meta + party). */
export function applyForgeGearToUnit(u: Unit, loadout: ForgeHeroLoadout): void {
  u.forgeLoadout = cloneForgeLoadout(loadout);
  const h = loadout.helmo;
  if (h) {
    const hel =
      h.level === 1
        ? { mov: 1, alc: 0 }
        : h.level === 2
          ? { mov: 1, alc: 1 }
          : { mov: 2, alc: 2 };
    u.movimento += hel.mov;
    u.alcance += hel.alc;
  }
  const c = loadout.capa;
  if (c) {
    /** Só o pacote do nível atual (como elmo/manoplas), sem somar nv1+nv2+nv3. */
    if (c.level === 1) {
      u.maxHp += 100;
      u.hp += 100;
      u.defesa += 5;
    } else if (c.level === 2) {
      u.maxHp += 200;
      u.hp += 200;
      u.defesa += 10;
    } else {
      u.maxHp += 500;
      u.hp += 500;
      u.defesa += 25;
    }
  }
  const m = loadout.manoplas;
  if (m) {
    const mn =
      m.level === 1
        ? { dano: 10, c: 25, cd: 0 }
        : m.level === 2
          ? { dano: 25, c: 50, cd: 0.25 }
          : { dano: 50, c: 100, cd: 0.5 };
    u.dano += mn.dano;
    u.acertoCritico += mn.c;
    u.danoCritico += mn.cd;
  }
  if (forgeSynergyTier(loadout, "floresta") >= 2) {
    u.flying = true;
  }
}

export function forgeVisualKey(loadout: ForgeHeroLoadout | undefined): string {
  if (!loadout) return "";
  const bits: string[] = [];
  for (const k of ["helmo", "capa", "manoplas"] as const) {
    const p = loadout[k];
    if (p) bits.push(`${k}:${p.biome}:${p.level}`);
  }
  return bits.join("|");
}

/** Texto plano curto (acessibilidade / fallback); ícones em `forgePieceEffectHtml`. */
export function forgePieceDescription(
  slot: ForgeSlotKind,
  level: 1 | 2 | 3,
): string {
  if (slot === "helmo") {
    if (level === 1) return "+1 movimento";
    if (level === 2) return "+1 alcance, +1 movimento";
    return "+2 alcance, +2 movimento";
  }
  if (slot === "capa") {
    if (level === 1) return "+100 vida máx., +5 armadura";
    if (level === 2) return "+200 vida máx., +10 armadura";
    return "+500 vida máx., +25 armadura";
  }
  if (level === 1) return "+10 dano, +25% chance crítica";
  if (level === 2) return "+25 dano, +50% crítico, +25% dano crítico";
  return "+50 dano, +100% crítico, +50% dano crítico";
}

function forgeFxSeg(icon: StatIconId, uniq: { n: number }, text: string): string {
  return `<span class="forge-fx-seg">${statIconWrap(icon, uniq.n++)}<span class="forge-fx-txt">${escapeForgeHtml(text)}</span></span>`;
}

function forgeFxSep(text: string): string {
  return `<span class="forge-fx-sep">${escapeForgeHtml(text)}</span>`;
}

/**
 * Uma linha de efeito com ícones iguais ao grid do herói no combate (`lol-stat-ico`).
 */
export function forgePieceEffectHtml(
  kind: ForgeSlotKind,
  level: 1 | 2 | 3,
  uniqBase: number,
): string {
  const u = { n: uniqBase };
  const p: string[] = [];
  if (kind === "helmo") {
    if (level === 1) p.push(forgeFxSeg("mov", u, "+1 movimento"));
    else if (level === 2) {
      p.push(forgeFxSeg("range", u, "+1 alcance"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("mov", u, "+1 movimento"));
    } else {
      p.push(forgeFxSeg("range", u, "+2 alcance"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("mov", u, "+2 movimento"));
    }
  } else if (kind === "capa") {
    if (level === 1) {
      p.push(forgeFxSeg("regen_hp", u, "+100 vida máx."));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("def", u, "+5 armadura"));
    } else if (level === 2) {
      p.push(forgeFxSeg("regen_hp", u, "+200 vida máx."));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("def", u, "+10 armadura"));
    } else {
      p.push(forgeFxSeg("regen_hp", u, "+500 vida máx."));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("def", u, "+25 armadura"));
    }
  } else {
    if (level === 1) {
      p.push(forgeFxSeg("dmg", u, "+10 dano"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("crit_hit", u, "+25% chance crítica"));
    } else if (level === 2) {
      p.push(forgeFxSeg("dmg", u, "+25 dano"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("crit_hit", u, "+50% crítico"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("crit_dmg", u, "+25% dano crítico"));
    } else {
      p.push(forgeFxSeg("dmg", u, "+50 dano"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("crit_hit", u, "+100% crítico"));
      p.push(forgeFxSep(", "));
      p.push(forgeFxSeg("crit_dmg", u, "+50% dano crítico"));
    }
  }
  return `<div class="forge-piece-effect-line">${p.join("")}</div>`;
}

export function forgePieceSynergySummaryLine(
  piece: { biome: ForgeEssenceId },
  heroLoadout: ForgeHeroLoadout,
): string | null {
  const t = forgeSynergyTier(heroLoadout, piece.biome);
  if (t <= 0) return null;
  return `Sinergia ${piece.biome}: ${t}/3 peças nv 3 deste bioma no herói.`;
}

export function forgeSynergyDescriptionLines(
  biome: ForgeEssenceId,
): string[] {
  if (biome === "vulcanico") {
    return [
      "1 peça: ignora dano vulcânico no fim do turno. Com Ruler: +10 vida em vez de perder.",
      "2 peças: dano ambiental vulcânico contra inimigos é dobrado.",
      "3 peças: crítico com ataque básico aplica 50% do dano a todos os inimigos.",
    ];
  }
  if (biome === "deserto") {
    return [
      "1 peça: ignora anulação de regen no deserto. Com Ruler: regen normal no deserto.",
      "2 peças: dobra regeneração de vida e mana (fora do bloqueio do deserto).",
      "3 peças: ao subir de nível no deserto: cura 100% vida/mana da party; excesso vira escudo (100%).",
    ];
  }
  if (biome === "floresta") {
    return [
      "1 peça: na floresta, +2 alcance; inimigos na floresta não ganham +1 de alcance.",
      "2 peças: voo; mantém o bônus de alcance da floresta fora dela.",
      "3 peça: sorte dobrada.",
    ];
  }
  return [
    "1 peça: sem efeito.",
    "2 peças: sem efeito.",
    "3 peças: sem efeito.",
  ];
}

/** Tooltip do brasão no cartão de sinergia (3 níveis com destaque do que está ativo). */
export function forgeSynergyCrestTooltipHtml(
  biome: ForgeEssenceId,
  tier: 0 | 1 | 2 | 3,
): string {
  const lines = forgeSynergyDescriptionLines(biome);
  const title = FORGE_ESSENCE_LABELS[biome];
  let html = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeForgeHtml(title)}</div><p class="game-ui-tooltip-passive"><strong>Sinergia ${tier}/3 (só peças nv 3 contam)</strong></p><ul class="forge-tip-syn">`;
  for (let i = 0; i < 3; i++) {
    const line = lines[i] ?? "";
    const on = tier > i;
    html += `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
  }
  html += `</ul></div>`;
  return html;
}

/**
 * Loadout usado só para exibir sinergia na forja: nos slots já ocupados,
 * o bioma do &lt;select&gt; substitui o salvo (troca pendente conta como nv1).
 */
export function forgeLoadoutProjectedForSynergy(
  base: ForgeHeroLoadout,
  selectedPerSlot: Readonly<Record<ForgeSlotKind, ForgeEssenceId>>,
): ForgeHeroLoadout {
  const L = cloneForgeLoadout(base);
  for (const k of ["helmo", "capa", "manoplas"] as const) {
    const cur = L[k];
    const pick = selectedPerSlot[k];
    if (!cur) continue;
    if (cur.biome !== pick) L[k] = { biome: pick, level: 1 };
  }
  return L;
}

/** Tooltip HTML (equipamento modal / cartão inteiro). */
export function forgePieceCardTooltipHtml(
  kind: ForgeSlotKind,
  piece: { biome: ForgeEssenceId; level: 1 | 2 | 3 } | undefined,
  heroLoadout: ForgeHeroLoadout,
): string {
  if (!piece) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas"}</div><p class="game-ui-tooltip-passive">Sem peça forjada neste slot.</p></div>`;
  }
  const title =
    kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas";
  const titleWithLevel = `${title} - nv ${piece.level}`;
  const essenceLine = FORGE_ESSENCE_LABELS[piece.biome];
  const effectHtml = forgePieceEffectHtml(kind, piece.level, 320);
  const tier = forgeSynergyTier(heroLoadout, piece.biome);
  const synLines = forgeSynergyDescriptionLines(piece.biome);
  let synBlock = `<p class="game-ui-tooltip-passive"><strong>Sinergia (${FORGE_ESSENCE_LABELS[piece.biome]}, ${tier}/3 peças nv 3)</strong></p><ul class="forge-tip-syn">`;
  for (let i = 0; i < 3; i++) {
    const line = synLines[i] ?? "";
    const on = tier > i;
    synBlock += `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
  }
  synBlock += `</ul>`;
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeForgeHtml(titleWithLevel)}</div><p class="game-ui-tooltip-passive">${escapeForgeHtml(essenceLine)}</p><p class="game-ui-tooltip-passive"><strong>Efeito desta peça</strong></p>${effectHtml}${synBlock}</div>`;
}

function escapeForgeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Painel de sinergias por bioma presente no loadout (brasão + linhas ativas/inativas). */
export function forgeSynergyPanelHtml(L: ForgeHeroLoadout): string {
  const present = new Set(
    (["helmo", "capa", "manoplas"] as const)
      .map((k) => L[k]?.biome)
      .filter((b): b is ForgeEssenceId => b != null),
  );
  const biomes = COMBAT_BIOMES.map((id) => id as ForgeEssenceId).filter((b) =>
    present.has(b),
  );
  if (biomes.length === 0) {
    return `<div class="forge-synergy-panel forge-synergy-panel--empty"><p class="forge-synergy-empty__hint">Sem peças forjadas — o painel de sinergia aparece quando tiveres pelo menos uma peça; só equipamentos nv 3 contam para os tiers.</p></div>`;
  }
  const cards = biomes
    .map((biome) => {
      const tier = forgeSynergyTier(L, biome);
      const lines = forgeSynergyDescriptionLines(biome);
      const crest = biomeCrestWrap(biome, 32);
      const lis = lines
        .map((line, i) => {
          const on = tier > i;
          return `<li class="forge-syn-line ${on ? "forge-syn-line--on" : "forge-syn-line--off"}">${escapeForgeHtml(line)}</li>`;
        })
        .join("");
      return `<div class="forge-syn-card" data-biome="${biome}">
      <div class="forge-syn-card__head">${crest}<span class="forge-syn-card__name">${escapeForgeHtml(FORGE_ESSENCE_LABELS[biome])}</span><span class="forge-syn-tier" title="Peças nv 3 deste bioma">${tier}/3 nv3</span></div>
      <ol class="forge-syn-list">${lis}</ol>
    </div>`;
    })
    .join("");
  return `<div class="forge-synergy-panel">${cards}</div>`;
}

/** Barra de essências com brasão por bioma. */
export function forgeEssenceBarHtml(meta: MetaProgress): string {
  return `<div class="forge-essence-bar">${COMBAT_BIOMES.map((id) => {
    const eid = id as ForgeEssenceId;
    const n = meta.essences[eid] ?? 0;
    return `<span class="forge-essence-item"><span class="forge-essence-crest" aria-hidden="true">${biomeCrestWrap(eid, 28)}</span><span class="forge-essence-txt">${escapeForgeHtml(FORGE_ESSENCE_LABELS[eid])}: <strong>${n}</strong></span></span>`;
  }).join("")}</div>`;
}

/** Tooltip do botão Forjar / Aprimorar (próximo passo). */
function forgeSlotKindLabelPt(kind: ForgeSlotKind): string {
  return kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas";
}

export function forgeUpgradeButtonTooltipHtml(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  selectedBiome: ForgeEssenceId,
): string {
  const loadout = meta.forgeByHeroSlot[heroSlotIndex];
  if (!loadout) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Forja</div><p class="game-ui-tooltip-passive">Dados de herói inválidos; reinicia o jogo ou o meta.</p></div>`;
  }
  const cur = loadout[kind];
  const heldElsewhere = forgeKindBiomeHeldByOtherHero(
    meta,
    heroSlotIndex,
    kind,
    selectedBiome,
  );
  if (heldElsewhere && (!cur || cur.biome !== selectedBiome)) {
    const kt = forgeSlotKindLabelPt(kind);
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Indisponível</div><p class="game-ui-tooltip-passive">Já existe um <strong>${escapeForgeHtml(kt)}</strong> de ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} noutro slot de party. Cada tipo de peça + bioma é de <strong>uso único</strong> (não podes duplicar entre heróis).</p></div>`;
  }
  if (cur && cur.biome !== selectedBiome) {
    const cost = FORGE_COST_CREATE;
    const have = meta.essences[selectedBiome] ?? 0;
    const fx = forgePieceEffectHtml(kind, 1, 510);
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Trocar bioma</div><p class="game-ui-tooltip-passive">Substitui a peça atual de ${escapeForgeHtml(FORGE_ESSENCE_LABELS[cur.biome])} por uma nova de ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} (nv1).</p><p class="game-ui-tooltip-passive">Custo: <strong>${cost}</strong> ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} (tens ${have}).</p><p class="game-ui-tooltip-passive"><strong>Novo efeito</strong></p>${fx}</div>`;
  }
  if (cur && cur.level >= 3) {
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Nível máximo</div><p class="game-ui-tooltip-passive">Esta peça já está no nv3. Escolhe outro bioma no menu para reforjar nesse bioma (nv1).</p></div>`;
  }
  if (!cur) {
    const cost = FORGE_COST_CREATE;
    const have = meta.essences[selectedBiome] ?? 0;
    const fx = forgePieceEffectHtml(kind, 1, 520);
    return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Forjar nv1</div><p class="game-ui-tooltip-passive">Custo: <strong>${cost}</strong> ${escapeForgeHtml(FORGE_ESSENCE_LABELS[selectedBiome])} (tens ${have}).</p><p class="game-ui-tooltip-passive"><strong>Após forjar</strong></p>${fx}</div>`;
  }
  const cost =
    cur.level === 1 ? FORGE_COST_UPGRADE_TO_2 : FORGE_COST_UPGRADE_TO_3;
  const have = meta.essences[cur.biome] ?? 0;
  const nextLev = (cur.level + 1) as 2 | 3;
  const fx = forgePieceEffectHtml(kind, nextLev, 530);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Aprimorar → nv${nextLev}</div><p class="game-ui-tooltip-passive">Custo: <strong>${cost}</strong> ${escapeForgeHtml(FORGE_ESSENCE_LABELS[cur.biome])} (tens ${have}).</p><p class="game-ui-tooltip-passive"><strong>Estado após aprimorar (nível completo)</strong></p>${fx}</div>`;
}

/** Outro herói (slot de party) já tem esta peça: mesmo tipo + bioma (uso único global). */
export function forgeKindBiomeHeldByOtherHero(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): boolean {
  for (let hi = 0; hi < 3; hi++) {
    if (hi === heroSlotIndex) continue;
    const p = meta.forgeByHeroSlot[hi as 0 | 1 | 2]![kind];
    if (p && p.biome === biome) return true;
  }
  return false;
}

export function forgeTryCraftOrUpgrade(
  meta: MetaProgress,
  heroSlotIndex: 0 | 1 | 2,
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
): boolean {
  const loadout = meta.forgeByHeroSlot[heroSlotIndex];
  if (!loadout) return false;
  const cur = loadout[kind];
  if (!cur) {
    if (forgeKindBiomeHeldByOtherHero(meta, heroSlotIndex, kind, biome))
      return false;
    if ((meta.essences[biome] ?? 0) < FORGE_COST_CREATE) return false;
    meta.essences[biome] = (meta.essences[biome] ?? 0) - FORGE_COST_CREATE;
    loadout[kind] = { biome, level: 1 };
    return true;
  }
  // Trocar bioma: permite substituir a peça existente por uma nv1 do novo bioma.
  if (cur.biome !== biome) {
    if (forgeKindBiomeHeldByOtherHero(meta, heroSlotIndex, kind, biome))
      return false;
    if ((meta.essences[biome] ?? 0) < FORGE_COST_CREATE) return false;
    meta.essences[biome] = (meta.essences[biome] ?? 0) - FORGE_COST_CREATE;
    loadout[kind] = { biome, level: 1 };
    return true;
  }
  if (cur.level >= 3) return false;
  const cost =
    cur.level === 1 ? FORGE_COST_UPGRADE_TO_2 : FORGE_COST_UPGRADE_TO_3;
  if ((meta.essences[biome] ?? 0) < cost) return false;
  meta.essences[biome] = (meta.essences[biome] ?? 0) - cost;
  cur.level = (cur.level + 1) as 2 | 3;
  return true;
}
