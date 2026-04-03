import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gladiadorGlbUrl from "../models/Gladiador.glb?url";

/** Alinhado à altura do gladiador procedural (~1,45 m no espaço do jogo). */
const TARGET_HEIGHT = 1.45;

const GLB_URL = gladiadorGlbUrl;

let templateRoot: THREE.Group | null = null;
let loadAttempted = false;
let loadPromise: Promise<boolean> | null = null;

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
        resolve(false);
      },
    );
  });
  return loadPromise;
}
