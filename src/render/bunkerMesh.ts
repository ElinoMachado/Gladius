import * as THREE from "three";

export type BunkerRenderTier = 0 | 1 | 2;

const TIER_STYLES: Record<
  BunkerRenderTier,
  {
    wall: { color: number; metalness: number; roughness: number };
    metal: { color: number; metalness: number; roughness: number };
  }
> = {
  /** Nv. 1 — pedra / metal base (original). */
  0: {
    wall: { color: 0x5a5348, metalness: 0, roughness: 0.88 },
    metal: { color: 0x6a7078, metalness: 0.35, roughness: 0.55 },
  },
  /** Nv. 2 — prateado. */
  1: {
    wall: { color: 0x5c6068, metalness: 0.22, roughness: 0.7 },
    metal: { color: 0xc4ccd4, metalness: 0.72, roughness: 0.38 },
  },
  /** Nv. 3 — dourado. */
  2: {
    wall: { color: 0x5e5038, metalness: 0.25, roughness: 0.72 },
    metal: { color: 0xe2b422, metalness: 0.78, roughness: 0.32 },
  },
};

function applyPartStyle(
  mat: THREE.MeshStandardMaterial,
  s: { color: number; metalness: number; roughness: number },
): void {
  mat.color.setHex(s.color);
  mat.metalness = s.metalness;
  mat.roughness = s.roughness;
}

/** Atualiza cores / metal do modelo do bunker (arena ou preview). */
export function applyBunkerTierMaterials(
  root: THREE.Group,
  tier: BunkerRenderTier,
): void {
  const st = TIER_STYLES[tier] ?? TIER_STYLES[0];
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;
    const part = obj.userData.bunkerPart as string | undefined;
    if (part === "wall") applyPartStyle(mat, st.wall);
    else if (part === "metal") applyPartStyle(mat, st.metal);
  });
  root.userData.bunkerTier = tier;
}

/** Mesh da estrutura do bunker (arena + preview da loja). */
export function createBunkerStructureGroup(tier: BunkerRenderTier = 0): THREE.Group {
  const root = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x5a5348,
    roughness: 0.88,
    flatShading: true,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x6a7078,
    metalness: 0.35,
    roughness: 0.55,
    flatShading: true,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.52, 1.42), wallMat);
  base.userData.bunkerPart = "wall";
  base.position.y = 0.26;
  base.castShadow = false;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 1.12), metalMat);
  top.userData.bunkerPart = "metal";
  top.position.y = 0.62;
  top.castShadow = false;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), metalMat.clone());
  lip.userData.bunkerPart = "metal";
  lip.position.set(0, 0.88, 0.35);
  lip.castShadow = false;
  root.add(base, top, lip);
  applyBunkerTierMaterials(root, tier);
  return root;
}
