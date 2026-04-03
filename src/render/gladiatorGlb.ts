import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gladiadorGlbUrl from "../models/Gladiador.glb?url";

/** Alinhado à altura do gladiador procedural (~1,45 m no espaço do jogo). */
const TARGET_HEIGHT = 1.45;

const GLB_URL = gladiadorGlbUrl;

/**
 * Mesma forma que `FORGE_ATTACH.gladiador` em unitModels, com x/z opcionais
 * quando os anexos vêm de ossos do rig (cabeça / mãos descentradas).
 */
export type GladiadorForgeAttachConfig = {
  helmet: { y: number; scale: number; x?: number; z?: number };
  cape: { x: number; y: number; z: number; rotX: number; scale: number };
  manoplas: { y: number; z: number; scale: number; x?: number };
};

let templateRoot: THREE.Group | null = null;
/** Anexos da forja alinhados à bbox do GLB (elmo, capa, manoplas). */
let gladiadorForgeAttach: GladiadorForgeAttachConfig | null = null;
let loadAttempted = false;
let loadPromise: Promise<boolean> | null = null;

const _meshUnionScratch = new THREE.Box3();

/**
 * União das bbox em espaço mundo só de `Mesh`/`SkinnedMesh` com geometria.
 * Evita armatures, nós vazios ou helpers que inflam `setFromObject` e encolhem o modelo.
 */
function unionMeshWorldBox3(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let has = false;
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
    const nm = obj.name.toLowerCase();
    if (
      nm.includes("collider") ||
      nm.includes("hitbox") ||
      nm.includes("bounding") ||
      nm.includes("_ucx") ||
      nm.includes("ucx_")
    ) {
      return;
    }
    const geom = obj.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const lb = geom.boundingBox;
    if (!lb) return;
    _meshUnionScratch.copy(lb).applyMatrix4(obj.matrixWorld);
    if (!has) {
      box.copy(_meshUnionScratch);
      has = true;
    } else {
      box.union(_meshUnionScratch);
    }
  });
  if (!has) {
    box.setFromObject(root);
  }
  return box;
}

/**
 * Anexos da forja a partir da bbox das malhas visíveis (já escaladas e com pés em y≈0).
 */
function computeGladiadorForgeAttachFromMeshBox(root: THREE.Object3D): GladiadorForgeAttachConfig {
  const box = unionMeshWorldBox3(root);
  const min = box.min;
  const max = box.max;
  const sy = Math.max(max.y - min.y, 1e-4);
  const sx = Math.max(max.x - min.x, 1e-4);
  const sz = Math.max(max.z - min.z, 1e-4);
  const sxz = Math.max(sx, sz);
  const hScale = THREE.MathUtils.clamp(sy / TARGET_HEIGHT, 0.85, 1.2);
  const xzScale = THREE.MathUtils.clamp(sxz / 0.48, 0.85, 1.35);
  const pieceScale = THREE.MathUtils.clamp((hScale + xzScale) * 0.5, 0.88, 1.15);

  return {
    helmet: {
      y: max.y - sy * 0.095,
      scale: THREE.MathUtils.clamp(0.58 * pieceScale, 0.46, 0.78),
    },
    cape: {
      x: 0,
      y: min.y + sy * 0.56,
      z: -Math.max(0.18, sxz * 0.28),
      rotX: 0.05,
      scale: THREE.MathUtils.clamp(0.58 * pieceScale, 0.48, 0.75),
    },
    manoplas: {
      y: min.y + sy * 0.72,
      z: sxz * 0.14,
      scale: THREE.MathUtils.clamp(0.7 * pieceScale, 0.56, 0.88),
    },
  };
}

