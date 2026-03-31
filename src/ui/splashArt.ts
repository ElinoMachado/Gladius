/**
 * Splash arts em SVG (retrato) para heróis, inimigos e HUD / ordem de turnos.
 */
import type { HeroClassId } from "../game/types";
import { svgDataUrl } from "./svgDataUrl";

const W = 80;
const H = 100;

function frame(inner: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#0a080c"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/>${inner}</svg>`;
}

const heroSvgs: Record<HeroClassId, string> = {
  pistoleiro: frame(
    `<ellipse cx="40" cy="88" rx="28" ry="6" fill="#0006"/><path fill="#3a3038" d="M28 72c0-8 4-14 12-14s12 6 12 14v8H28z"/><circle cx="40" cy="48" r="14" fill="#c9a88a"/><rect x="34" y="58" width="12" height="18" rx="3" fill="#4a4558"/><path fill="#2a2420" d="M52 42l18-6-2 8-16 4z"/><circle cx="46" cy="46" r="3" fill="#1a1810"/>`,
    "#3a3548",
  ),
  gladiador: frame(
    `<ellipse cx="40" cy="90" rx="30" ry="7" fill="#0006"/><path fill="#5a3020" d="M22 70h36v12H22z"/><circle cx="40" cy="44" r="16" fill="#d4a080"/><path fill="#8a2020" d="M24 58h32l-4 22H28z"/><path stroke="#c9a227" stroke-width="3" fill="none" d="M12 50h14M54 50h14"/><path fill="#a0a0a0" d="M18 48l-8 24h10l6-20zM62 48l8 24H60l-6-20z"/>`,
    "#4a2820",
  ),
  sacerdotisa: frame(
    `<ellipse cx="40" cy="90" rx="26" ry="6" fill="#0006"/><path fill="#483868" d="M26 68c0-10 6-18 14-18s14 8 14 18v14H26z"/><circle cx="40" cy="42" r="15" fill="#e8c8b0"/><ellipse cx="40" cy="38" rx="16" ry="8" fill="#6a5090"/><path fill="none" stroke="#c8a0ff" stroke-width="2" d="M40 18v14"/><circle cx="40" cy="14" r="4" fill="#ffd080"/>`,
    "#382858",
  ),
};

