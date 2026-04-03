import * as THREE from "three";

export type HeroForgeAttachConfig = {
  helmet: { y: number; scale: number; x?: number; z?: number };
  cape: { x: number; y: number; z: number; rotX: number; scale: number };
  manoplas: { y: number; z: number; scale: number; x?: number };
};

const _meshUnionScratch = new THREE.Box3();

export function unionMeshWorldBox3(root: THREE.Object3D): THREE.Box3 {
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

export function computeHeroForgeAttachFromMeshBox(
  root: THREE.Object3D,
  targetHeight: number,
): HeroForgeAttachConfig {
  const box = unionMeshWorldBox3(root);
  const min = box.min;
  const max = box.max;
  const sy = Math.max(max.y - min.y, 1e-4);
  const sx = Math.max(max.x - min.x, 1e-4);
  const sz = Math.max(max.z - min.z, 1e-4);
  const sxz = Math.max(sx, sz);
  const hScale = THREE.MathUtils.clamp(sy / targetHeight, 0.85, 1.2);
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

export function prepareHeroGlbRoot(
  scene: THREE.Object3D,
  targetHeight: number,
  templateName: string,
): { root: THREE.Group; forgeAttach: HeroForgeAttachConfig } {
  const root = new THREE.Group();
  root.name = templateName;
  root.add(scene);
  const box = unionMeshWorldBox3(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(size.y, 1e-4);
  root.scale.setScalar(targetHeight / h);
  root.updateMatrixWorld(true);
  const box2 = unionMeshWorldBox3(root);
  root.position.y = -box2.min.y;
  root.updateMatrixWorld(true);
  const forgeAttach = computeHeroForgeAttachFromMeshBox(root, targetHeight);
  return { root, forgeAttach };
}

function materialHasColor(m: THREE.Material): m is THREE.Material & { color: THREE.Color } {
  return "color" in m && (m as THREE.MeshStandardMaterial).color instanceof THREE.Color;
}

export function tintHeroMeshes(root: THREE.Object3D, displayColor: number): void {
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
