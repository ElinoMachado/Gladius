import * as THREE from "three";
import {
  heroSelectionIdleClip,
  normAnimClipName,
} from "../game/heroCombatAnimMs";
import type { HeroClassId } from "../game/types";
import { getHeroGlbAnimationClips } from "./heroGlbLoader";

function findAnimationRoot(obj: THREE.Object3D): THREE.Object3D | null {
  let sm: THREE.SkinnedMesh | null = null;
  obj.traverse((o) => {
    if (sm) return;
    if (o instanceof THREE.SkinnedMesh && o.skeleton?.bones?.length) sm = o;
  });
  return sm ?? obj;
}

export function setupHeroUnitAnimations(
  unitRoot: THREE.Group,
  heroClass: HeroClassId,
): void {
  const clips = getHeroGlbAnimationClips(heroClass);
  if (clips.length === 0) return;
  const animRoot = findAnimationRoot(unitRoot);
  if (!animRoot) return;
  const mixer = new THREE.AnimationMixer(animRoot);
  const byNorm = new Map<string, THREE.AnimationClip>();
  for (const c of clips) {
    byNorm.set(normAnimClipName(c.name), c);
  }
  unitRoot.userData.heroAnimMixer = mixer;
  unitRoot.userData.heroAnimClipMap = byNorm;
  unitRoot.userData.heroAnimActions = new Map<string, THREE.AnimationAction>();
  unitRoot.userData.heroClassForAnim = heroClass;
}

export function updateHeroUnitAnimations(unitRoot: THREE.Object3D, dt: number): void {
  const m = unitRoot.userData.heroAnimMixer as THREE.AnimationMixer | undefined;
  if (m) m.update(dt);
}

export function playHeroUnitClip(
  unitRoot: THREE.Object3D,
  clipCandidates: string[],
  opts?: { loop?: THREE.AnimationActionLoopStyles; fadeSec?: number },
): boolean {
  const map = unitRoot.userData.heroAnimClipMap as
    | Map<string, THREE.AnimationClip>
    | undefined;
  const mixer = unitRoot.userData.heroAnimMixer as THREE.AnimationMixer | undefined;
  const actions = unitRoot.userData.heroAnimActions as
    | Map<string, THREE.AnimationAction>
    | undefined;
  if (!map || !mixer || !actions) return false;
  let clip: THREE.AnimationClip | undefined;
  let usedKey = "";
  for (const raw of clipCandidates) {
    const k = normAnimClipName(raw);
    const c = map.get(k);
    if (c) {
      clip = c;
      usedKey = k;
      break;
    }
  }
  if (!clip) return false;
  const loop = opts?.loop ?? THREE.LoopRepeat;
  const fade = opts?.fadeSec ?? 0.12;
  let action = actions.get(usedKey);
  if (!action) {
    action = mixer.clipAction(clip);
    actions.set(usedKey, action);
  }
  for (const a of actions.values()) {
    if (a !== action && a.isRunning()) {
      a.fadeOut(fade);
    }
  }
  action.reset();
  action.setLoop(loop, loop === THREE.LoopRepeat ? Infinity : 1);
  action.clampWhenFinished = loop === THREE.LoopOnce;
  action.fadeIn(fade);
  action.play();
  return true;
}

export function stopHeroUnitClips(unitRoot: THREE.Object3D, fadeSec = 0.08): void {
  const actions = unitRoot.userData.heroAnimActions as
    | Map<string, THREE.AnimationAction>
    | undefined;
  if (!actions) return;
  for (const a of actions.values()) {
    a.fadeOut(fadeSec);
  }
}

/** Ecrã de seleção: rig + clip ocioso/concordar quando existir no GLB. */
export function applyHeroSelectionPreviewAnimations(
  body: THREE.Group,
  heroClass: HeroClassId,
): void {
  setupHeroUnitAnimations(body, heroClass);
  const sel = heroSelectionIdleClip(heroClass);
  if (sel) {
    playHeroUnitClip(body, [sel], { loop: THREE.LoopRepeat, fadeSec: 0.15 });
  }
}
