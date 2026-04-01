import * as THREE from "three";
import { buildEnemyBody3D } from "./enemyModels3d";
import { forgeVisualKey, resolveEquippedForgeLoadout } from "../game/forge";
import type { ForgeEssenceId, ForgeHeroLoadout, HeroClassId } from "../game/types";
import type { Unit } from "../game/types";
import {
  buildCapeForgeDetail,
  buildHelmetForgeDetail,
  buildManoplasForgeDetail,
} from "./forgePieceMesh";

export function modelKeyForUnit(
  u: Pick<Unit, "isPlayer" | "heroClass" | "hp"> & {
    enemyArchetypeId?: string;
    forgeLoadout?: ForgeHeroLoadout;
  },
): string {
  if (u.isPlayer) {
    if ((u.hp ?? 1) <= 0) return "h:tomb";
    const fk = forgeVisualKey(u.forgeLoadout);
    return `h:${u.heroClass ?? "?"}:${fk}`;
  }
  return `e:${u.enemyArchetypeId ?? "gladinio"}`;
}

/** Lápide no hex do herói morto (mantém ocupação / raycast leve). */
export function buildHeroTombstone(displayColor: number): THREE.Group {
  const root = new THREE.Group();
  const stone = 0x5a5a62;
  const moss = 0x3d4a38;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.22, 0.36),
    stdMat(stone, { roughness: 0.92 }),
  );
  slab.position.y = 0.2;
  slab.rotation.y = 0.12;
  root.add(slab);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.12, 0.46),
    stdMat(moss, { roughness: 0.95 }),
  );
  base.position.y = 0.08;
  root.add(base);
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.42, 0.07),
    stdMat(displayColor, { roughness: 0.55, metalness: 0.12 }),
  );
  crossV.position.set(-0.06, 0.52, 0.02);
  root.add(crossV);
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.06),
    stdMat(displayColor, { roughness: 0.55, metalness: 0.12 }),
  );
  crossH.position.set(-0.06, 0.62, 0.02);
  root.add(crossH);
  return root;
}

function stdMat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.08,
    ...opts,
  });
}

/**
 * Elmo centrado na cabeça, capa para trás (-Z), manoplas à esquerda/direita (já no mesh da peça).
 * Valores alinhados ao torso/cabeça de cada classe em `buildHeroBody`.
 */
const FORGE_ATTACH: Record<
  HeroClassId,
  {
    helmet: { y: number; scale: number };
    cape: { x: number; y: number; z: number; rotX: number; scale: number };
    manoplas: { y: number; z: number; scale: number };
  }
> = {
  pistoleiro: {
    helmet: { y: 1.28, scale: 0.5 },
    /* Topo da capa ~ombros (caixa torso ~1,18); z atrás da caixa. */
    cape: { x: 0, y: 0.87, z: -0.125, rotX: 0.06, scale: 0.5 },
    manoplas: { y: 1.02, z: 0.09, scale: 0.48 },
  },
  gladiador: {
    helmet: { y: 1.38, scale: 0.58 },
    /* Topo da capa ~ombros; z mais negativo evita clipping com o torso largo. */
    cape: { x: 0, y: 0.88, z: -0.24, rotX: 0.05, scale: 0.58 },
    manoplas: { y: 1.14, z: 0.16, scale: 0.7 },
  },
  sacerdotisa: {
    helmet: { y: 1.24, scale: 0.47 },
    /* Topo da capa ~ombros; z atrás do cilindro (~raio 0,22–0,28) para não cruzar a malha. */
    cape: { x: 0, y: 0.78, z: -0.27, rotX: 0.04, scale: 0.48 },
    manoplas: { y: 1.05, z: 0.14, scale: 0.58 },
  },
};

function addForgeMeshes(
  root: THREE.Group,
  heroClass: HeroClassId,
  loadout: ForgeHeroLoadout | undefined,
  _mat: (c: number, o?: Partial<THREE.MeshStandardMaterialParameters>) => THREE.MeshStandardMaterial,
): void {
  if (!loadout) return;
  const R = resolveEquippedForgeLoadout(loadout);
  const b = (id: string) => id as ForgeEssenceId;
  const A = FORGE_ATTACH[heroClass];
  if (R.helmo) {
    const h = buildHelmetForgeDetail(b(R.helmo.biome), R.helmo.level);
    h.scale.setScalar(A.helmet.scale);
    h.position.set(0, A.helmet.y, 0);
    h.userData.role = "forge";
    root.add(h);
  }
  if (R.capa) {
    const c = buildCapeForgeDetail(b(R.capa.biome), R.capa.level);
    c.scale.setScalar(A.cape.scale);
    c.position.set(A.cape.x, A.cape.y, A.cape.z);
    c.rotation.x = A.cape.rotX;
    c.userData.role = "forge";
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) o.renderOrder = 1;
    });
    root.add(c);
  }
  if (R.manoplas) {
    const m = buildManoplasForgeDetail(
      b(R.manoplas.biome),
      R.manoplas.level,
    );
    m.scale.setScalar(A.manoplas.scale);
    m.position.set(0, A.manoplas.y, A.manoplas.z);
    m.userData.role = "forge";
    m.traverse((o) => {
      if (o instanceof THREE.Mesh) o.renderOrder = 2;
    });
    root.add(m);
  }
}

