/** Identificadores para ícones SVG na grelha de atributos do combate. */
export type StatIconId =
  | "dmg"
  | "def"
  | "pen"
  | "crit_hit"
  | "crit_dmg"
  | "mov"
  | "range"
  | "regen_hp"
  | "regen_mp"
  | "lifesteal"
  | "pot"
  | "luck"
  | "fly"
  | "kills"
  | "stone"
  | "motor"
  | "poison"
  | "ult"
  | "forma"
  | "basic"
  | "artifact"
  | "xp_bonus"
  | "ouro_wave"
  | "generic";

function potGradient(uniq: number): string {
  const id = `potg-${uniq}`;
  return `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e91e63"/><stop offset="20%" stop-color="#ff9800"/><stop offset="40%" stop-color="#ffeb3b"/><stop offset="55%" stop-color="#4caf50"/><stop offset="70%" stop-color="#00bcd4"/><stop offset="85%" stop-color="#7c4dff"/><stop offset="100%" stop-color="#e91e63"/></linearGradient></defs><path fill="none" stroke="url(#${id})" stroke-width="2.4" stroke-linecap="round" d="M12 5v14M5 12h14"/>`;
}

function xpPrismGradient(uniq: number): string {
  const id = `xpg-${uniq}`;
  return `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c4dff"/><stop offset="25%" stop-color="#00bcd4"/><stop offset="45%" stop-color="#69f0ae"/><stop offset="65%" stop-color="#ffeb3b"/><stop offset="85%" stop-color="#ff9100"/><stop offset="100%" stop-color="#e040fb"/></linearGradient></defs>`;
}

