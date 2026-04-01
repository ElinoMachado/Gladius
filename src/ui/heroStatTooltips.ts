import { damageReductionPercentFromDefense } from "../game/combatMath";
import type { HeroClassId } from "../game/types";
import type { StatIconId } from "./statIcons";

function formatReductionPctFromDefense(effDef: number): string {
  const pct = damageReductionPercentFromDefense(effDef, 0);
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1).replace(".", ",");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(html: string): string {
  return `<p class="game-ui-tooltip-passive">${html}</p>`;
}

function wrap(title: string, bodies: string[]): string {
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${esc(title)}</div>${bodies.map(p).join("")}</div>`;
}

function critMultFromDisplayPercent(critMultStr: string): number {
  const n = parseInt(critMultStr.replace(/%/g, ""), 10);
  return Number.isFinite(n) ? n / 100 : 1.5;
}

export interface SetupStatTooltipInput {
  stat: StatIconId;
  heroClass: HeroClassId;
  display: string;
  /** Dano base do template (HEROES) */
  baseDano: number;
  critMultStr: string;
}

/** Tooltips da grelha de atributos no setup de herói (valores do template). Texto = pedido do autor; só {valores} substituídos. */
export function setupHeroStatTooltip(t: SetupStatTooltipInput): string {
  const { stat, display, baseDano, critMultStr } = t;
  const mult = critMultFromDisplayPercent(critMultStr);
  const approxCrit = Math.max(0, Math.round(baseDano * mult));
  const v = esc(display);

  switch (stat) {
    case "max_hp":
      return wrap("Vida", [
        `Vida: <strong>${v}</strong>. Representa sua vida máxima, morre ao chegar a 0.`,
      ]);
    case "max_mana":
      return wrap("Mana", [
        `Mana: <strong>${v}</strong>.Representa sua mana máxima.`,
      ]);
    case "regen_hp":
      return wrap("Regen. vida", [
        `Regen. vida: Aumenta sua vida em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
    case "regen_mp":
      return wrap("Regen. mana", [
        `Regen. mana: Aumenta sua mana em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
    case "dmg":
      return wrap("Dano", [
        `Dano: <strong>${v}</strong>. Valor usado para calcular o dano de suas skills.`,
      ]);
    case "crit_hit":
      return wrap("Acerto critico", [
        `Acerto critico: <strong>${v}</strong>. Representa a chance de acertar um golpe crítico.`,
      ]);
    case "crit_dmg":
      return wrap("Dano critico", [
        `Dano critico: <strong>${v}</strong>. Representa seu dano critico caso acerte um golpe critico. Você pode causar <strong>${approxCrit}</strong> (<strong>${esc(String(baseDano))}</strong> × <strong>${v}</strong>)!`,
      ]);
    case "def": {
      const n = parseInt(String(display).trim(), 10);
      const pct = Number.isFinite(n) ? formatReductionPctFromDefense(n) : "—";
      return wrap("defesa", [
        `defesa: <strong>${v}</strong>. ${pct}% de redução de dano.`,
      ]);
    }
    case "mov":
      return wrap("Movimento", [
        `Movimento:<strong>${v}</strong>. Representa quantos hex você pode se mover no seu turno.`,
      ]);
    default:
      return wrap(display, [`<strong>${v}</strong>.`]);
  }
}

export interface CombatStatTooltipInput {
  stat: StatIconId;
  /** Valor principal mostrado na célula */
  display: string;
  /** Texto extra (deltas, notas Ronin, etc.) */
  detailPlain?: string;
  defenseNumeric?: string;
  defenseReductionPct?: string;
  dano?: number;
  critMultEffective?: number;
  potencialNumeric?: number;
  basicManaNote?: boolean;
}

function appendBeforeLastClosingDiv(html: string, insert: string): string {
  const idx = html.lastIndexOf("</div>");
  if (idx < 0) return html;
  return html.slice(0, idx) + insert + html.slice(idx);
}

/** Combate / loja: mesmas frases do autor; só {valores} substituídos. */
export function combatHeroStatTooltip(i: CombatStatTooltipInput): string {
  const {
    stat,
    display,
    detailPlain,
    defenseNumeric,
    defenseReductionPct,
    dano,
    critMultEffective,
    potencialNumeric,
    basicManaNote,
  } = i;

  const v = esc(display);

  let core: string;
  switch (stat) {
    case "max_hp":
      core = wrap("Vida", [
        `Vida: <strong>${v}</strong>. Representa sua vida máxima, morre ao chegar a 0.`,
      ]);
      break;
    case "max_mana":
      core = wrap("Mana", [
        `Mana: <strong>${v}</strong>.Representa sua mana máxima.`,
      ]);
      break;
    case "regen_hp":
      core = wrap("Regen. vida", [
        `Regen. vida: Aumenta sua vida em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
      break;
    case "regen_mp":
      core = wrap("Regen. mana", [
        `Regen. mana: Aumenta sua mana em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
      break;
    case "dmg":
      core = wrap("Dano", [
        `Dano: <strong>${v}</strong>. Valor usado para calcular o dano de suas skills.`,
      ]);
      break;
    case "crit_hit":
      core = wrap("Acerto critico", [
        `Acerto critico: <strong>${v}</strong>. Representa a chance de acertar um golpe crítico.`,
      ]);
      break;
    case "crit_dmg": {
      const approx =
        dano != null &&
        critMultEffective != null &&
        Number.isFinite(dano) &&
        Number.isFinite(critMultEffective)
          ? Math.max(0, Math.round(dano * critMultEffective))
          : null;
      const dStr = dano != null && Number.isFinite(dano) ? esc(String(dano)) : "";
      const critPart =
        approx != null && dStr
          ? ` Você pode causar <strong>${approx}</strong> (<strong>${dStr}</strong> × <strong>${v}</strong>)!`
          : "";
      core = wrap("Dano critico", [
        `Dano critico: <strong>${v}</strong>. Representa seu dano critico caso acerte um golpe critico.${critPart}`,
      ]);
      break;
    }
    case "def": {
      const numShown = defenseNumeric ?? display;
      const n = parseInt(String(numShown).trim(), 10);
      const pct =
        defenseReductionPct ??
        (Number.isFinite(n) ? formatReductionPctFromDefense(n) : null);
      core = wrap("defesa", [
        pct != null
          ? `defesa: <strong>${esc(numShown)}</strong>. ${esc(pct)}% de redução de dano.`
          : `defesa: <strong>${esc(numShown)}</strong>.`,
      ]);
      break;
    }
    case "mov":
      core = wrap("Movimento", [
        `Movimento:<strong>${v}</strong>. Representa quantos hex você pode se mover no seu turno.`,
      ]);
      break;
    case "range":
      core = wrap(display, [
        `Alcance: Representa quantos hex de alcance serão aplicados em suas skills que escalem com esse atributo.`,
      ]);
      break;
    case "pot": {
      const pctStr =
        potencialNumeric != null && Number.isFinite(potencialNumeric)
          ? `${esc(String(Math.round(potencialNumeric * 10) / 10).replace(".", ","))}%`
          : `${v}%`;
      core = wrap("Potencial de cura e escudo", [
        `Potencial de cura e escudo:<strong>${pctStr}</strong>. Valor aplicado em artefatos e habilidades que curem ou concedam escudo a você e seus aliados.`,
      ]);
      break;
    }
    case "xp_bonus":
      core = wrap("Bonus de XP", [
        `Bonus de XP: <strong>${v}</strong>. Representa o valor adicional de XP ganha ao derrotar um inimigo.`,
      ]);
      break;
    case "pen":
      core = wrap("Penetração", [
        `Penetração: <strong>${v}</strong>. Representa a redução de defesa de um alvo ao receber dano de qualquer fonte.`,
      ]);
      break;
    case "pen_escudo":
      core = wrap("Penetração de escudo", [
        `Penetração de escudo: <strong>${v}</strong>. Representa o dano adicional de qualquer fonte de dano contra um escudo.`,
      ]);
      break;
    case "lifesteal":
      core = wrap("Roubo de vida", [
        `Roubo de vida: <strong>${v}</strong>. Representa o percentual de qualquer dano que você causou a um inimigo convertido em vida para seu herói.`,
      ]);
      break;
    case "luck":
      core = wrap("Sorte", [
        `Sorte:<strong>${v}</strong>. Representa a chance de adquirir artefatos mais poderosos mais cedo.`,
      ]);
      break;
    case "fly":
      core = wrap(display, [
        `Capacidade de transitar livremente no mapa. Criaturas voadoras não podem ser encurraladas por criaturas não voadoras. Você só pode ser atingido por habilidade com alcance 3 ou mais.`,
      ]);
      break;
    case "basic": {
      const paras = [
        `Ataque básicos: <strong>${v}</strong>. Representa o numero de vezes que você pode realizar um ataque básico nesse turno.`,
      ];
      if (basicManaNote) {
        paras.push(
          `O ataque básico vai custar 1 de mana. para todos os heróis.`,
          `O "Atirar para todo lado" do pistoleiro vai custar 3 de mana.`,
        );
      }
      core = wrap("Ataque básicos", paras);
      break;
    }
    default:
      core = wrap(display, [`<strong>${v}</strong>.`]);
  }

  if (detailPlain && detailPlain.trim().length > 0) {
    core = appendBeforeLastClosingDiv(
      core,
      p(`<em>${esc(detailPlain.trim())}</em>`),
    );
  }
  return core;
}
