import * as THREE from "three";
import type { ForgeEssenceId, ForgeSlotKind } from "../game/types";
import {
  cloneForgeCapeGlb,
  cloneForgeHelmetGlb,
  cloneForgeManoplasGlb,
} from "./forgePieceGlb";

const BIOME_HEX: Record<ForgeEssenceId, number> = {
  vulcanico: 0xff4422,
  pantano: 0x2a6a3a,
  floresta: 0x228844,
  montanhoso: 0x8899aa,
  rochoso: 0x887766,
  deserto: 0xddaa44,
};

function biomeColor(b: ForgeEssenceId): number {
  return BIOME_HEX[b] ?? 0x888888;
}

function tone(hex: number, k: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return c.getHex();
}

function stdMat(
  color: number,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.12,
    ...opts,
  });
}

/** Rebites, fechos, crista, asas: bronze (1) · prata (2) · ouro (3), com emissivo. */
export function forgeTierAccentMaterial(level: 1 | 2 | 3): THREE.MeshStandardMaterial {
  if (level === 1) {
    return new THREE.MeshStandardMaterial({
      color: 0x8b4a1e,
      metalness: 0.91,
      roughness: 0.19,
      emissive: 0xff6a1a,
      emissiveIntensity: 0.52,
    });
  }
  if (level === 2) {
    return new THREE.MeshStandardMaterial({
      color: 0x9caec8,
      metalness: 0.94,
      roughness: 0.15,
      emissive: 0xc8e4ff,
      emissiveIntensity: 0.46,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: 0xd99a10,
    metalness: 0.92,
    roughness: 0.13,
    emissive: 0xffe24a,
    emissiveIntensity: 0.62,
  });
}

/** Gemas / orbes: mistura bioma + brilho do tier. */
export function forgeTierJewelMaterial(
  biomeHex: number,
  level: 1 | 2 | 3,
): THREE.MeshStandardMaterial {
  const b = new THREE.Color(biomeHex);
  const tierEm =
    level === 1
      ? new THREE.Color(0xff9444).lerp(b, 0.38)
      : level === 2
        ? new THREE.Color(0xdcedff).lerp(b, 0.28)
        : new THREE.Color(0xfff0a0).lerp(b, 0.22);
  const intens = level === 1 ? 0.52 : level === 2 ? 0.58 : 0.78;
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.2,
    roughness: 0.14,
    emissive: tierEm,
    emissiveIntensity: intens,
  });
}

function addRivet(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat);
  m.position.set(x, y, z);
  parent.add(m);
}

/** Elmo detalhado (domo, viseira, guardas, crista por nível). */
export function buildHelmetForgeDetail(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const fromGlb = cloneForgeHelmetGlb(biome, level);
  if (fromGlb) return fromGlb;
  return buildHelmetForgeDetailProcedural(biome, level);
}