/** SVG interno (viewBox 0 0 24 24). */
export function statIconSvg(id: StatIconId, uniqueIndex: number): string {
  switch (id) {
    case "dmg":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#d32f2f" stroke="#8b0000" stroke-width="0.35"><g transform="translate(12,12) rotate(-42)"><rect x="-1.1" y="-11" width="2.2" height="15" rx="0.4"/><rect x="-5.5" y="3.5" width="11" height="2.2" rx="0.35"/></g><g transform="translate(12,12) rotate(42)" fill="#c62828"><rect x="-1.1" y="-11" width="2.2" height="15" rx="0.4"/><rect x="-5.5" y="3.5" width="11" height="2.2" rx="0.35"/></g></g></svg>`;
    case "def":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#5d4037" stroke="#3e2723" stroke-width="0.8" d="M12 2.5l6.5 2.8v6.4c0 4.2-3.2 8.1-6.5 9.8-3.3-1.7-6.5-5.6-6.5-9.8V5.3L12 2.5z"/><path fill="#8d6e63" d="M12 5.2L9 6.5v5.6c0 2.5 1.8 4.9 3 6 1.2-1.1 3-3.5 3-6V6.5l-3-1.3z"/></svg>`;
    case "pen":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#6a1b9a" stroke="#4a148c" stroke-width="0.6" d="M12 3l5.5 2.4v5.5c0 1.2-.3 2.4-.8 3.5L12 21l-4.7-6.6c-.5-1.1-.8-2.3-.8-3.5V5.4L12 3z"/><path fill="none" stroke="#ce93d8" stroke-width="1.4" stroke-linecap="round" d="M8 9l3 5M14 7l-2 8"/></svg>`;
    case "crit_hit":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ffb74d" d="M12 2l1.8 5.5h5.7l-4.6 3.4 1.8 5.5-4.7-3.4-4.7 3.4 1.8-5.5-4.6-3.4h5.7L12 2z"/></svg>`;
    case "crit_dmg":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#e65100" d="M12 1l2.2 6.8h7l-5.7 4.1 2.2 6.8-5.7-4.1-5.7 4.1 2.2-6.8-5.7-4.1h7L12 1z"/><path fill="#bf360c" d="M12 6.5l1 3.1h3.2l-2.6 1.9 1 3.1-2.6-1.9-2.6 1.9 1-3.1-2.6-1.9h3.2l1-3.1z"/></svg>`;
    case "mov":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#4fc3f7" stroke="#0277bd" stroke-width="1" d="M12 3.5l6.2 3.6v7.2L12 17.9l-6.2-3.6V7.1L12 3.5z"/></svg>`;
    case "range":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#eceff1" stroke-width="1.8"/><path stroke="#eceff1" stroke-width="1.8" stroke-linecap="round" d="M12 7v10M7 12h10"/></svg>`;
    case "regen_hp":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#43a047" d="M12 21s-6.2-4.35-6.2-9.2c0-2.55 1.65-4.6 4.1-4.6 1.3 0 2.5.7 3.1 1.7.6-1 1.8-1.7 3.1-1.7 2.45 0 4.1 2.05 4.1 4.6C20.2 16.65 12 21 12 21z"/></svg>`;
    case "regen_mp":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#0d47a1" d="M12 2.2c-3.3 4.5-6 7.8-6 11.2a6 6 0 1012 0c0-3.4-2.7-6.7-6-11.2z"/></svg>`;
    case "lifesteal":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#b71c1c" d="M12 2.2c-3.3 4.5-6 7.8-6 11.2a6 6 0 1012 0c0-3.4-2.7-6.7-6-11.2z"/></svg>`;
    case "pot":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${potGradient(uniqueIndex)}</svg>`;
    case "luck":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#66bb6a" stroke="#2e7d32" stroke-width="0.2"><circle cx="12" cy="7.6" r="3.35"/><circle cx="16.4" cy="12" r="3.35"/><circle cx="12" cy="16.4" r="3.35"/><circle cx="7.6" cy="12" r="3.35"/><circle cx="12" cy="12" r="2.05" fill="#388e3c" stroke="none"/></g></svg>`;
    case "fly":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#d4af37" stroke="#8a6a12" stroke-width="0.35"><path d="M2.2 12.2C4.5 7 8.2 4 12 5.2c-1.2 2.8-2.8 5.5-5 7.8-2.2-.4-4.2-1-4.8-.8z"/><path d="M21.8 12.2C19.5 7 15.8 4 12 5.2c1.2 2.8 2.8 5.5 5 7.8 2.2-.4 4.2-1 4.8-.8z"/><path fill="#f5e6a8" opacity="0.55" stroke="none" d="M5.5 11.5C7.8 9.2 10 7.5 12 6.8c2 .7 4.2 2.4 6.5 4.7-2.5.2-5.2.1-8-.2-1.5-.2-3-.5-4.8-.8z"/></g></svg>`;
    case "kills":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#9e9e9e" d="M9 3h6v2h-1v3l2 8H8l2-8V5H9V3zM8 19h8v2H8v-2z"/></svg>`;
    case "stone":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="6" width="14" height="12" rx="1" fill="#78909c" stroke="#455a64"/></svg>`;
    case "motor":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ffc107" d="M13 2L3 14h6l-2 8 10-12H11l2-8z"/></svg>`;
    case "poison":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="11" r="7" fill="#7cb342" stroke="#33691e"/><path fill="#33691e" d="M9 4h6v3H9z"/><circle cx="9.5" cy="10" r="1" fill="#1b5e20"/><circle cx="14.5" cy="10" r="1" fill="#1b5e20"/></svg>`;
    case "ult":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ab47bc" d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.5-6.2-4.5-6.2 4.5 2.4-7.5-6.2-4.5h7.6L12 2z"/></svg>`;
    case "forma":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ffd54f" stroke="#f9a825" d="M5 16l2-6 5-2 5 2 2 6-7 3-7-3z"/></svg>`;
    case "basic":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#90a4ae" d="M8 3l10 10-4 1-1 4L3 8l5-5z"/></svg>`;
    case "artifact":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ba68c8" d="M12 2l1.5 4.5h4.7l-3.8 2.8 1.5 4.5-3.9-2.8-3.9 2.8 1.5-4.5-3.8-2.8h4.7L12 2z"/></svg>`;
    case "xp_bonus":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${xpPrismGradient(uniqueIndex)}<path fill="url(#xpg-${uniqueIndex})" d="M12 3.2l1.35 3.1 3.35.45-2.5 2.35.75 3.35L12 14.1 8.05 12.45l.75-3.35-2.5-2.35 3.35-.45L12 3.2z" opacity="0.95"/><path fill="none" stroke="url(#xpg-${uniqueIndex})" stroke-width="1.2" stroke-linecap="round" d="M12 15.5v4.8M9.2 18.4h5.6"/></svg>`;
    case "ouro_wave":
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="7.25" fill="#e8b923" stroke="#7a5a10" stroke-width="0.7"/><ellipse cx="9.5" cy="9" rx="2.5" ry="1.5" fill="#fff8c4" opacity="0.4"/><path d="M12 16.6a6.1 6.1 0 01-.8-12.1 6.1 6.1 0 01.8 12.1z" fill="#c9a010" opacity="0.2"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#78909c"/></svg>`;
  }
}

export function statIconWrap(id: StatIconId, uniqueIndex: number): string {
  return `<span class="lol-stat-ico" data-ico="${id}">${statIconSvg(id, uniqueIndex)}</span>`;
}
