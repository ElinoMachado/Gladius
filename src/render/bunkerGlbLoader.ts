import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { BunkerRenderTier } from "./bunkerMesh";
import { bundledGltfUrlFromViteImport } from "./bundledAssetUrl";

import bunkerNv1Url from "../models/bunkerNv1.glb?url";
import bunkerNv2Url from "../models/bunkerNv2.glb?url";
import bunkerNv3Url from "../models/bunkerNv3.glb?url";

/** Largura aproximada da base do bunker procedural (hex). */
const TARGET_FOOTPRINT_XZ = 1.65;

const URLS: Record<BunkerRenderTier, string> = {
  0: bunkerNv1Url,
  1: bunkerNv2Url,
  2: bunkerNv3Url,
};

const templates: Partial<Record<BunkerRenderTier, THREE.Group>> = {};
let preloadPromise: Promise<boolean> | null = null;

const _boxScratch = new THREE.Box3();

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
    _boxScratch.copy(lb).applyMatrix4(obj.matrixWorld);
    if (!has) {
      box.copy(_boxScratch);
      has = true;
    } else {
      box.union(_boxScratch);
    }
  });
  if (!has) box.setFromObject(root);
  return box;
}

function prepareBunkerScene(scene: THREE.Object3D, tier: BunkerRenderTier): THREE.Group {
  const wrap = new THREE.Group();
  wrap.name = `bunker_glb_nv${tier + 1}_template`;
  wrap.add(scene);
  const box = unionMeshWorldBox3(wrap);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxXZ = Math.max(size.x, size.z);
  if (maxXZ > 1e-4) {
    wrap.scale.setScalar(TARGET_FOOTPRINT_XZ / maxXZ);
  }
  wrap.updateMatrixWorld(true);
  const box2 = unionMeshWorldBox3(wrap);
  const cx = (box2.min.x + box2.max.x) / 2;
  const cz = (box2.min.z + box2.max.z) / 2;
  wrap.position.set(-cx, -box2.min.y, -cz);
  wrap.updateMatrixWorld(true);
  return wrap;
}

function loadOne(tier: BunkerRenderTier, url: string): Promise<boolean> {
  if (templates[tier]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      bundledGltfUrlFromViteImport(url),
      (gltf) => {
        templates[tier] = prepareBunkerScene(gltf.scene, tier);
        resolve(true);
      },
      undefined,
      (err) => {
        console.warn(
          `[Bunker GLB] Falha nv.${tier + 1}:`,
          bundledGltfUrlFromViteImport(url),
          err,
        );
        resolve(false);
      },
    );
  });
}

/** Pré-carrega os três níveis; falhas parciais usam fallback procedural só nesse nível. */
export function preloadBunkerGlbs(): Promise<boolean> {
  if ([0, 1, 2].every((t) => templates[t as BunkerRenderTier] != null)) {
    return Promise.resolve(true);
  }
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all([
    loadOne(0, URLS[0]),
    loadOne(1, URLS[1]),
    loadOne(2, URLS[2]),
  ]).then((ok) => ok.some(Boolean));
  return preloadPromise;
}

export function isBunkerGlbTierLoaded(tier: BunkerRenderTier): boolean {
  return templates[tier] != null;
}

/** Clone para arena/preview; geometrias próprias (materiais partilhados com o template). */
export function cloneBunkerGlbForTier(tier: BunkerRenderTier): THREE.Group | null {
  const t = templates[tier];
  if (!t) return null;
  const g = t.clone(true);
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry = obj.geometry.clone();
    }
  });
  return g;
}
