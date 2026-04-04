import type { HeroPreview3DOptions } from "./HeroPreview3D";

/**
 * Câmara por ecrã — não reutilizar entre loja / bioma / setup sem querer:
 * cada layout CSS pede `cameraZ` / `lookAtY` / `fov` diferentes.
 */
export const heroPreviewCameraGoldShopTurntable: HeroPreview3DOptions = {
  cameraZ: 2.95,
  lookAtY: 0.58,
  fov: 36,
};

/** Loja de ouro sem bunker (painel de herói mais estreito). */
export const heroPreviewCameraGoldShopSolo: HeroPreview3DOptions = {
  cameraZ: 2.82,
  lookAtY: 0.6,
  fov: 36,
};

/**
 * Bioma inicial — área alta (`--biome-stage-h`); precisa de mais margem vertical
 * (capuz, cajado, hábito).
 */
export const heroPreviewCameraBiomeInitial: HeroPreview3DOptions = {
  cameraZ: 3.38,
  lookAtY: 0.52,
  fov: 40,
};

/** Cartões de slot na escolha de party (`aspect-ratio: 220 / 300`). */
export const heroPreviewCameraSetupSlotCard: HeroPreview3DOptions = {
  cameraZ: 2.35,
  lookAtY: 0.72,
  fov: 40,
};
