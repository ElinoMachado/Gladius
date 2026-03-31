import * as THREE from "three";

/** Mesh da estrutura do bunker (arena + preview da loja). */
export function createBunkerStructureGroup(): THREE.Group {
  const root = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({
    color: 0x5a5348,
    roughness: 0.88,
    flatShading: true,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x6a7078,
    metalness: 0.35,
    roughness: 0.55,
    flatShading: true,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.52, 1.42), wall);
  base.position.y = 0.26;
  base.castShadow = false;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 1.12), metal);
  top.position.y = 0.62;
  top.castShadow = false;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), metal);
  lip.position.set(0, 0.88, 0.35);
  root.add(base, top, lip);
  return root;
}
