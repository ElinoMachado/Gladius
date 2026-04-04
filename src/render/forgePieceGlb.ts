import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ForgeEssenceId } from "../game/types";
import { bundledGltfUrlFromViteImport } from "./bundledAssetUrl";
import capaUrl from "../models/capa.glb?url";
import elmoUrl from "../models/Elmo.glb?url";
import manoplasUrl from "../models/manoplas.glb?url";

const BIOME_HEX: Record<ForgeEssenceId, number> = {
  vulcanico: 0xff4422,
  pantano: 0x2a6a3a,
  floresta: 0x228844,
  montanhoso: 0x8899aa,
  rochoso: 0x887766,
  deserto: 0xddaa44,
};

/** Altura alvo (unidades do jogo) antes do `scale` do `addForgeMeshes`. */
const TARGET_HELMET_H = 0.52;
const TARGET_CAPE_H = 1.12;
/** Maior dimensão (largura do par de manoplas, etc.). */
const TARGET_MANOPLAS_MAX = 0.88;

let tplHelmet: THREE.Group | null = null;
let tplCape: THREE.Group | null = null;
let tplManoplas: THREE.Group | null = null;
let loadPromise: Promise<void> | null = null;

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

/** Escala pela altura da bbox; assenta em y=0; centra em XZ. */
function preparePieceByHeight(scene: THREE.Object3D, targetH: number): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  const box = unionMeshWorldBox3(root);
  const sy = Math.max(box.max.y - box.min.y, 1e-4);
  root.scale.setScalar(targetH / sy);
  root.updateMatrixWorld(true);
  const b2 = unionMeshWorldBox3(root);
  const cx = (b2.min.x + b2.max.x) / 2;
  const cz = (b2.min.z + b2.max.z) / 2;
  root.position.set(-cx, -b2.min.y, -cz);
  root.updateMatrixWorld(true);
  return root;
}

/** Escala por max(size.x,y,z); assenta e centra XZ. */
function preparePieceByMaxExtent(scene: THREE.Object3D, targetMax: number): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  const box = unionMeshWorldBox3(root);
  const sx = box.max.x - box.min.x;
  const sy = box.max.y - box.min.y;
  const sz = box.max.z - box.min.z;
  const m = Math.max(sx, sy, sz, 1e-4);
  root.scale.setScalar(targetMax / m);
  root.updateMatrixWorld(true);
  const b2 = unionMeshWorldBox3(root);
  const cx = (b2.min.x + b2.max.x) / 2;
  const cz = (b2.min.z + b2.max.z) / 2;
  root.position.set(-cx, -b2.min.y, -cz);
  root.updateMatrixWorld(true);
  return root;
}

function materialHasColor(m: THREE.Material): m is THREE.Material & { color: THREE.Color } {
  return "color" in m && (m as THREE.MeshStandardMaterial).color instanceof THREE.Color;
}

function applyForgePieceTint(
  root: THREE.Object3D,
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): void {
  const biomeCol = new THREE.Color(BIOME_HEX[biome] ?? 0x888888);
  const lerpK = 0.18 + level * 0.05;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mapMat = (m: THREE.Material): THREE.Material => {
      const cm = m.clone();
      if (materialHasColor(m) && materialHasColor(cm)) {
        cm.color.copy(m.color.clone().lerp(biomeCol, lerpK));
      }
      if (cm instanceof THREE.MeshStandardMaterial) {
        cm.emissive = cm.emissive.clone().lerp(biomeCol, 0.12 + level * 0.04);
        cm.emissiveIntensity = (cm.emissiveIntensity ?? 0) + level * 0.05;
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

function deepCloneForgeTemplate(template: THREE.Group): THREE.Group {
  const g = template.clone(true);
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry = obj.geometry.clone();
    }
  });
  return g;
}

function cloneTinted(
  template: THREE.Group | null,
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group | null {
  if (!template) return null;
  const g = deepCloneForgeTemplate(template);
  applyForgePieceTint(g, biome, level);
  return g;
}

export function cloneForgeHelmetGlb(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group | null {
  return cloneTinted(tplHelmet, biome, level);
}

export function cloneForgeCapeGlb(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group | null {
  return cloneTinted(tplCape, biome, level);
}

export function cloneForgeManoplasGlb(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group | null {
  return cloneTinted(tplManoplas, biome, level);
}

export function preloadForgePieceGlbs(): Promise<void> {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader();
  loadPromise = (async () => {
    const load = async (url: string, prep: (scene: THREE.Object3D) => THREE.Group) => {
      const gltf = await loader.loadAsync(bundledGltfUrlFromViteImport(url));
      return prep(gltf.scene);
    };
    try {
      tplHelmet = await load(elmoUrl, (s) => preparePieceByHeight(s, TARGET_HELMET_H));
    } catch {
      tplHelmet = null;
    }
    try {
      tplCape = await load(capaUrl, (s) => preparePieceByHeight(s, TARGET_CAPE_H));
    } catch {
      tplCape = null;
    }
    try {
      tplManoplas = await load(manoplasUrl, (s) => preparePieceByMaxExtent(s, TARGET_MANOPLAS_MAX));
    } catch {
      tplManoplas = null;
    }
  })();
  return loadPromise;
}
