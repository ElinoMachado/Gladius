import { getMusicVolumeFactor } from "../game/musicVolumePref";

const THEME = "/audio/menu-theme.mp3";
/** Volume máximo do tema de menu (slider a 100%). */
const BASE_MENU_VOLUME = 0.22;

let themeAudio: HTMLAudioElement | null = null;

function applyMenuThemeVolume(): void {
  if (themeAudio) {
    themeAudio.volume = BASE_MENU_VOLUME * getMusicVolumeFactor();
  }
}

export function refreshMenuThemeVolume(): void {
  applyMenuThemeVolume();
}

function getThemeAudio(): HTMLAudioElement {
  if (!themeAudio) {
    themeAudio = new Audio(THEME);
    themeAudio.loop = true;
    themeAudio.preload = "auto";
    applyMenuThemeVolume();
  } else {
    applyMenuThemeVolume();
  }
  return themeAudio;
}

/** Toca o tema se estiver em pausa (setup, loja, menu, etc.). */
export function ensureMenuThemePlaying(): void {
  const th = getThemeAudio();
  if (th.paused) void th.play().catch(() => {});
}

/** Pausa sem rebobinar (ex.: ao entrar na arena). */
export function pauseMenuTheme(): void {
  themeAudio?.pause();
}

/** Pausa e volta ao início (ex.: sair da run para o menu). */
export function stopMenuThemeAndReset(): void {
  if (themeAudio) {
    themeAudio.pause();
    themeAudio.currentTime = 0;
  }
}