function buildHelmetForgeDetailProcedural(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const root = new THREE.Group();
  const col = biomeColor(biome);
  const metal = stdMat(tone(col, 0.92), {
    metalness: 0.55,
    roughness: 0.32,
    emissive: col,
    emissiveIntensity: level * 0.06,
  });
  const dark = stdMat(tone(col, 0.35), { metalness: 0.35, roughness: 0.55 });
  const accent = forgeTierAccentMaterial(level);
  const gem = forgeTierJewelMaterial(col, level);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.52),
    metal,
  );
  dome.scale.set(1, 1.05, 1.08);
  dome.position.y = 0.08;
  root.add(dome);

  const brow = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.035, 10, 40, Math.PI * 0.92),
    metal,
  );
  brow.rotation.x = Math.PI / 2;
  brow.rotation.z = Math.PI * 0.04;
  brow.position.set(0, -0.02, 0.18);
  root.add(brow);

  const visorRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.018, 8, 32, Math.PI * 0.85),
    dark,
  );
  visorRim.rotation.x = Math.PI / 2;
  visorRim.position.set(0, -0.06, 0.26);
  root.add(visorRim);

  const nasal = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.14, 0.05),
    metal,
  );
  nasal.position.set(0, -0.12, 0.28);
  nasal.rotation.x = 0.12;
  root.add(nasal);

  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.16, 0.08),
      metal,
    );
    cheek.position.set(side * 0.2, -0.1, 0.2);
    cheek.rotation.y = side * 0.35;
    root.add(cheek);
    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.09, 12, 1, false, 0, Math.PI),
      dark,
    );
    ear.rotation.z = Math.PI / 2;
    ear.rotation.y = side * 0.9;
    ear.position.set(side * 0.3, 0, 0);
    root.add(ear);
  }

  const nape = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.3, 0.12, 20, 1, true),
    metal,
  );
  nape.rotation.x = Math.PI / 2;
  nape.position.set(0, -0.02, -0.18);
  root.add(nape);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 1.4 - Math.PI * 0.7;
    const r = 0.28;
    addRivet(
      root,
      Math.sin(a) * r,
      0.02 + (i % 3) * 0.02,
      Math.cos(a) * r * 0.35 - 0.02,
      accent,
    );
  }

  const crestBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.09, 0.12, 8),
    accent,
  );
  crestBase.position.set(0, 0.38, -0.06);
  root.add(crestBase);

  const plumeN = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let i = 0; i < plumeN; i++) {
    const pl = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.28 + level * 0.04, 8),
      stdMat(tone(col, 0.55 + i * 0.05), { roughness: 0.75 }),
    );
    const spread = (i - (plumeN - 1) / 2) * 0.09;
    pl.position.set(spread * 0.5, 0.52 + i * 0.02, -0.08 - Math.abs(spread) * 0.2);
    pl.rotation.x = -0.35 - Math.abs(spread) * 0.4;
    pl.rotation.z = spread * 0.6;
    root.add(pl);
  }

  if (level >= 2) {
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, 0.12),
      accent,
    );
    wingL.position.set(-0.36, 0.12, -0.05);
    wingL.rotation.z = 0.5;
    wingL.rotation.y = 0.25;
    root.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x *= -1;
    wingR.rotation.z *= -1;
    wingR.rotation.y *= -1;
    root.add(wingR);
  }

  if (level >= 3) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.012, 8, 32),
      accent,
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.44, -0.12);
    root.add(halo);
    const jewel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), gem);
    jewel.position.set(0, 0.22, 0.32);
    root.add(jewel);
  }

  return root;
}

/** Capa com dobras, colarinho e fecho. */
export function buildCapeForgeDetail(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const fromGlb = cloneForgeCapeGlb(biome, level);
  if (fromGlb) return fromGlb;
  return buildCapeForgeDetailProcedural(biome, level);
}

function buildCapeForgeDetailProcedural(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const root = new THREE.Group();
  const col = biomeColor(biome);
  const cloth = stdMat(tone(col, 0.75), {
    metalness: 0.08,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const inner = stdMat(tone(col, 0.4), {
    metalness: 0.05,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const accent = forgeTierAccentMaterial(level);

  const segs = 14;
  const capeGeo = new THREE.PlaneGeometry(0.95, 1.15, segs, segs);
  const pos = capeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const wave =
      Math.sin(x * 6) * 0.04 + Math.sin(y * 5 + x * 3) * 0.035;
    const fold = Math.pow(Math.abs(x), 1.4) * 0.08;
    pos.setZ(i, wave - fold + (y < 0 ? (x * x) * 0.12 : 0));
  }
  capeGeo.computeVertexNormals();
  const cape = new THREE.Mesh(capeGeo, cloth);
  /**
   * PlaneGeometry fica no plano XY com normal +Z: visto de lado (eixo X) vira linha;
   * de frente (+Z) cobre o peito. Rotação Y = π volta a face para −Z (costas do herói
   * quando o modelo olha para +Z).
   */
  cape.position.set(0, 0.12, -0.02);
  cape.rotation.y = Math.PI;
  cape.rotation.x = 0.1;
  root.add(cape);

  const innerPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 1.08, 8, 8),
    inner,
  );
  innerPlane.position.set(0, 0.11, -0.025);
  innerPlane.rotation.y = Math.PI;
  innerPlane.rotation.x = 0.1;
  root.add(innerPlane);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.045, 10, 28, Math.PI * 1.1),
    cloth,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.62, 0.02);
  root.add(collar);

  const claspRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.022, 8, 20),
    accent,
  );
  claspRing.rotation.y = Math.PI / 2;
  claspRing.position.set(0, 0.58, 0.08);
  root.add(claspRing);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.05, 0),
    forgeTierJewelMaterial(col, level),
  );
  gem.position.set(0, 0.58, 0.095);
  root.add(gem);

  /* Franjas decorativas atrás do pescoço (evita listras à frente do torso). */
  for (let i = 0; i < 6; i++) {
    const ch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6),
      accent,
    );
    ch.position.set(-0.35 + i * 0.14, 0.05, -0.09);
    ch.rotation.z = 0.15 + i * 0.05;
    root.add(ch);
  }

  if (level >= 2) {
    const pauld = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12, 0, Math.PI),
      cloth,
    );
    pauld.scale.set(1.2, 0.55, 0.9);
    pauld.position.set(-0.38, 0.48, -0.06);
    pauld.rotation.z = 0.4;
    root.add(pauld);
    const pauldR = pauld.clone();
    pauldR.position.x *= -1;
    pauldR.rotation.z *= -1;
    root.add(pauldR);
  }

  if (level >= 3) {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.015, 6, 40),
      accent,
    );
    chain.rotation.x = Math.PI / 2;
    chain.position.set(0, -0.35, -0.06);
    chain.scale.set(1, 1, 0.85);
    root.add(chain);
  }

  return root;
}

