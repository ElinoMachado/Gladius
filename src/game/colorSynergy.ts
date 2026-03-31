import type { TeamColor, Unit } from "./types";

interface PartyBonus {
  regenVida: number;
  regenMana: number;
  maxHp: number;
  defesa: number;
  dano: number;
  acertoCritico: number;
  danoCritico: number;
  lifesteal: number;
  penetracao: number;
  shieldPerTurn: number;
  potencialCuraEscudo: number;
  /** % extra de XP (ex.: 50 = +50%). */
  xpGainPct: number;
  sorte: number;
}

function empty(): PartyBonus {
  return {
    regenVida: 0,
    regenMana: 0,
    maxHp: 0,
    defesa: 0,
    dano: 0,
    acertoCritico: 0,
    danoCritico: 0,
    lifesteal: 0,
    penetracao: 0,
    shieldPerTurn: 0,
    potencialCuraEscudo: 0,
    xpGainPct: 0,
    sorte: 0,
  };
}

function countColors(colors: TeamColor[]): { a: number; v: number; r: number } {
  let a = 0,
    v = 0,
    r = 0;
  for (const c of colors) {
    if (c === "azul") a++;
    else if (c === "verde") v++;
    else r++;
  }
  return { a, v, r };
}

/** Bônus de time por cores escolhidas (aplicado ao criar/atualizar unidades). */
export function computePartyBonus(colors: TeamColor[]): PartyBonus {
  const b = empty();
  const n = colors.length;
  if (n === 0) return b;

  if (n === 3) {
    const { a, v, r } = countColors(colors);
    if (a === 1 && v === 1 && r === 1) {
      b.xpGainPct += 50;
      b.sorte += 10;
      return b;
    }
    if (a === 3) {
      b.regenVida += 5;
      return b;
    }
    if (a === 2 && v === 1) {
      b.regenVida += 3;
      b.regenMana += 1;
      return b;
    }
    if (a === 2 && r === 1) {
      b.regenVida += 3;
      b.acertoCritico += 25;
      return b;
    }
    if (r === 3) {
      b.dano += 10;
      return b;
    }
    if (r === 2 && v === 1) {
      b.dano += 5;
      b.danoCritico += 0.5;
      return b;
    }
    if (r === 2 && a === 1) {
      b.dano += 5;
      b.lifesteal += 20;
      return b;
    }
    if (v === 3) {
      b.maxHp += 100;
      b.defesa += 5;
      return b;
    }
    if (v === 2 && r === 1) {
      b.maxHp += 60;
      b.penetracao += 50;
      return b;
    }
    if (v === 2 && a === 1) {
      b.shieldPerTurn += 5;
      b.potencialCuraEscudo += 50;
      return b;
    }
  }

  for (const c of colors) {
    if (c === "azul") b.regenVida += 1;
    else if (c === "verde") {
      b.maxHp += 20;
      b.defesa += 1;
    } else {
      b.dano += 2;
    }
  }
  return b;
}

export function describeSynergy(colors: TeamColor[]): string {
  const b = computePartyBonus(colors);
  const parts: string[] = [];
  if (b.regenVida) parts.push(`Regen vida +${b.regenVida}`);
  if (b.regenMana) parts.push(`Regen mana +${b.regenMana}`);
  if (b.maxHp) parts.push(`Vida máx. +${b.maxHp}`);
  if (b.defesa) parts.push(`Defesa +${b.defesa}`);
  if (b.dano) parts.push(`Dano +${b.dano}`);
  if (b.acertoCritico) parts.push(`Crítico +${b.acertoCritico}%`);
  if (b.danoCritico) parts.push(`Dano crítico +${Math.round(b.danoCritico * 100)}%`);
  if (b.lifesteal) parts.push(`Roubo de vida +${b.lifesteal}%`);
  if (b.penetracao) parts.push(`Penetração +${b.penetracao}`);
  if (b.shieldPerTurn) parts.push(`Escudo/turno +${b.shieldPerTurn}`);
  if (b.potencialCuraEscudo) parts.push(`Cura/escudo +${b.potencialCuraEscudo}%`);
  if (b.xpGainPct) parts.push(`Ganho de XP +${b.xpGainPct}%`);
  if (b.sorte) parts.push(`Sorte +${b.sorte}`);
  return parts.length ? parts.join(" · ") : "Sem bônus";
}

export function applyPartyBonusToUnit(u: Unit, bonus: PartyBonus): void {
  u.maxHp += bonus.maxHp;
  u.hp += bonus.maxHp;
  u.defesa += bonus.defesa;
  u.dano += bonus.dano;
  u.regenVida += bonus.regenVida;
  u.regenMana += bonus.regenMana;
  u.acertoCritico += bonus.acertoCritico;
  u.danoCritico += bonus.danoCritico;
  u.lifesteal += bonus.lifesteal;
  u.penetracao += bonus.penetracao;
  u.potencialCuraEscudo += bonus.potencialCuraEscudo;
  u.sorte += bonus.sorte;
}