function prepareTemplate(scene: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  root.name = "gladiador_glb_template";
  root.add(scene);
  const box = unionMeshWorldBox3(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(size.y, 1e-4);
  root.scale.setScalar(TARGET_HEIGHT / h);
  root.updateMatrixWorld(true);
  const box2 = unionMeshWorldBox3(root);
  root.position.y = -box2.min.y;
  root.updateMatrixWorld(true);
  gladiadorForgeAttach = computeGladiadorForgeAttachFromMeshBox(root);
  return root;
}

function materialHasColor(m: THREE.Material): m is THREE.Material & { color: THREE.Color } {
  return "color" in m && (m as THREE.MeshStandardMaterial).color instanceof THREE.Color;
}

function tintClonedMaterials(root: THREE.Object3D, displayColor: number): void {
  const team = new THREE.Color(displayColor);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mapMat = (m: THREE.Material): THREE.Material => {
      const cm = m.clone();
      if (materialHasColor(m) && materialHasColor(cm)) {
        cm.color.copy(m.color.clone().lerp(team, 0.32));
      }
      return cm;
    };
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(mapMat);
    } else {
      obj.material = mapMat(obj.material);
    }
  });
}

/** Geometrias e materiais próprios por instância (dispose do combate não toca no template). */
function deepCloneForInstance(template: THREE.Group): THREE.Group {
  const g = template.clone(true);
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry = obj.geometry.clone();
    }
  });
  return g;
}

/**
 * Clona o modelo GLB escalado para o chão em y=0. Retorna null se o load falhou ou ainda não terminou.
 */
export function cloneGladiadorBodyFromGlb(displayColor: number): THREE.Group | null {
  if (!templateRoot) return null;
  const body = deepCloneForInstance(templateRoot);
  tintClonedMaterials(body, displayColor);
  return body;
}

export function isGladiadorGlbReady(): boolean {
  return templateRoot != null;
}

/** Anexos para `addForgeMeshes` quando o corpo é o GLB; null se o modelo não carregou. */
export function getGladiadorForgeAttach(): GladiadorForgeAttachConfig | null {
  return gladiadorForgeAttach;
}

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

/** Costas / ombros: coluna alta ou peito (capa). */
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
 * Usa ossos do skeleton (Mixamo, Rigify, etc.) para cabeça, costas e mãos.
 * Combina com a base da bbox (`getGladiadorForgeAttach`) para escalas/peças em falta.
 * Chamar com `heroRoot` que já contém `glbBody` como filho e `updateMatrixWorld` feito.
 */
export function resolveGladiadorForgeAttachFromRig(
  heroRoot: THREE.Object3D,
  glbBody: THREE.Object3D,
): GladiadorForgeAttachConfig | null {
  const sm = firstSkinnedMesh(glbBody);
  if (!sm?.skeleton?.bones?.length) return null;

  const bones = sm.skeleton.bones;
  const headBone = pickBestBone(bones, scoreHeadBone);
  if (!headBone) return null;

  const base =
    gladiadorForgeAttach ?? computeGladiadorForgeAttachFromMeshBox(glbBody);
  const out: GladiadorForgeAttachConfig = {
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
    _backOff.set(0, 0, -0.11).applyQuaternion(_wQuat);
    _wPos.add(_backOff);
    heroRoot.worldToLocal(_wPos);
    const handL = pickBestBone(bones, (n) => scoreHandBone(n, true));
    const handR = pickBestBone(bones, (n) => scoreHandBone(n, false));
    let shoulderSpan = 0.42;
    if (handL && handR) {
      handL.getWorldPosition(_wPos2);
      handR.getWorldPosition(_wPos3);
      shoulderSpan = _wPos2.distanceTo(_wPos3);
    }
    out.cape.x = _wPos.x;
    out.cape.y = _wPos.y;
    out.cape.z = _wPos.z;
    out.cape.scale = THREE.MathUtils.clamp(shoulderSpan * 0.62, 0.46, 0.78);
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
    out.manoplas.scale = THREE.MathUtils.clamp(_wPos.distanceTo(_wPos2) * 0.84, 0.52, 0.92);
  }

  return out;
}

/**
 * Pré-carrega o GLB uma vez. Resolve a `true` se o ficheiro existir e for válido.
 */
export function preloadGladiadorGlb(): Promise<boolean> {
  if (templateRoot) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  if (loadAttempted && !templateRoot) return Promise.resolve(false);
  loadAttempted = true;
  loadPromise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        templateRoot = prepareTemplate(gltf.scene);
        resolve(true);
      },
      undefined,
      () => {
        templateRoot = null;
        gladiadorForgeAttach = null;
        resolve(false);
      },
    );
  });
  return loadPromise;
}
