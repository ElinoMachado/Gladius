import { refreshSfxVolume } from "../audio/combatSounds";
import { getSfxVolumePercent, setSfxVolumePercent } from "../game/sfxVolumePref";

export function initSfxVolumeControl(): void {
  const range = document.getElementById(
    "sfx-volume-range",
  ) as HTMLInputElement | null;
  const icon = document.getElementById("sfx-volume-icon");
  if (!range) return;

  const applyIcon = (): void => {
    const v = getSfxVolumePercent();
    if (icon) {
      icon.classList.toggle("sfx-volume-icon--muted", v <= 0);
    }
  };

  range.value = String(getSfxVolumePercent());
  applyIcon();

  range.addEventListener("input", () => {
    setSfxVolumePercent(Number(range.value));
    refreshSfxVolume();
    applyIcon();
  });

  refreshSfxVolume();
}
