import { damageReductionPercentFromDefense } from "../game/combatMath";
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

export interface SetupStatTooltipInput {
  stat: StatIconId;
  display: string;
}

/** Setup: corpo sem repetir o nome do atributo antes dos dois pontos; título identifica o stat. */
export function setupHeroStatTooltip(t: SetupStatTooltipInput): string {
  const { stat, display } = t;
  const v = esc(display);

  switch (stat) {
    case "max_hp":
      return wrap("Vida", [
        `<strong>${v}</strong>. Representa sua vida máxima. Você morre ao chegar a 0.`,
      ]);
    case "max_mana":
      return wrap("Mana", [
        `<strong>${v}</strong>. Representa sua mana máxima.`,
      ]);
    case "regen_hp":
      return wrap("Regen. vida", [
        `Aumenta sua vida em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
    case "regen_mp":
      return wrap("Regen. mana", [
        `Aumenta sua mana em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
    case "dmg":
      return wrap("Dano", [
        `<strong>${v}</strong>. Valor usado para calcular o dano das suas habilidades.`,
      ]);
    case "crit_hit":
      return wrap("Acerto crítico", [
        `<strong>${v}</strong>. Representa a chance de acertar um golpe crítico.`,
      ]);
    case "crit_dmg":
      return wrap("Dano crítico", [
        `<strong>${v}</strong>. Representa o seu dano crítico caso acerte um golpe crítico. Você pode causar (dano x dano critico) de dano!`,
      ]);
    case "def": {
      const n = parseInt(String(display).trim(), 10);
      const pct = Number.isFinite(n) ? formatReductionPctFromDefense(n) : "—";
      return wrap("Defesa", [
        `<strong>${v}</strong>. ${pct}% de redução de dano.`,
      ]);
    }
    case "mov":
      return wrap("Movimento", [
        `<strong>${v}</strong>. Representa quantos hexágonos você pode percorrer no seu turno.`,
      ]);
    default:
      return wrap(display, [`<strong>${v}</strong>.`]);
  }
}

export interface CombatStatTooltipInput {
  stat: StatIconId;
  display: string;
  detailPlain?: string;
  defenseNumeric?: string;
  defenseReductionPct?: string;
  potencialNumeric?: number;
}

function appendBeforeLastClosingDiv(html: string, insert: string): string {
  const idx = html.lastIndexOf("</div>");
  if (idx < 0) return html;
  return html.slice(0, idx) + insert + html.slice(idx);
}

export function combatHeroStatTooltip(i: CombatStatTooltipInput): string {
  const {
    stat,
    display,
    detailPlain,
    defenseNumeric,
    defenseReductionPct,
    potencialNumeric,
  } = i;

  const v = esc(display);

  let core: string;
  switch (stat) {
    case "max_hp":
      core = wrap("Vida", [
        `<strong>${v}</strong>. Representa sua vida máxima. Você morre ao chegar a 0.`,
      ]);
      break;
    case "max_mana":
      core = wrap("Mana", [
        `<strong>${v}</strong>. Representa sua mana máxima.`,
      ]);
      break;
    case "regen_hp":
      core = wrap("Regen. vida", [
        `Aumenta sua vida em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
      break;
    case "regen_mp":
      core = wrap("Regen. mana", [
        `Aumenta sua mana em <strong>${v}</strong> no final do turno do seu herói.`,
      ]);
      break;
    case "dmg":
      core = wrap("Dano", [
        `<strong>${v}</strong>. Valor usado para calcular o dano das suas habilidades.`,
      ]);
      break;
    case "crit_hit":
      core = wrap("Acerto crítico", [
        `<strong>${v}</strong>. Representa a chance de acertar um golpe crítico.`,
      ]);
      break;
    case "crit_dmg":
      core = wrap("Dano crítico", [
        `<strong>${v}</strong>. Representa o seu dano crítico caso acerte um golpe crítico. Você pode causar (dano x dano critico) de dano!`,
      ]);
      break;
    case "def": {
      const numShown = defenseNumeric ?? display;
      const n = parseInt(String(numShown).trim(), 10);
      const pct =
        defenseReductionPct ??
        (Number.isFinite(n) ? formatReductionPctFromDefense(n) : null);
      core = wrap("Defesa", [
        pct != null
          ? `<strong>${esc(numShown)}</strong>. ${esc(pct)}% de redução de dano.`
          : `<strong>${esc(numShown)}</strong>.`,
      ]);
      break;
    }
    case "mov":
      core = wrap("Movimento", [
        `<strong>${v}</strong>. Representa quantos hexágonos você pode percorrer no seu turno.`,
      ]);
      break;
    case "range":
      core = wrap("Alcance", [
        `<strong>${v}</strong>. Representa quantos hexágonos de alcance serão aplicados às suas habilidades que escalam com esse atributo.`,
      ]);
      break;
    case "pot": {
      const pctStr =
        potencialNumeric != null && Number.isFinite(potencialNumeric)
          ? `${esc(String(Math.round(potencialNumeric * 10) / 10).replace(".", ","))}%`
          : `${v}%`;
      core = wrap("Potencial de cura e escudo", [
        `<strong>${pctStr}</strong>. Valor aplicado em artefatos e habilidades que curem ou concedam escudo a você e aos seus aliados.`,
      ]);
      break;
    }
    case "xp_bonus":
      core = wrap("Bônus de XP", [
        `<strong>${v}</strong>. Representa o valor adicional de experiência ao derrotar um inimigo.`,
      ]);
      break;
    case "pen":
      core = wrap("Penetração", [
        `<strong>${v}</strong>. Representa a redução da defesa de um alvo ao receber dano de qualquer fonte.`,
      ]);
      break;
    case "pen_escudo":
      core = wrap("Penetração de escudo", [
        `<strong>${v}</strong>. Representa o dano adicional de qualquer fonte contra um escudo.`,
      ]);
      break;
    case "lifesteal":
      core = wrap("Roubo de vida", [
        `<strong>${v}</strong>. Representa a percentagem de qualquer dano que você causar a um inimigo, convertida em vida para o seu herói.`,
      ]);
      break;
    case "luck":
      core = wrap("Sorte", [
        `<strong>${v}</strong>. Representa a chance de adquirir artefatos mais poderosos mais cedo.`,
      ]);
      break;
    case "fly":
      core = wrap("Voo", [
        `<strong>${v}</strong>. Capacidade de transitar livremente pelo mapa. Criaturas voadoras não podem ser encurraladas por criaturas não voadoras. Você só pode ser atingido por habilidades com alcance 3 ou mais.`,
      ]);
      break;
    case "basic":
      core = wrap("Ataque Extra", [
        `Ataque Extra: <strong>${v}</strong>. Representa o numero de vezes que você pode realizar um ataque básico adicional nesse turno.`,
      ]);
      break;
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