/** Corpo do herói (sem barras de vida — só malha). */
export function buildHeroBody(
  heroClass: HeroClassId,
  displayColor: number,
  forgeLoadout?: ForgeHeroLoadout,
): THREE.Group {
  const root = new THREE.Group();
  const accent = displayColor;
  const skin = 0xc9a882;
  const leather = 0x3d2818;

  if (heroClass === "pistoleiro") {
    const forgeResolved = resolveEquippedForgeLoadout(forgeLoadout ?? {});
    const hideHeadAdorn = !!forgeResolved.helmo;

    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.35, 4, 8),
      stdMat(0x2a2a32),
    );
    leg.position.set(0, 0.35, 0);
    root.add(leg);
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.52, 0.22),
      stdMat(accent, { roughness: 0.42 }),
    );
    torso.position.y = 0.92;
    root.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), stdMat(skin));
    head.position.y = 1.28;
    root.add(head);
    if (!hideHeadAdorn) {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.18, 0.04, 10),
        stdMat(0x1a1510),
      );
      brim.position.y = 1.36;
      root.add(brim);
    }
    const gun = new THREE.Group();
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.06, 0.06),
      stdMat(0x2c2c2c, { metalness: 0.5 }),
    );
    barrel.position.set(0.28, 1.02, 0.12);
    gun.add(barrel);
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.05),
      stdMat(0x4a3020),
    );
    grip.position.set(0.08, 0.94, 0.12);
    gun.add(grip);
    root.add(gun);
    addForgeMeshes(root, heroClass, forgeLoadout, stdMat);
    return root;
  }

  if (heroClass === "gladiador") {
    const forgeResolved = resolveEquippedForgeLoadout(forgeLoadout ?? {});
    const hideHeadAdorn = !!forgeResolved.helmo;

    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.32, 4, 8),
      stdMat(0x4a3728),
    );
    leg.position.set(0, 0.38, 0);
    root.add(leg);
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.58, 0.3),
      stdMat(accent, { roughness: 0.38 }),
    );
    torso.position.y = 0.98;
    root.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), stdMat(skin));
    head.position.y = 1.38;
    root.add(head);
    if (!hideHeadAdorn) {
      const helm = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.12, 0.34),
        stdMat(0x6a5a4a, { metalness: 0.35 }),
      );
      helm.position.y = 1.45;
      root.add(helm);
    }
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8),
      stdMat(0x8b7355, { metalness: 0.25 }),
    );
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.38, 1.05, 0.1);
    root.add(shield);
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.55, 0.04),
      stdMat(0xc0c0c8, { metalness: 0.6 }),
    );
    sword.position.set(0.4, 1.12, 0.08);
    root.add(sword);
    addForgeMeshes(root, heroClass, forgeLoadout, stdMat);
    return root;
  }

  /* sacerdotisa */
  const forgeResolved = resolveEquippedForgeLoadout(forgeLoadout ?? {});
  const hideHeadAdorn = !!forgeResolved.helmo;

  const skirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.55, 12),
    stdMat(accent, { roughness: 0.55 }),
  );
  skirt.position.y = 0.42;
  root.add(skirt);
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.4, 10),
    stdMat(accent),
  );
  torso.position.y = 0.88;
  root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), stdMat(skin));
  head.position.y = 1.22;
  root.add(head);
  if (!hideHeadAdorn) {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      stdMat(0xf0e6d8, { roughness: 0.65 }),
    );
    hood.position.y = 1.28;
    root.add(hood);
  }
  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 1.15, 6),
    stdMat(leather),
  );
  staff.position.set(0.32, 0.75, 0.1);
  root.add(staff);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    stdMat(0x88ccff, { emissive: 0x2244aa, emissiveIntensity: 0.35 }),
  );
  orb.position.set(0.32, 1.38, 0.1);
  root.add(orb);
  addForgeMeshes(root, heroClass, forgeLoadout, stdMat);
  return root;
}

export function buildEnemyBody(archetypeId: string, displayColor: number): THREE.Group {
  return buildEnemyBody3D(archetypeId, displayColor);
}

export function buildUnitBodyGroup(
  u: Pick<
    Unit,
    "isPlayer" | "heroClass" | "enemyArchetypeId" | "displayColor" | "forgeLoadout" | "hp"
  >,
): THREE.Group {
  if (u.isPlayer && (u.hp ?? 1) <= 0) {
    return buildHeroTombstone(u.displayColor);
  }
  if (u.isPlayer && u.heroClass) {
    return buildHeroBody(u.heroClass, u.displayColor, u.forgeLoadout);
  }
  return buildEnemyBody(u.enemyArchetypeId ?? "gladinio", u.displayColor);
}
