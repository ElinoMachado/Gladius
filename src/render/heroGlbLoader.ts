import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedHierarchy } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { HeroClassId } from "../game/types";
import { registerHeroAnimationClips } from "../game/heroCombatAnimMs";
import {
  type HeroForgeAttachConfig,
  prepareHeroGlbRoot,
  tintHeroMeshes,
} from "./heroGlbShared";

import gladiadorUrl from "../models/Gladiador.glb?url";
import sacerdotisaUrl from "../models/Sacerdotisa.glb?url";
import pistoleiroUrl from "../models/Pistoleiro.glb?url";

type Template = {
  root: THREE.Group;
  clips: THREE.AnimationClip[];
  forgeAttach: HeroForgeAttachConfig;
};

const TARGET: Record<HeroClassId, number> = {
  gladiador: 1.45,
  sacerdotisa: 1.38,
  pistoleiro: 1.42,
};

const URLS: Record<HeroClassId, string> = {
  gladiador: gladiadorUrl,
  sacerdotisa: sacerdotisaUrl,
  pistoleiro: pistoleiroUrl,
};

const templates: Partial<Record<HeroClassId, Template>> = {};
const loadPromises: Partial<Record<HeroClassId, Promise<boolean>>> = {};
const loadFailed: Partial<Record<HeroClassId, boolean>> = {};

function loadOne(heroClass: HeroClassId): Promise<boolean> {
  if (templates[heroClass]) return Promise.resolve(true);
  if (loadFailed[heroClass]) return Promise.resolve(false);
  const existing = loadPromises[heroClass];
  if (existing) return existing;

  loadPromises[heroClass] = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      URLS[heroClass],
      (gltf) => {
        const clips = gltf.animations ?? [];
        registerHeroAnimationClips(
          clips.map((c) => ({ name: c.name, duration: c.duration })),
        );
        const { root, forgeAttach } = prepareHeroGlbRoot(
          gltf.scene,
          TARGET[heroClass],
          `hero_glb_${heroClass}`,
        );
        templates[heroClass] = { root, clips, forgeAttach };
        resolve(true);
      },
      undefined,
      () => {
        loadFailed[heroClass] = true;
        resolve(false);
      },
    );
  });
  return loadPromises[heroClass]!;
}

/** Pré-carrega os três heróis (falha parcial por classe é OK — cai no procedural). */
export function preloadAllHeroGlbs(): Promise<void> {
  return Promise.all([
    loadOne("gladiador"),
    loadOne("sacerdotisa"),
    loadOne("pistoleiro"),
  ]).then(() => undefined);
}

/** Compat: menu antigo só pré-carregava o gladiador. */
export function preloadGladiadorGlb(): Promise<boolean> {
  return loadOne("gladiador");
}

export function isHeroGlbReady(heroClass: HeroClassId): boolean {
  return templates[heroClass] != null;
}

export function isGladiadorGlbReady(): boolean {
  return isHeroGlbReady("gladiador");
}

export function getHeroGlbForgeAttach(
  heroClass: HeroClassId,
): HeroForgeAttachConfig | null {
  return templates[heroClass]?.forgeAttach ?? null;
}

export function getGladiadorForgeAttach(): HeroForgeAttachConfig | null {
  return getHeroGlbForgeAttach("gladiador");
}

export function getHeroGlbAnimationClips(heroClass: HeroClassId): THREE.AnimationClip[] {
  return templates[heroClass]?.clips ?? [];
}

/**
 * Instância para combate / preview: clone de hierarquia com skeleton mantém rigs e animações.
 */
export function cloneHeroBodyFromGlb(
  heroClass: HeroClassId,
  displayColor: number,
): THREE.Group | null {
  const t = templates[heroClass];
  if (!t) return null;
  const body = cloneSkinnedHierarchy(t.root) as THREE.Group;
  tintHeroMeshes(body, displayColor);
  return body;
}

export function cloneGladiadorBodyFromGlb(displayColor: number): THREE.Group | null {
  return cloneHeroBodyFromGlb("gladiador", displayColor);
}