function enemySvg(id: string): string {
  const m: Record<string, string> = {
    escravo: frame(
      `<ellipse cx="40" cy="92" rx="22" ry="5" fill="#0008"/><path fill="#6a5848" d="M30 70h20v14H30z"/><circle cx="40" cy="48" r="12" fill="#a89078"/><path stroke="#3a3a3a" stroke-width="2" fill="none" d="M28 62c-4 8-4 16 0 20M52 62c4 8 4 16 0 20"/>`,
      "#3a3530",
    ),
    gladinio: frame(
      `<ellipse cx="40" cy="90" rx="26" ry="6" fill="#0006"/><rect x="28" y="58" width="24" height="22" rx="2" fill="#5a4038"/><circle cx="40" cy="44" r="14" fill="#b89070"/><ellipse cx="40" cy="36" rx="12" ry="6" fill="#4a3020"/>`,
      "#3a2820",
    ),
    leao_selvagem: frame(
      `<ellipse cx="40" cy="88" rx="30" ry="8" fill="#0006"/><ellipse cx="40" cy="55" rx="22" ry="18" fill="#c9a040"/><circle cx="28" cy="48" r="5" fill="#2a2018"/><circle cx="52" cy="48" r="5" fill="#2a2018"/><path fill="#a07020" d="M32 62h16v16H32z"/>`,
      "#4a3818",
    ),
    cobra_imperial: frame(
      `<path fill="#3a6a40" d="M20 88c20-40 40-40 60 0" opacity="0.9"/><ellipse cx="40" cy="42" rx="10" ry="8" fill="#5a9a50"/><circle cx="36" cy="40" r="2" fill="#1a1a1a"/><circle cx="44" cy="40" r="2" fill="#1a1a1a"/><path fill="none" stroke="#889955" stroke-width="3" d="M25 55s15 20 30 0"/>`,
      "#1a3020",
    ),
    aranha_ruinosa: frame(
      `<ellipse cx="40" cy="50" rx="14" ry="12" fill="#2a2a28"/><path stroke="#4a4a48" stroke-width="2" fill="none" d="M12 30l10 20M68 30l-10 20M10 50h60M14 70l8-14M66 70l-8-14"/><circle cx="36" cy="48" r="3" fill="#c04040"/><circle cx="44" cy="48" r="3" fill="#c04040"/>`,
      "#181818",
    ),
    cultista_cinzas: frame(
      `<path fill="#3a3038" d="M25 72h30v18H25z"/><circle cx="40" cy="46" r="13" fill="#9a9088"/><path fill="#2a2028" d="M32 58h16l4 20H28z"/><ellipse cx="40" cy="28" rx="6" ry="10" fill="#5a4a58" opacity="0.8"/>`,
      "#282028",
    ),
    fera_voraz: frame(
      `<ellipse cx="40" cy="58" rx="24" ry="20" fill="#6a3030"/><path fill="#faf0e0" d="M28 52h24v8H28z"/><path fill="#4a1818" d="M22 48l-8-10 6 14zM58 48l8-10-6 14z"/><circle cx="34" cy="54" r="3" fill="#1a1a1a"/><circle cx="46" cy="54" r="3" fill="#1a1a1a"/>`,
      "#3a1010",
    ),
    batedor_montado: frame(
      `<ellipse cx="40" cy="85" rx="28" ry="7" fill="#0006"/><path fill="#5a5048" d="M18 55c12-20 32-20 44 0v22H18z"/><circle cx="40" cy="38" r="11" fill="#c9b8a0"/><path fill="#3a3830" d="M30 48h20l6 18H24z"/>`,
      "#2a3830",
    ),
    dragao_filhote: frame(
      `<path fill="#5a8040" d="M15 70c10-25 40-25 50 0"/><ellipse cx="40" cy="48" rx="16" ry="12" fill="#6a9a50"/><circle cx="34" cy="46" r="3" fill="#ffd000"/><circle cx="46" cy="46" r="3" fill="#ffd000"/><path fill="#4a6038" d="M55 44l12-8-4 14z"/>`,
      "#1a3020",
    ),
    gargula_petrea: frame(
      `<path fill="#6a6a70" d="M25 75h30v12H25z"/><path fill="#8a8a90" d="M30 40h20l8 35H22z"/><path fill="#4a4a50" d="M22 50h36v8H22z"/><circle cx="34" cy="48" r="3" fill="#c04040"/><circle cx="46" cy="48" r="3" fill="#c04040"/>`,
      "#2a2a30",
    ),
    ogro_esmagador: frame(
      `<ellipse cx="40" cy="55" rx="22" ry="22" fill="#6a5040"/><circle cx="34" cy="52" r="4" fill="#1a1a10"/><circle cx="46" cy="52" r="4" fill="#1a1a10"/><path fill="#4a3020" d="M28 62h24v20H28z"/><rect x="12" y="58" width="14" height="24" rx="3" fill="#5a4838"/><rect x="54" y="58" width="14" height="24" rx="3" fill="#5a4838"/>`,
      "#2a2018",
    ),
    atirador_elite: frame(
      `<ellipse cx="40" cy="88" rx="24" ry="6" fill="#0006"/><path fill="#3a4858" d="M28 65h24v16H28z"/><circle cx="40" cy="46" r="12" fill="#d0c0a8"/><rect x="38" y="52" width="22" height="6" fill="#2a2a28" transform="rotate(-8 40 55)"/>`,
      "#283038",
    ),
    mago_vazio: frame(
      `<path fill="#483868" d="M26 70h28v14H26z"/><circle cx="40" cy="42" r="14" fill="#c0b0d8"/><path fill="#2a1838" d="M34 56h12l-2 24H36z"/><circle cx="40" cy="22" r="8" fill="#6080ff" opacity="0.7"/>`,
      "#181028",
    ),
    general_brigada: frame(
      `<ellipse cx="40" cy="88" rx="26" ry="6" fill="#0006"/><path fill="#4a4030" d="M24 58h32v20H24z"/><circle cx="40" cy="44" r="13" fill="#d8c8a8"/><path fill="#2a2010" d="M30 54h20l4 24H26z"/><path fill="#c9a227" d="M38 40h4v8h-4z"/>`,
      "#2a2418",
    ),
    elemental_tormenta: frame(
      `<path fill="#4080c0" d="M20 75c20-30 20-30 40 0" opacity="0.85"/><circle cx="40" cy="48" r="18" fill="#60a0e0" opacity="0.9"/><path fill="none" stroke="#fff" stroke-width="2" d="M25 40h30M30 55h20"/>`,
      "#183050",
    ),
    corruptor_abissal: frame(
      `<ellipse cx="40" cy="55" rx="20" ry="24" fill="#2a0850"/><circle cx="40" cy="50" r="8" fill="#8040ff"/><circle cx="40" cy="50" r="4" fill="#ffd0ff"/><path fill="#1a0030" d="M25 70h30v10H25z"/>`,
      "#0a0018",
    ),
    harpia_ceifadora: frame(
      `<path fill="#6a5040" d="M10 45h60v20H10z" opacity="0.9"/><ellipse cx="40" cy="48" rx="12" ry="10" fill="#d0a880"/><path fill="#4a3830" d="M32 56h16v22H32z"/><path fill="#8a7060" d="M8 48l-6 20h10zM72 48l6 20H68z"/>`,
      "#382820",
    ),
    serpente_alada: frame(
      `<path fill="#4a8040" d="M10 75c30-35 30-35 60 0"/><ellipse cx="40" cy="45" rx="8" ry="6" fill="#5a9a50"/><path fill="none" stroke="#668866" stroke-width="4" d="M15 50c30 10 30 10 50-5"/>`,
      "#102818",
    ),
    dragao_antigo: frame(
      `<path fill="#4a3020" d="M5 72c35-40 35-40 70 0"/><ellipse cx="40" cy="42" rx="18" ry="14" fill="#6a4030"/><circle cx="32" cy="40" r="4" fill="#ffd000"/><circle cx="48" cy="40" r="4" fill="#ffd000"/><path fill="#8a2020" d="M58 38l18-12-6 20z"/>`,
      "#1a1008",
    ),
    boss_sentinela_bronze: frame(
      `<rect x="18" y="35" width="44" height="40" rx="4" fill="#8a7030"/><circle cx="40" cy="48" r="10" fill="#ffd080"/><rect x="34" y="72" width="12" height="18" fill="#6a5020"/>`,
      "#2a2010",
    ),
    boss_carrasco_legiao: frame(
      `<path fill="#5a2020" d="M22 72h36v14H22z"/><circle cx="40" cy="44" r="14" fill="#a0a0a0"/><path stroke="#c9a227" stroke-width="4" fill="none" d="M12 32l8 16M68 32l-8 16"/>`,
      "#280808",
    ),
    boss_general_negra: frame(
      `<ellipse cx="40" cy="88" rx="24" ry="6" fill="#0008"/><path fill="#1a1a20" d="M26 58h28v22H26z"/><circle cx="40" cy="44" r="13" fill="#a8a0b0"/><path fill="#c9a227" d="M36 38h8l2 8h-12z"/>`,
      "#0a0810",
    ),
    boss_tita_cerco: frame(
      `<rect x="20" y="40" width="40" height="36" rx="2" fill="#4a4840"/><rect x="28" y="28" width="24" height="16" fill="#3a3830"/><circle cx="40" cy="36" r="6" fill="#ff6040"/>`,
      "#181816",
    ),
    imperador_supremo: frame(
      `<path fill="#4a2028" d="M15 70c25-35 25-35 50 0"/><circle cx="40" cy="42" r="16" fill="#d4a060"/><path fill="#c9a227" d="M28 38h24v8H28z"/><circle cx="40" cy="22" r="10" fill="#ffd700"/>`,
      "#200810",
    ),
  };
  return m[id] ?? frame(
    `<ellipse cx="40" cy="88" rx="22" ry="5" fill="#0006"/><circle cx="40" cy="50" r="16" fill="#6a5850"/><ellipse cx="40" cy="48" rx="10" ry="8" fill="#4a4038"/>`,
    "#2a2420",
  );
}

export function heroSplashDataUrl(heroClass: HeroClassId): string {
  return svgDataUrl(heroSvgs[heroClass]);
}

export function enemySplashDataUrl(archetypeId: string): string {
  return svgDataUrl(enemySvg(archetypeId));
}

/** Estilo inline para chip de iniciativa (gradiente + splash). */
export function turnTileBackgroundStyle(
  isPlayer: boolean,
  splashUrl: string,
): string {
  const grad = isPlayer
    ? "linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.52))"
    : "linear-gradient(180deg,rgba(48,22,22,0.35),rgba(0,0,0,0.58))";
  const u = JSON.stringify(splashUrl);
  return `background-image:${grad},url(${u});background-size:cover,cover;background-position:center,center;background-repeat:no-repeat,no-repeat`;
}
