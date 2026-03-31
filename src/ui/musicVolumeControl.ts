import { refreshArenaMusicVolume } from "../audio/arenaAmbient";
import { refreshMenuThemeVolume } from "../audio/menuAmbient";
import {
  getMusicVolumePercent,
  setMusicVolumePercent,
} from "../game/musicVolumePref";

function refreshAllMusicVolumes(): void {
  refreshMenuThemeVolume();
  refreshArenaMusicVolume();
}

export function initMusicVolumeControl(): void {
  const range = document.getElementById(
    "music-volume-range",
  ) as HTMLInputElement | null;
  const icon = document.getElementById("music-volume-icon");
  if (!range) return;

  const applyIcon = (): void => {
    const v = getMusicVolumePercent();
    if (icon) {
      icon.classList.toggle("music-volume-icon--muted", v <= 0);
    }
  };

  range.value = String(getMusicVolumePercent());
  applyIcon();

  range.addEventListener("input", () => {
    setMusicVolumePercent(Number(range.value));
    refreshAllMusicVolumes();
    applyIcon();
  });

  refreshAllMusicVolumes();
}