/** Par de manoplas com placas, dedos e rebites. */
export function buildManoplasForgeDetail(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const fromGlb = cloneForgeManoplasGlb(biome, level);
  if (fromGlb) return fromGlb;
  return buildManoplasForgeDetailProcedural(biome, level);
}

function buildManoplasForgeDetailProcedural(
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  const root = new THREE.Group();
  const col = biomeColor(biome);
  const plate = stdMat(tone(col, 0.9), {
    metalness: 0.58,
    roughness: 0.3,
    emissive: col,
    emissiveIntensity: level * 0.05,
  });
  const leather = stdMat(tone(col, 0.38), {
    metalness: 0.15,
    roughness: 0.72,
  });
  const accent = forgeTierAccentMaterial(level);

  function gauntlet(side: 1 | -1): THREE.Group {
    const g = new THREE.Group();
    const wrist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.11, 0.16, 16, 1),
      leather,
    );
    wrist.rotation.z = Math.PI / 2;
    wrist.position.set(side * 0.08, 0, 0);
    g.add(wrist);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.12),
      plate,
    );
    back.position.set(side * 0.02, 0.02, 0.06);
    g.add(back);

    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.055, 0.07),
      plate,
    );
    knuckle.position.set(side * 0.02, 0.08, 0.1);
    g.add(knuckle);

    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.035 * side;
      for (let seg = 0; seg < 3; seg++) {
        const ph = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.04, 0.032),
          plate,
        );
        ph.position.set(
          fx + side * seg * 0.008,
          0.1 + seg * 0.045,
          0.12 + seg * 0.015,
        );
        g.add(ph);
      }
    }

    const thumb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.05),
      plate,
    );
    thumb.position.set(side * 0.12, 0.04, 0.05);
    thumb.rotation.z = side * 0.5;
    thumb.rotation.x = 0.35;
    g.add(thumb);

    addRivet(g, side * 0.06, 0.12, 0.11, accent);
    addRivet(g, side * -0.04, 0.06, 0.09, accent);
    addRivet(g, side * 0.04, -0.02, 0.02, accent);

    if (level >= 2) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.1, 6),
        accent,
      );
      spike.position.set(side * 0.1, 0.14, 0.02);
      spike.rotation.x = -0.8;
      g.add(spike);
    }

    if (level >= 3) {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 10),
        forgeTierJewelMaterial(col, level),
      );
      orb.position.set(side * 0.02, 0.02, 0.14);
      g.add(orb);
    }

    g.position.set(side * 0.42, 0, 0);
    return g;
  }

  root.add(gauntlet(1));
  root.add(gauntlet(-1));
  return root;
}

export function buildForgePieceDetailGroup(
  kind: ForgeSlotKind,
  biome: ForgeEssenceId,
  level: 1 | 2 | 3,
): THREE.Group {
  if (kind === "helmo") return buildHelmetForgeDetail(biome, level);
  if (kind === "capa") return buildCapeForgeDetail(biome, level);
  return buildManoplasForgeDetail(biome, level);
}
