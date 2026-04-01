import type { HeroClassId } from "../game/types";
import type { StatIconId } from "./statIcons";

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

/** Tooltips da grelha de atributos no setup de herói (valores do template). */
export function setupHeroStatTooltip(t: SetupStatTooltipInput): string {
  const { stat, display, baseDano, critMultStr } = t;
  const mult = critMultFromDisplayPercent(critMultStr);
  const approxCrit = Math.max(0, Math.round(baseDano * mult));

  switch (stat) {
    case "max_hp":
      return wrap("Vida", [
        `<strong>${esc(display)}</strong>. Representa a tua vida máxima; morres quando os PV chegam a 0.`,
      ]);
    case "max_mana":
      return wrap("Mana", [
        `<strong>${esc(display)}</strong>. Representa a tua mana máxima.`,
      ]);
    case "regen_hp":
      return wrap("Regen. vida", [
        `Aumenta a tua vida em <strong>${esc(display)}</strong> no fim do turno do teu herói.`,
      ]);
    case "regen_mp":
      return wrap("Regen. mana", [
        `Aumenta a tua mana em <strong>${esc(display)}</strong> no fim do turno do teu herói.`,
      ]);
    case "dmg":
      return wrap("Dano", [
        `<strong>${esc(display)}</strong>. Valor usado para calcular o dano das tuas habilidades e do ataque básico.`,
      ]);
    case "crit_hit":
      return wrap("Acerto crítico", [
        `<strong>${esc(display)}</strong>. Representa a chance de acertares um golpe crítico no dado (máx. 100% no dado sem artefactos especiais).`,
      ]);
    case "crit_dmg":
      return wrap("Dano crítico", [
        `<strong>${esc(display)}</strong>. Multiplicador aplicado ao dano quando acertas um crítico. Com o dano base atual (${esc(String(baseDano))}), um crítico chegaria a cerca de <strong>${approxCrit}</strong> de dano bruto antes de defesa e outros modificadores.`,
      ]);
    case "def":
      return wrap("Defesa", [
        `<strong>${esc(display)}</strong>. Quanto maior, menos dano recebes (redução em % depende da fórmula de armadura).`,
      ]);
    case "mov":
      return wrap("Movimento", [
        `<strong>${esc(display)}</strong>. Quantos hexágonos podes percorrer no teu turno (custo por hex pode subir em certos terrenos).`,
      ]);
    default:
      return wrap(display, [`Valor: <strong>${esc(display)}</strong>.`]);
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

/** Tooltips da grelha de atributos no combate / loja de ouro. */
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

  let core: string;
  switch (stat) {
    case "max_hp":
      core = wrap("Vida", [
        `<strong>${esc(display)}</strong>. PV atuais e máximos; morres quando os PV chegam a 0.`,
      ]);
      break;
    case "max_mana":
      core = wrap("Mana", [
        `<strong>${esc(display)}</strong>. Mana atual e máxima; habilidades consomem mana conforme o indicado em cada uma.`,
      ]);
      break;
    case "regen_hp":
      core = wrap("Regen. vida", [
        `Aumenta a tua vida em <strong>${esc(display)}</strong> no fim do turno do teu herói.`,
      ]);
      break;
    case "regen_mp":
      core = wrap("Regen. mana", [
        `Aumenta a tua mana em <strong>${esc(display)}</strong> no fim do turno do teu herói.`,
      ]);
      break;
    case "dmg":
      core = wrap("Dano", [
        `<strong>${esc(display)}</strong>. Valor usado para calcular o dano das tuas habilidades e do ataque básico.`,
      ]);
      break;
    case "crit_hit":
      core = wrap("Acerto crítico", [
        `<strong>${esc(display)}</strong>. Representa a chance de acertares um golpe crítico no dado (efeitos como Ronin podem alterar o que vês no HUD).`,
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
      const tail =
        approx != null
          ? ` Com o dano atual (~${esc(String(dano))}), um crítico aplica cerca de <strong>${approx}</strong> de dano bruto antes de defesa.`
          : "";
      core = wrap("Dano crítico", [
        `<strong>${esc(display)}</strong>. Representa o multiplicador de dano quando acertas um crítico.${tail}`,
      ]);
      break;
    }
    case "def":
      core = wrap("Defesa", [
        defenseNumeric && defenseReductionPct
          ? `<strong>${esc(defenseNumeric)}</strong> de defesa · cerca de <strong>${esc(defenseReductionPct)}%</strong> de redução de dano recebido (penetração do atacante reduz este efeito).`
          : `<strong>${esc(display)}</strong>. Reduz o dano recebido; a % efetiva depende da armadura e da penetração.`,
      ]);
      break;
    case "mov":
      core = wrap("Movimento", [
        `<strong>${esc(display)}</strong>. Quantos hexágonos podes percorrer no teu turno.`,
      ]);
      break;
    case "range":
      core = wrap("Alcance", [
        `<strong>${esc(display)}</strong>. Quantos hexágonos de alcance se aplicam às habilidades que escalam com este atributo (e ao ataque básico, quando relevante).`,
      ]);
      break;
    case "pot": {
      const pct =
        potencialNumeric != null && Number.isFinite(potencialNumeric)
          ? `${esc(String(Math.round(potencialNumeric * 10) / 10).replace(".", ","))}%`
          : `${esc(display)}%`;
      core = wrap("Potencial de cura e escudo", [
        `<strong>${pct}</strong>. Bónus percentual aplicado em curas e escudos que recebes ou concedes a aliados através de habilidades e artefactos.`,
      ]);
      break;
    }
    case "xp_bonus":
      core = wrap("Bónus de XP", [
        `<strong>${esc(display)}</strong>. Valor adicional de experiência ao derrotares inimigos (soma com outros bónus de grupo ou meta).`,
      ]);
      break;
    case "pen":
      core = wrap("Penetração", [
        `<strong>${esc(display)}</strong>. Reduz a defesa efetiva do alvo quando recebe dano de qualquer fonte.`,
      ]);
      break;
    case "pen_escudo":
      core = wrap("Penetração de escudo", [
        `<strong>${esc(display)}</strong>. Dano adicional de qualquer fonte contra escudos (absorção azul), além do dano normal.`,
      ]);
      break;
    case "lifesteal":
      core = wrap("Roubo de vida", [
        `<strong>${esc(display)}</strong>. Percentagem do dano que causas a inimigos que é convertida em cura para o teu herói.`,
      ]);
      break;
    case "luck":
      core = wrap("Sorte", [
        `<strong>${esc(display)}</strong>. Influencia a probabilidade de obter artefactos mais raros mais cedo e outras rolagens favoráveis.`,
      ]);
      break;
    case "fly":
      core = wrap("Voo", [
        `<strong>${esc(display)}</strong>. Permite transitar livremente pelo mapa. Criaturas voadoras não podem ser encurraladas por criaturas não voadoras. Só podes ser alvo de habilidades com alcance 3 ou mais.`,
      ]);
      break;
    case "basic": {
      const paras = [
        `<strong>${esc(display)}</strong>. Representa quantas vezes podes realizar um ataque básico neste turno.`,
      ];
      if (basicManaNote) {
        paras.push(
          `O <strong>ataque básico</strong> custa <strong>1 de mana</strong> para todos os heróis.`,
          `A habilidade <strong>«Atirar para todo lado»</strong> do pistoleiro custa <strong>3 de mana</strong>.`,
        );
      }
      core = wrap("Ataques básicos", paras);
      break;
    }
    default:
      core = wrap(display, [`<strong>${esc(display)}</strong>.`]);
  }

  if (detailPlain && detailPlain.trim().length > 0) {
    core = appendBeforeLastClosingDiv(
      core,
      p(`<em>${esc(detailPlain.trim())}</em>`),
    );
  }
  return core;
}
