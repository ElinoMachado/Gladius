import type { StatIconId } from "./statIcons";
import { statIconSvg } from "./statIcons";

/** Texto curto para tooltip / title nos ícones inline. */
export const HERO_STAT_TIP: Record<StatIconId, string> = {
  dmg: "Dano: reduz vida do alvo.",
  def: "Defesa / armadura: reduz dano recebido.",
  pen: "Penetração de armadura.",
  pen_escudo: "Penetração de escudo azul (dano que ignora absorção do escudo).",
  crit_hit:
    "Chance de rolar crítico (máx. 100% no dado). Sem Ronin, o HUD mostra no máximo 100% mesmo com mais % na ficha. Com Ronin, mostra o total e o que passa de 100% converte em dano.",
  crit_dmg: "Dano crítico (multiplicador extra no crítico).",
  mov: "Movimento: hexágonos por turno.",
  range: "Alcance de ataque (hexágonos).",
  max_hp: "Vida máxima (barra de PV).",
  max_mana: "Mana máxima (reserva).",
  regen_hp: "Regeneração de vida por turno.",
  regen_mp: "Regeneração de mana por turno.",
  lifesteal: "Roubo de vida.",
  pot: "Cura / poção.",
  luck: "Sorte (drops, efeitos aleatórios).",
  fly: "Voo: ignora terreno e alguns bloqueios.",
  kills: "Abates.",
  stone: "Pedra / obstáculo.",
  motor: "Motor / impulso.",
  poison: "Veneno.",
  ult: "Habilidade suprema.",
  forma: "Forma / transformação.",
  basic: "Ataque básico.",
  artifact: "Artefato.",
  xp_bonus: "Experiência / nível.",
  ouro_wave: "Ouro por onda.",
  generic: "Atributo.",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconSpan(id: StatIconId, uniq: number): string {
  const tip = escapeHtml(HERO_STAT_TIP[id] ?? HERO_STAT_TIP.generic);
  return `<span class="stat-inline-ico" data-stat-tip="${id}" title="${tip}" role="img" aria-label="${tip}">${statIconSvg(id, uniq)}</span>`;
}

/** Frases completas primeiro (evita partir "dano crítico"). */
const PHRASE_RULES: { re: RegExp; id: StatIconId }[] = [
  { re: /dano crítico/gi, id: "crit_dmg" },
  { re: /chance crítica/gi, id: "crit_hit" },
  { re: /chance de crítico/gi, id: "crit_hit" },
  { re: /ataque básico/gi, id: "basic" },
  { re: /regeneração de mana/gi, id: "regen_mp" },
  { re: /regeneração de vida/gi, id: "regen_hp" },
  { re: /mana máx(?:ima)?\.?/gi, id: "max_mana" },
  { re: /vida máx(?:ima)?\.?/gi, id: "max_hp" },
  { re: /regeneração/gi, id: "regen_hp" },
];

/** Palavras só em texto fora de ícones já inseridos. */
const WORD_RULES: { re: RegExp; id: StatIconId }[] = [
  { re: /movimento/gi, id: "mov" },
  { re: /alcance/gi, id: "range" },
  { re: /armadura/gi, id: "def" },
  { re: /defesa/gi, id: "def" },
  { re: /críticos/gi, id: "crit_hit" },
  { re: /crítico/gi, id: "crit_hit" },
  { re: /crít\.?/gi, id: "crit_hit" },
  { re: /mana/gi, id: "max_mana" },
  { re: /\bdano\b/gi, id: "dmg" },
  { re: /\bvida\b/gi, id: "max_hp" },
  { re: /voo/gi, id: "fly" },
  { re: /voar/gi, id: "fly" },
  { re: /sorte/gi, id: "luck" },
  { re: /nível/gi, id: "xp_bonus" },
  { re: /experiência/gi, id: "xp_bonus" },
  { re: /penetração/gi, id: "pen" },
];

const ICON_SPAN_SPLIT = /(<span class="stat-inline-ico"[^>]*>[\s\S]*?<\/span>)/g;

function applyPhraseRules(s: string, uniq: { n: number }): string {
  let out = s;
  for (const { re, id } of PHRASE_RULES) {
    out = out.replace(re, (m) => `${iconSpan(id, uniq.n++)}${m}`);
  }
  return out;
}

function applyWordRulesToPlainText(s: string, uniq: { n: number }): string {
  let out = s;
  for (const { re, id } of WORD_RULES) {
    out = out.replace(re, (m) => `${iconSpan(id, uniq.n++)}${m}`);
  }
  return out;
}

/**
 * Escapa o texto e insere ícones antes de termos de atributo.
 * Ícones têm `title` (tooltip nativo) e `data-stat-tip` para bind opcional.
 */
export function formatHeroStatsInTextToHtml(
  text: string,
  uniqBase: number,
): string {
  const uniq = { n: uniqBase };
  let s = escapeHtml(text);
  s = applyPhraseRules(s, uniq);
  s = s.split(ICON_SPAN_SPLIT).map((chunk) => {
    if (chunk.startsWith('<span class="stat-inline-ico"')) return chunk;
    return applyWordRulesToPlainText(chunk, uniq);
  }).join("");
  return s;
}
