import { FINAL_VICTORY_WAVE, waveConfigFromIndex } from "../game/data/enemies";
import { getMusicVolumeFactor } from "../game/musicVolumePref";

export type CombatMusicMood = "epic" | "elite" | "boss" | "emperor";

export function combatMusicMoodFromWave(wave: number): CombatMusicMood {
  const cfg = waveConfigFromIndex(wave);
  if (cfg.isBoss) {
    if (wave === FINAL_VICTORY_WAVE) return "emperor";
    return "boss";
  }
  if (cfg.isElite) return "elite";
  return "epic";
}

/** Mesmo ficheiro CC0; volume baixo para os SFX de combate ganharem destaque. */
const MOOD_AUDIO: Record<
  CombatMusicMood,
  { playbackRate: number; volume: number }
> = {
  epic: { playbackRate: 1, volume: 0.11 },
  elite: { playbackRate: 1.07, volume: 0.1 },
  boss: { playbackRate: 1.16, volume: 0.12 },
  emperor: { playbackRate: 0.84, volume: 0.09 },
};

const TRACK = `${import.meta.env.BASE_URL}audio/rpg-battle-loop.mp3`;

let audioEl: HTMLAudioElement | null = null;
let currentMood: CombatMusicMood | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(TRACK);
    audioEl.loop = true;
    audioEl.preload = "auto";
  }
  return audioEl;
}

function applyArenaElementVolume(el: HTMLAudioElement, mood: CombatMusicMood): void {
  const cfg = MOOD_AUDIO[mood];
  el.volume = cfg.volume * getMusicVolumeFactor();
}

/** Atualiza volume após mudar o slider (combate ativo). */
export function refreshArenaMusicVolume(): void {
  if (!audioEl || currentMood === null) return;
  applyArenaElementVolume(audioEl, currentMood);
}

/** Inicia ou mantém música de combate (ficheiro em `public/audio/`). */
export function setArenaCombatMusicFromWave(wave: number): void {
  const mood = combatMusicMoodFromWave(wave);
  const el = getAudio();
  const cfg = MOOD_AUDIO[mood];
  el.playbackRate = cfg.playbackRate;
  applyArenaElementVolume(el, mood);

  if (currentMood === mood && !el.paused) return;
  currentMood = mood;
  void el.play().catch(() => {
    /* autoplay ou ficheiro em falta */
  });
}

/** @deprecated Usar setArenaCombatMusicFromWave(1). */
export function startArenaAmbient(): void {
  setArenaCombatMusicFromWave(1);
}

export function stopArenaAmbient(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  currentMood = null;
}
