import * as THREE from "three";
import {
  type HeroForgeAttachConfig,
  computeHeroForgeAttachFromMeshBox,
  unionMeshWorldBox3,
} from "./heroGlbShared";

const _wPos = new THREE.Vector3();
const _wPos2 = new THREE.Vector3();
const _wPos3 = new THREE.Vector3();
const _wQuat = new THREE.Quaternion();
const _backOff = new THREE.Vector3();
const _mid = new THREE.Vector3();

function normBoneName(name: string): string {
  return name
    .replace(/^mixamorig:/i, "")
    .replace(/^armature\//i, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function pickBestBone(
  bones: readonly THREE.Bone[],
  scoreFn: (norm: string) => number,
): THREE.Bone | null {
  let best: THREE.Bone | null = null;
  let bestS = 0;
  for (const b of bones) {
    const s = scoreFn(normBoneName(b.name));
    if (s > bestS) {
      bestS = s;
      best = b;
    }
  }
  return bestS > 0 ? best : null;
}

function scoreHeadBone(n: string): number {
  if (n.includes("neck") && !n.includes("head")) return 0;
  if (n === "head") return 100;
  if (n.endsWith("_head") || n.endsWith(".head")) return 92;
  if (n.includes("skull")) return 85;
  if (n.includes("head") && !n.includes("fore") && !n.includes("shoulder")) return 72;
  return 0;
}

function scoreNeckBone(n: string): number {
  if (n === "neck" || n.endsWith("_neck") || n.endsWith(".neck")) return 100;
  if (n.includes("neck") && !n.includes("knee")) return 78;
  return 0;
}

function scoreUpperBackBone(n: string): number {
  if (n.includes("spine") && (n.includes("3") || n.includes("2"))) return 96;
  if (n.includes("upperchest") || n.includes("chest")) return 90;
  if (n.includes("spine1") && !n.includes("2")) return 78;
  if (n === "spine" || n.endsWith("spine")) return 55;
  if (n.includes("clavicle") || n.includes("shoulder")) return 48;
  return 0;
}

function isLeftSideName(n: string): boolean {
  return (
    n.includes("left") ||
    n.startsWith("l_") ||
    n.includes("_l_") ||
    n.endsWith(".l") ||
    n.endsWith("_l") ||
    n.startsWith("left")
  );
}

function isRightSideName(n: string): boolean {
  return (
    n.includes("right") ||
    n.startsWith("r_") ||
    n.includes("_r_") ||
    n.endsWith(".r") ||
    n.endsWith("_r") ||
    n.startsWith("right")
  );
}

function scoreHandBone(n: string, wantLeft: boolean): number {
  const L = isLeftSideName(n);
  const R = isRightSideName(n);
  if (wantLeft && R) return 0;
  if (!wantLeft && L) return 0;
  if (wantLeft && !L) return 0;
  if (!wantLeft && !R) return 0;
  if (n.includes("hand")) return 100;
  if (n.includes("wrist")) return 86;
  if (n.includes("forearm") || n.includes("lowerarm") || n.includes("lower_arm")) return 52;
  return 0;
}

function firstSkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let sm: THREE.SkinnedMesh | null = null;
  root.traverse((o) => {
    if (sm) return;
    if (o instanceof THREE.SkinnedMesh && o.skeleton?.bones?.length) sm = o;
  });
  return sm;
}

/**
 * Anexos da forja a partir do rig (cabeça, costas, mãos).
 * `bboxBase` vem do GLB escalado (ex.: `getHeroGlbForgeAttach`); se null, calcula-se da bbox das malhas.
 */
export function resolveHeroForgeAttachFromRig(
  heroRoot: THREE.Object3D,
  glbBody: THREE.Object3D,
  bboxBase: HeroForgeAttachConfig | null,
  targetHeight = 1.45,
): HeroForgeAttachConfig | null {
  const sm = firstSkinnedMesh(glbBody);
  if (!sm?.skeleton?.bones?.length) return null;

  const bones = sm.skeleton.bones;
  const headBone = pickBestBone(bones, scoreHeadBone);
  if (!headBone) return null;

  const box = unionMeshWorldBox3(glbBody);
  const size = new THREE.Vector3();
  box.getSize(size);
  const sy = Math.max(size.y, 1e-4);
  const base =
    bboxBase ?? computeHeroForgeAttachFromMeshBox(glbBody, targetHeight);
  const out: HeroForgeAttachConfig = {
    helmet: { ...base.helmet },
    cape: { ...base.cape },
    manoplas: { ...base.manoplas },
  };

  headBone.getWorldPosition(_wPos);
  heroRoot.worldToLocal(_wPos);
  out.helmet.x = _wPos.x;
  out.helmet.y = _wPos.y;
  out.helmet.z = _wPos.z;

  const neckBone = pickBestBone(bones, scoreNeckBone);
  if (neckBone) {
    headBone.getWorldPosition(_wPos);
    neckBone.getWorldPosition(_wPos2);
    const d = _wPos.distanceTo(_wPos2);
    out.helmet.scale = THREE.MathUtils.clamp(d * 3.4, 0.44, 0.85);
  }

  const backBone = pickBestBone(bones, scoreUpperBackBone);
  if (backBone) {
    backBone.getWorldPosition(_wPos);
    backBone.getWorldQuaternion(_wQuat);
    _backOff.set(0, 0, -0.13 * (sy / 1.45)).applyQuaternion(_wQuat);
    _wPos.add(_backOff);
    heroRoot.worldToLocal(_wPos);
    const handL = pickBestBone(bones, (n) => scoreHandBone(n, true));
    const handR = pickBestBone(bones, (n) => scoreHandBone(n, false));
    let shoulderSpan = 0.42 * (sy / 1.45);
    if (handL && handR) {
      handL.getWorldPosition(_wPos2);
      handR.getWorldPosition(_wPos3);
      shoulderSpan = _wPos2.distanceTo(_wPos3);
    }
    out.cape.x = _wPos.x;
    out.cape.y = _wPos.y;
    out.cape.z = _wPos.z;
    out.cape.scale = THREE.MathUtils.clamp(shoulderSpan * 0.62, 0.42, 0.82);
  }

  const hL = pickBestBone(bones, (n) => scoreHandBone(n, true));
  const hR = pickBestBone(bones, (n) => scoreHandBone(n, false));
  if (hL && hR) {
    hL.getWorldPosition(_wPos);
    hR.getWorldPosition(_wPos2);
    _mid.addVectors(_wPos, _wPos2).multiplyScalar(0.5);
    heroRoot.worldToLocal(_mid);
    out.manoplas.x = _mid.x;
    out.manoplas.y = _mid.y;
    out.manoplas.z = _mid.z;
    out.manoplas.scale = THREE.MathUtils.clamp(_wPos.distanceTo(_wPos2) * 0.84, 0.48, 0.95);
  }

  return out;
}
