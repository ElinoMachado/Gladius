import * as THREE from "three";

function m(
  color: number,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.08,
    ...opts,
  });
}

function humanoidGladinio(root: THREE.Group, displayColor: number): void {
  const h = 1.22;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, h, 12),
    m(displayColor, { emissive: 0x330000, emissiveIntensity: 0.18 }),
  );
  body.position.y = h / 2;
  root.add(body);
  const helm = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    m(0x5a2a20, { metalness: 0.2 }),
  );
  helm.position.y = h + 0.1;
  root.add(helm);
}

/** Malhas 3D por id de arquétipo (compendium + combate). */
export function buildEnemyBody3D(
  archetypeId: string,
  displayColor: number,
): THREE.Group {
  const root = new THREE.Group();

  if (archetypeId === "escravo") {
    const skin = 0x8d6e63;
    const rag = 0x5c4a3e;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.55, 4, 8),
      m(skin, { roughness: 0.75 }),
    );
    body.position.y = 0.55;
    root.add(body);
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.2, 8),
      m(rag),
    );
    shorts.position.y = 0.28;
    root.add(shorts);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), m(skin));
    head.position.y = 1.02;
    root.add(head);
    const chainMat = m(0x3a3a3a, { metalness: 0.55, roughness: 0.35 });
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.32, 0.72, 0);
      for (let i = 0; i < 3; i++) {
        const link = new THREE.Mesh(
          new THREE.TorusGeometry(0.07, 0.018, 6, 10),
          chainMat,
        );
        link.rotation.y = Math.PI / 2;
        link.position.z = i * 0.09;
        arm.add(link);
      }
      root.add(arm);
    }
    return root;
  }

  if (archetypeId === "gladinio") {
    humanoidGladinio(root, displayColor);
    return root;
  }

  if (archetypeId === "leao_selvagem") {
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.42, 0.75),
      m(0xc9a227, { roughness: 0.65 }),
    );
    torso.position.y = 0.55;
    root.add(torso);
    const mane = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      m(0x8b6914, { roughness: 0.8 }),
    );
    mane.position.set(0, 0.78, 0.38);
    mane.rotation.x = -0.4;
    root.add(mane);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.22, 0.35),
      m(0xd4af37),
    );
    head.position.set(0, 0.62, 0.52);
    root.add(head);
    return root;
  }

  if (archetypeId === "cobra_imperial") {
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(0.14 - i * 0.015, 6, 5),
        m(0x2e7d32, { roughness: 0.55 }),
      );
      seg.position.set(0, 0.22 + i * 0.16, i * 0.05);
      root.add(seg);
    }
    const hood = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.25, 6),
      m(0x1b5e20),
    );
    hood.position.set(0, 0.95, 0.12);
    hood.rotation.x = -0.5;
    root.add(hood);
    return root;
  }

  if (archetypeId === "aranha_ruinosa") {
    const ab = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      m(0x3e2723, { roughness: 0.7 }),
    );
    ab.position.y = 0.45;
    root.add(ab);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.02, 0.55, 4),
        m(0x212121),
      );
      leg.position.set(Math.cos(ang) * 0.35, 0.35, Math.sin(ang) * 0.35);
      leg.rotation.z = Math.cos(ang) * 0.5;
      leg.rotation.x = Math.sin(ang) * 0.4;
      root.add(leg);
    }
    return root;
  }

  if (archetypeId === "cultista_cinzas") {
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.95, 10),
      m(0x37474f, { roughness: 0.75 }),
    );
    robe.position.y = 0.52;
    root.add(robe);
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      m(0x263238),
    );
    hood.position.y = 1.05;
    root.add(hood);
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.045, 1.1, 6),
      m(0x5d4037),
    );
    staff.position.set(0.38, 0.6, 0);
    root.add(staff);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      m(0xff5722, { emissive: 0xbf360c, emissiveIntensity: 0.4 }),
    );
    orb.position.set(0.38, 1.2, 0);
    root.add(orb);
    return root;
  }

  if (archetypeId === "fera_voraz") {
    const bod = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.65, 4, 8),
      m(0x5d4037, { roughness: 0.72 }),
    );
    bod.position.y = 0.48;
    bod.rotation.z = 0.15;
    root.add(bod);
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.35, 6),
      m(0x4e342e),
    );
    head.position.set(0.35, 0.55, 0);
    head.rotation.z = -Math.PI / 2;
    root.add(head);
    return root;
  }

  if (archetypeId === "batedor_montado") {
    const mount = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      m(0x6d4c41),
    );
    mount.position.y = 0.38;
    root.add(mount);
    const rider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, 0.55, 8),
      m(displayColor),
    );
    rider.position.y = 0.95;
    root.add(rider);
    const lanca = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.2, 5),
      m(0x8d6e63),
    );
    lanca.position.set(0.5, 1.05, 0.15);
    lanca.rotation.z = -0.4;
    root.add(lanca);
    return root;
  }

  if (archetypeId === "dragao_filhote") {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
      m(displayColor, { roughness: 0.45 }),
    );
    body.position.y = 0.55;
    root.add(body);
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.35, 0.55),
      m(0x8b0000, { metalness: 0.15 }),
    );
    wingL.position.set(-0.38, 0.62, 0);
    wingL.rotation.y = 0.35;
    root.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x *= -1;
    wingR.rotation.y *= -1;
    root.add(wingR);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.45, 5),
      m(displayColor),
    );
    tail.position.set(0, 0.45, -0.42);
    tail.rotation.x = Math.PI / 2;
    root.add(tail);
    return root;
  }

  if (archetypeId === "gargula_petrea") {
    const stone = m(0x78909c, { roughness: 0.88, metalness: 0.05 });
    const bod = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.55, 0.32),
      stone,
    );
    bod.position.y = 0.55;
    root.add(bod);
    for (const sx of [-1, 1] as const) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.28), stone);
      w.position.set(sx * 0.42, 0.75, 0);
      w.rotation.z = sx * 0.35;
      root.add(w);
    }
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), stone);
    horn.position.set(0, 0.95, 0.18);
    root.add(horn);
    return root;
  }

  if (archetypeId === "ogro_esmagador") {
    const h = 1.45;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.48, h, 12),
      m(displayColor, { emissive: 0x220000, emissiveIntensity: 0.15 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const club = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.65, 8),
      m(0x3e2723),
    );
    club.position.set(0.52, 0.75, 0);
    club.rotation.z = 0.9;
    root.add(club);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.32, 0.32),
      m(0x6d4c41),
    );
    head.position.y = h + 0.12;
    root.add(head);
    return root;
  }

  if (archetypeId === "atirador_elite") {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.55, 4, 6),
      m(0x263238),
    );
    leg.position.y = 0.38;
    root.add(leg);
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.55, 0.2),
      m(displayColor),
    );
    torso.position.y = 0.95;
    root.add(torso);
    const rifle = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.07, 0.09),
      m(0x212121, { metalness: 0.45 }),
    );
    rifle.position.set(0.48, 1.02, 0.12);
    root.add(rifle);
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6),
      m(0x1565c0, { metalness: 0.5 }),
    );
    scope.position.set(0.82, 1.05, 0.12);
    scope.rotation.z = Math.PI / 2;
    root.add(scope);
    return root;
  }

  if (archetypeId === "mago_vazio") {
    const robe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.38, 0.95, 10),
      m(0x311b92, { roughness: 0.6 }),
    );
    robe.position.y = 0.55;
    root.add(robe);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      m(0xd7ccc8),
    );
    head.position.y = 1.12;
    root.add(head);
    const voidOrb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 0),
      m(0x7c4dff, { emissive: 0x311b92, emissiveIntensity: 0.55 }),
    );
    voidOrb.position.set(0.42, 0.85, 0);
    root.add(voidOrb);
    return root;
  }

  if (archetypeId === "general_brigada") {
    const h = 1.35;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.38, h, 12),
      m(displayColor, { metalness: 0.25 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.42),
      m(0xb71c1c, { roughness: 0.75 }),
    );
    cape.position.set(0, 0.85, -0.22);
    cape.rotation.x = -0.25;
    root.add(cape);
    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.3),
      m(0xb0bec5, { metalness: 0.5 }),
    );
    helm.position.y = h + 0.08;
    root.add(helm);
    return root;
  }

  if (archetypeId === "elemental_tormenta") {
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 + (i % 2) * 0.06, 6, 5),
        m(0x42a5f5, {
          emissive: 0x01579b,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.88,
        }),
      );
      cloud.position.set(
        Math.cos(i * 1.2) * 0.2,
        0.55 + i * 0.12,
        Math.sin(i * 1.2) * 0.2,
      );
      root.add(cloud);
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      m(0xffeb3b, { emissive: 0xffc107, emissiveIntensity: 0.6 }),
    );
    core.position.y = 0.72;
    root.add(core);
    return root;
  }

  if (archetypeId === "corruptor_abissal") {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.35, 1),
      m(0x1a237e, { emissive: 0x000051, emissiveIntensity: 0.4 }),
    );
    core.position.y = 0.55;
    root.add(core);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.02, 0.45, 4),
        m(0x311b92),
      );
      t.position.set(Math.cos(ang) * 0.35, 0.45, Math.sin(ang) * 0.35);
      t.rotation.z = Math.cos(ang) * 0.8;
      root.add(t);
    }
    return root;
  }

  if (archetypeId === "harpia_ceifadora") {
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.55, 8),
      m(0x8d6e63),
    );
    torso.position.y = 0.72;
    root.add(torso);
    for (const sx of [-1, 1] as const) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.04, 0.35),
        m(0x90a4ae, { metalness: 0.2 }),
      );
      wing.position.set(sx * 0.45, 0.85, 0);
      wing.rotation.z = sx * -0.4;
      root.add(wing);
    }
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      m(0xffcc80),
    );
    head.position.y = 1.12;
    root.add(head);
    return root;
  }

  if (archetypeId === "serpente_alada") {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 5),
        m(0x00695c),
      );
      s.position.set(Math.sin(i * 0.4) * 0.15, 0.25 + i * 0.12, i * 0.06);
      root.add(s);
    }
    const w1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, 0.22),
      m(0x4db6ac),
    );
    w1.position.set(-0.35, 0.65, 0);
    w1.rotation.z = -0.3;
    root.add(w1);
    const w2 = w1.clone();
    w2.position.x *= -1;
    w2.rotation.z *= -1;
    root.add(w2);
    return root;
  }

  if (archetypeId === "dragao_antigo") {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.38, 0.85, 6, 10),
      m(displayColor, { roughness: 0.4, metalness: 0.12 }),
    );
    body.position.y = 0.75;
    root.add(body);
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 0.45, 8),
      m(displayColor),
    );
    neck.position.set(0.35, 1.05, 0.2);
    neck.rotation.z = -0.6;
    root.add(neck);
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.4, 6),
      m(displayColor),
    );
    head.position.set(0.55, 1.25, 0.35);
    head.rotation.z = -0.9;
    root.add(head);
    for (const sx of [-1, 1] as const) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.1, 0.55),
        m(0x4a148c, { emissive: 0x1a0030, emissiveIntensity: 0.2 }),
      );
      wing.position.set(sx * 0.55, 0.95, -0.05);
      wing.rotation.y = sx * 0.25;
      root.add(wing);
    }
    return root;
  }

  if (archetypeId === "boss_sentinela_bronze") {
    const h = 1.55;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, h, 12),
      m(displayColor, { emissive: 0x5d4037, emissiveIntensity: 0.22 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const pauldron = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.2, 0.35),
      m(0x6d4c41, { metalness: 0.45 }),
    );
    pauldron.position.y = 1.25;
    root.add(pauldron);
    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.28, 0.38),
      m(0xffb300, { metalness: 0.55 }),
    );
    helm.position.y = h + 0.08;
    root.add(helm);
    return root;
  }

  if (archetypeId === "boss_carrasco_legiao") {
    const h = 1.68;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.46, h, 14),
      m(displayColor, { emissive: 0x3e0000, emissiveIntensity: 0.28 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const axe = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.65, 0.06),
      m(0xb0bec5, { metalness: 0.6 }),
    );
    axe.position.set(0.48, 1.05, 0);
    root.add(axe);
    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.22, 0.36),
      m(0x212121),
    );
    helm.position.y = h + 0.1;
    root.add(helm);
    return root;
  }

  if (archetypeId === "boss_general_negra") {
    const h = 1.52;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, h, 0.42),
      m(displayColor, { metalness: 0.35 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.05, 0.55),
      m(0x000000, { roughness: 0.9 }),
    );
    cape.position.set(0, 0.9, -0.28);
    cape.rotation.x = -0.2;
    root.add(cape);
    return root;
  }

  if (archetypeId === "boss_tita_cerco") {
    const h = 1.82;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.58, h, 14),
      m(displayColor, { emissive: 0x3e2723, emissiveIntensity: 0.2 }),
    );
    body.position.y = h / 2;
    root.add(body);
    const ram = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.65),
      m(0x5d4037, { metalness: 0.4 }),
    );
    ram.position.set(0.45, 0.75, 0);
    root.add(ram);
    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.32, 0.42),
      m(0x37474f, { metalness: 0.5 }),
    );
    helm.position.y = h + 0.14;
    root.add(helm);
    return root;
  }

  if (archetypeId === "imperador_supremo") {
    const h = 1.75;
    const robe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.48, h, 12),
      m(0x4a148c, { metalness: 0.2, roughness: 0.45 }),
    );
    robe.position.y = h / 2;
    root.add(robe);
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.04, 0.5),
      m(displayColor, { metalness: 0.65, emissive: 0x665500, emissiveIntensity: 0.15 }),
    );
    cape.position.set(0, 1.05, -0.28);
    cape.rotation.x = -0.15;
    root.add(cape);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.12, 8),
      m(displayColor, { metalness: 0.75 }),
    );
    crown.position.y = h + 0.18;
    root.add(crown);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      m(0xffcc80),
    );
    head.position.y = h + 0.08;
    root.add(head);
    return root;
  }

  humanoidGladinio(root, displayColor);
  return root;
}
