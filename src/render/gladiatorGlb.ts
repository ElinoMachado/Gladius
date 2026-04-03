/**
 * Compatibilidade: carregamento unificado em `heroGlbLoader.ts`.
 */
export type { HeroForgeAttachConfig as GladiadorForgeAttachConfig } from "./heroGlbShared";
export {
  cloneGladiadorBodyFromGlb,
  getGladiadorForgeAttach,
  isGladiadorGlbReady,
  preloadGladiadorGlb,
} from "./heroGlbLoader";
export { resolveHeroForgeAttachFromRig } from "./heroRigAttach";
