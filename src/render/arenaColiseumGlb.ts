import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { axialToWorld, hexDistance } from "../game/hex";
import arenaUrl from "../models/Arena.glb?url";

/** Manter alinhado com `GameRenderer` (hex + raio da arena). */
const HEX_SIZE = 2.18;
const ARENA_HEX_RADIUS = 25;
/** Folga visual para o anel de hexes caber confortavelmente dentro do coliseu. */
const ARENA_FIT_MARGIN = 1.1;
/**
 * O chão do GLB costuma ser uma malha espessa; o bbox mínimo alinha a base em Y=0 e a areia visível
 * fica por cima dos hexes. Afundamos o modelo para a superfície da arena ficar abaixo do plano de jogo.
 */
const COLISEUM_FLOOR_SINK_Y = 0.42;

/**
 * Raio horizontal no chão até ao vértice mais exterior do grid jogável
 * (todos os hexes com distância axial ≤ ARENA_HEX_RADIUS do centro).
 */
function outerArenaRadiusWorld(): number {
  let maxC = 0;
  for (let q = -ARENA_HEX_RADIUS; q <= ARENA_HEX_RADIUS; q++) {
    for (let r = -ARENA_HEX_RADIUS; r <= ARENA_HEX_RADIUS; r++) {
      if (hexDistance({ q, r }, { q: 0, r: 0 }) > ARENA_HEX_RADIUS) continue;
      const { x, z } = axialToWorld(q, r, HEX_SIZE);
      maxC = Math.max(maxC, Math.hypot(x, z));
    }
  }
  /* Até ao vértice do hex (o mesh usa ~HEX_SIZE como raio do polígono). */
  return maxC + HEX_SIZE * 0.998;
}

let templateRoot: THREE.Group | null = null;
let loadPromise: Promise<boolean> | null = null;
let loadAttempted = false;

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

function prepareTemplate(scene: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  root.name = "arena_coliseum_template";
  root.add(scene);
  const box = unionMeshWorldBox3(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  /* Escala pela menor semi-dimensão XZ para o anel de hexes caber em planta (modelos alongados). */
  const halfMinXZ = Math.min(size.x, size.z) / 2;
  const targetR = outerArenaRadiusWorld() * ARENA_FIT_MARGIN;
  if (halfMinXZ > 1e-4) {
    root.scale.setScalar(targetR / halfMinXZ);
  }
  root.updateMatrixWorld(true);
  const box2 = unionMeshWorldBox3(root);
  const cx = (box2.min.x + box2.max.x) / 2;
  const cz = (box2.min.z + box2.max.z) / 2;
  root.position.set(-cx, -box2.min.y - COLISEUM_FLOOR_SINK_Y, -cz);
  root.updateMatrixWorld(true);
  return root;
}

export function isArenaColiseumLoaded(): boolean {
  return templateRoot != null;
}

/** Um clone para a cena (geometrias próprias; materiais partilhados com o template). */
export function cloneArenaColiseum(): THREE.Group | null {
  if (!templateRoot) return null;
  const g = templateRoot.clone(true);
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry = obj.geometry.clone();
    }
  });
  return g;
}

export function preloadArenaColiseumGlb(): Promise<boolean> {
  if (templateRoot) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  if (loadAttempted && !templateRoot) return Promise.resolve(false);
  loadAttempted = true;
  loadPromise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      arenaUrl,
      (gltf) => {
        templateRoot = prepareTemplate(gltf.scene);
        resolve(true);
      },
      undefined,
      () => {
        templateRoot = null;
        resolve(false);
      },
    );
  });
  return loadPromise;
}
