import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gladiadorGlbUrl from "../models/Gladiador.glb?url";

/** Alinhado à altura do gladiador procedural (~1,45 m no espaço do jogo). */
const TARGET_HEIGHT = 1.45;

const GLB_URL = gladiadorGlbUrl;

/** Mesma forma que `FORGE_ATTACH.gladiador` em unitModels (evita import circular). */
export type GladiadorForgeAttachConfig = {
  helmet: { y: number; scale: number };
  cape: { x: number; y: number; z: number; rotX: number; scale: number };
  manoplas: { y: number; z: number; scale: number };
};

let templateRoot: THREE.Group | null = null;
/** Anexos da forja alinhados à bbox do GLB (elmo, capa, manoplas). */
let gladiadorForgeAttach: GladiadorForgeAttachConfig | null = null;
let loadAttempted = false;
let loadPromise: Promise<boolean> | null = null;

/**
 * Calcula posições relativas à malha real (pés em y≈0, altura = TARGET_HEIGHT).
 * Rácios calibrados face ao boneco procedural (~1,56 m) e a humanoides típicos.
 */
function computeGladiadorForgeAttachFromBbox(root: THREE.Object3D): GladiadorForgeAttachConfig {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const min = box.min;
  const max = box.max;
  const sy = Math.max(max.y - min.y, 1e-4);
  const sx = Math.max(max.x - min.x, 1e-4);
  const sz = Math.max(max.z - min.z, 1e-4);
  const sxz = Math.max(sx, sz);
  /** Escala das peças da forja vs altura de referência do jogo. */
  const hScale = THREE.MathUtils.clamp(sy / TARGET_HEIGHT, 0.85, 1.2);
  const xzScale = THREE.MathUtils.clamp(sxz / 0.48, 0.85, 1.35);
  const pieceScale = THREE.MathUtils.clamp((hScale + xzScale) * 0.5, 0.88, 1.15);

  return {
    /* Centro da cabeça: um pouco abaixo do topo da bbox (malha com capacete/cabelo). */
    helmet: {
      y: max.y - sy * 0.095,
      scale: THREE.MathUtils.clamp(0.58 * pieceScale, 0.46, 0.78),
    },
    /* Ombros / base do pescoço; z negativo afasta a capa do tronco. */
    cape: {
      x: 0,
      y: min.y + sy * 0.56,
      z: -Math.max(0.2, sxz * 0.34),
      rotX: 0.05,
      scale: THREE.MathUtils.clamp(0.58 * pieceScale, 0.48, 0.75),
    },
    /* Altura dos punhos (~0,73× altura no procedural); z ligeiramente à frente. */
    manoplas: {
      y: min.y + sy * 0.72,
      z: sxz * 0.16,
      scale: THREE.MathUtils.clamp(0.7 * pieceScale, 0.56, 0.88),
    },
  };
}

function prepareTemplate(scene: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  root.name = "gladiador_glb_template";
  root.add(scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(size.y, 1e-4);
  root.scale.setScalar(TARGET_HEIGHT / h);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y = -box2.min.y;
  root.updateMatrixWorld(true);
  gladiadorForgeAttach = computeGladiadorForgeAttachFromBbox(root);
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
