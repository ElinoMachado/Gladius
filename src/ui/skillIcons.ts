/**
 * Ícones SVG pequenos para botões de habilidade (tema alinhado ao nome da skill).
 */
const V = 28;

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${V}" height="${V}" aria-hidden="true">${inner}</svg>`;
}

const icons: Record<string, string> = {
  __basic__: wrap(
    `<defs>
      <linearGradient id="basicBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3a3028"/><stop offset="1" stop-color="#12100e"/>
      </linearGradient>
      <linearGradient id="basicStrike" x1="0" y1="0.5" x2="1" y2="0.5">
        <stop offset="0" stop-color="#ff4400" stop-opacity="0"/>
        <stop offset="0.35" stop-color="#ff7722" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#ffcc66" stop-opacity="0.25"/>
      </linearGradient>
    </defs>
    <rect width="${V}" height="${V}" rx="4" fill="url(#basicBg)"/>
    <path fill="url(#basicStrike)" d="M1.5 5.5 L17 14 L1.5 22.5 Z" opacity="0.92"/>
    <path fill="none" stroke="#ffaa55" stroke-width="1.1" stroke-linecap="round" opacity="0.85" d="M3.5 9.5 L11.5 12 M3.5 14 L12.5 14 M3.5 18.5 L11.5 16"/>
    <path fill="none" stroke="#ffdd88" stroke-width="0.75" stroke-linecap="round" opacity="0.55" d="M2.5 7 L9 11.5 M2.5 21 L9 16.5"/>
    <path fill="#e8dcc8" stroke="#5a4838" stroke-width="0.65" stroke-linejoin="round"
      d="M12.2 8.2h8.6c1.15 0 2.1 0.95 2.1 2.15v5.1c0 1.45-1.15 2.65-2.6 2.65h-5.4c-1.95 0-3.5-1.55-3.5-3.45v-3.1c0-1.2 0.95-2.35 2.4-2.35z"/>
    <path fill="#d4c4b0" stroke="#5a4838" stroke-width="0.45"
      d="M10.8 12.2c-1.1 0.2-1.85 1.05-1.85 2.25v1.9l2.4 1.35 1.85-3.9c0.1-0.55-0.35-1.1-0.95-1.15l-1.45 0.15z"/>
    <ellipse cx="15.2" cy="10.8" rx="1.65" ry="1.45" fill="#c9b8a4"/>
    <ellipse cx="18.1" cy="10.65" rx="1.45" ry="1.35" fill="#c4b4a0"/>
    <ellipse cx="20.5" cy="10.9" rx="1.25" ry="1.25" fill="#beb0a0"/>`,
  ),

  atirar_todo_lado: wrap(
    `<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3848"/><stop offset="1" stop-color="#1a1418"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g1)"/><g fill="#c9a227"><circle cx="6" cy="10" r="1.8"/><circle cx="11" cy="8" r="1.8"/><circle cx="16" cy="11" r="1.8"/><circle cx="20" cy="9" r="1.8"/></g><path fill="#8a7060" d="M5 18h18v3H5z"/><ellipse cx="14" cy="19.5" rx="5" ry="1.2" fill="#5a4a40"/>`,
  ),

  tiro_destruidor: wrap(
    `<defs>
      <linearGradient id="tdBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2848"/><stop offset="1" stop-color="#0a1020"/></linearGradient>
      <linearGradient id="tdBeam" x1="0" y1="0.5" x2="1" y2="0.5">
        <stop offset="0" stop-color="#4060ff" stop-opacity="0.15"/>
        <stop offset="0.45" stop-color="#88ccff" stop-opacity="0.95"/>
        <stop offset="0.55" stop-color="#ccffff" stop-opacity="1"/>
        <stop offset="1" stop-color="#4060ff" stop-opacity="0.2"/>
      </linearGradient>
    </defs>
    <rect width="${V}" height="${V}" rx="4" fill="url(#tdBg)"/>
    <rect x="2" y="11.5" width="24" height="5" rx="1.2" fill="url(#tdBeam)"/>
    <rect x="2" y="12.8" width="24" height="2" fill="#e8ffff" opacity="0.55"/>`,
  ),

  ate_a_morte: wrap(
    `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3030"/><stop offset="1" stop-color="#2a1010"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g2)"/><path fill="#c04040" d="M14 4l2 8 8 2-8 2-2 8-2-8-8-2 8-2z"/><path fill="#ff8060" d="M14 9l1 4 4 1-4 1-1 4-1-4-4-1 4-1z"/>`,
  ),

  sentenca: wrap(
    `<defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#483868"/><stop offset="1" stop-color="#1a1028"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g3)"/><path fill="none" stroke="#c8a0ff" stroke-width="1.5" d="M14 5v18"/><path fill="none" stroke="#88c0ff" stroke-width="1.2" d="M8 9h12M8 19h12"/><circle cx="14" cy="14" r="3" fill="none" stroke="#ffd080" stroke-width="1"/>`,
  ),

  bunker_minas: wrap(
    `<defs><linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a38"/><stop offset="1" stop-color="#181816"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g4)"/><circle cx="10" cy="12" r="4" fill="#2a2a28" stroke="#668866"/><path fill="#446644" d="M9 12h2v4H9z"/><circle cx="18" cy="17" r="3.5" fill="#3a3530" stroke="#aa8855"/><path fill="#aa8855" d="M17 17h2v3h-2z"/>`,
  ),

  bunker_tiro_preciso: wrap(
    `<defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#284868"/><stop offset="1" stop-color="#101820"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g5)"/><circle cx="14" cy="14" r="8" fill="none" stroke="#7ec8ff" stroke-width="1.2"/><circle cx="14" cy="14" r="2.5" fill="#ff6040"/><path stroke="#fff" stroke-width="1" d="M14 4v4M14 20v4M4 14h4M20 14h4"/>`,
  ),

  especialista_destruicao: wrap(
    `<defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a2020"/><stop offset="1" stop-color="#280808"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#g6)"/><path fill="#ff4422" d="M14 5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="14" cy="14" r="4" fill="#ffaa33" opacity="0.9"/>`,
  ),

  pisotear: wrap(
    `<defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5048"/><stop offset="1" stop-color="#1a1814"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#gp)"/><ellipse cx="14" cy="20" rx="9" ry="3" fill="#3a3530"/><path fill="#8a8078" d="M10 8h8v10h-8z"/><path fill="#c9a227" d="M12 6h4v4h-4z"/>`,
  ),

  weapon_ult_paraiso: wrap(
    `<defs><linearGradient id="wu1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a8aff"/><stop offset="1" stop-color="#2030aa"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#wu1)"/><path fill="#fff8e0" d="M14 4l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z"/>`,
  ),

  weapon_ult_furacao: wrap(
    `<defs><linearGradient id="wu2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cc6630"/><stop offset="1" stop-color="#4a2010"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#wu2)"/><g fill="none" stroke="#ffd080" stroke-width="1.2"><circle cx="10" cy="11" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M6 20h16"/></g>`,
  ),

  weapon_ult_furia: wrap(
    `<defs><linearGradient id="wu3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aa4030"/><stop offset="1" stop-color="#401010"/></linearGradient></defs><rect width="${V}" height="${V}" rx="4" fill="url(#wu3)"/><path fill="#c9a227" d="M8 6h12v4H8z"/><path fill="#e8e0d8" d="M10 10l4 14 4-14z"/>`,
  ),
};

const fallback = wrap(
  `<rect width="${V}" height="${V}" rx="4" fill="#2a2830"/><text x="14" y="18" text-anchor="middle" fill="#8a8580" font-size="11" font-weight="700">?</text>`,
);

/** HTML do ícone (SVG inline) para usar dentro do botão de skill. */
export function skillButtonIconHtml(skillId: string): string {
  const svg = icons[skillId] ?? fallback;
  return `<span class="lol-skill-ico">${svg}</span>`;
}

export function basicAttackIconHtml(): string {
  return skillButtonIconHtml("__basic__");
}
