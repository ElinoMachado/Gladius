import * as THREE from "three";

function configureRepeat(tex: THREE.Texture, u: number, v: number): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(u, v);
}

/** Areia cartoon: grãos suaves, manchas claras/escuras, sem foto realista. */
export function createCartoonSandTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e6c9a0";
  ctx.fillRect(0, 0, size, size);

  const grains = [
    "#f2dcc0",
    "#dcc198",
    "#c9a87a",
    "#b89568",
    "#edd9be",
    "#d4b88a",
  ];
  for (let i = 0; i < 4200; i++) {
    const g = grains[Math.floor(Math.random() * grains.length)]!;
    ctx.fillStyle = g;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.4 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 18; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40 + Math.random() * 80);
    grd.addColorStop(0, `rgba(255, 235, 200, ${0.12 + Math.random() * 0.1})`);
    grd.addColorStop(1, "rgba(230, 201, 160, 0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  configureRepeat(tex, 5, 5);
  return tex;
}

/** Rocha cartoon: placas, rachas escuras, poucos tons (estilo ilustrado). */
export function createCartoonRockTexture(size = 384): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6a5c52";
  ctx.fillRect(0, 0, size, size);

  const plates = 14;
  for (let p = 0; p < plates; p++) {
    ctx.fillStyle = ["#5d5048", "#75665a", "#4a4038", "#7d7068", "#63564c"][
      p % 5
    ]!;
    ctx.beginPath();
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.random() * 0.4;
      const rr = 30 + Math.random() * 90;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * (0.6 + Math.random() * 0.5);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(25, 18, 14, 0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.4) * 45;
      y += (Math.random() - 0.4) * 45;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(40, 32, 28, 0.25)";
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  configureRepeat(tex, 2.2, 1.4);
  return tex;
}

/** Aço da lâmina: listras leves + ruído (cartoon metal polido). */
export function createCartoonBladeSteelTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const lg = ctx.createLinearGradient(0, 0, size, size);
  lg.addColorStop(0, "#dfe8f0");
  lg.addColorStop(0.45, "#eef4f8");
  lg.addColorStop(0.55, "#c8d4de");
  lg.addColorStop(1, "#b8c6d4");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.12;
  for (let x = 0; x < size; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? "#ffffff" : "#a8b4c0";
    ctx.fillRect(x, 0, 1, size);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 800; i++) {
    const v = 200 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgba(${v},${v + 5},${v + 10},${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Borda do gume: mais clara, traços horizontais. */
export function createCartoonBladeEdgeTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.18;
  for (let y = 0; y < size; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? "#ffffff" : "#dce6ee";
    ctx.fillRect(0, y, size, 1);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Canaleta (fuller): tons mais escuros. */
export function createCartoonFullerTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6a7580";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 40},${58 + Math.random() * 35},${68 + Math.random() * 30},0.35)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Bronze com manchas de patina (verde-acastanhado). */
export function createCartoonBronzeTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8a6e48";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 8 + Math.random() * 35;
    const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    const roll = Math.random();
    if (roll < 0.35) {
      grd.addColorStop(0, "rgba(90, 110, 75, 0.5)");
      grd.addColorStop(1, "rgba(138, 110, 72, 0)");
    } else if (roll < 0.7) {
      grd.addColorStop(0, "rgba(110, 82, 48, 0.45)");
      grd.addColorStop(1, "rgba(138, 110, 72, 0)");
    } else {
      grd.addColorStop(0, "rgba(180, 150, 100, 0.35)");
      grd.addColorStop(1, "rgba(138, 110, 72, 0)");
    }
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(45, 35, 22, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.bezierCurveTo(
      Math.random() * size,
      Math.random() * size,
      Math.random() * size,
      Math.random() * size,
      Math.random() * size,
      Math.random() * size,
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Couro do cabo: grão irregular escuro. */
export function createCartoonLeatherTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a281c";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(${25 + Math.random() * 35},${18 + Math.random() * 22},${12 + Math.random() * 15},${0.15 + Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  ctx.strokeStyle = "rgba(15, 10, 8, 0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) {
    ctx.beginPath();
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + (Math.random() - 0.5) * 40, y0 + (Math.random() - 0.5) * 40);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Couro do cabo: grão + traços diagonais (cordame / torção), repete no cilindro. */
export function createCartoonGripLeatherTexture(w = 72, h = 200): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2e2218");
  g.addColorStop(0.5, "#382a1e");
  g.addColorStop(1, "#261c14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${32 + Math.random() * 28},${22 + Math.random() * 18},${14 + Math.random() * 12},0.14)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.strokeStyle = "rgba(12, 8, 6, 0.5)";
  ctx.lineWidth = 1.25;
  const step = 6;
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h * 0.42, h);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(72, 58, 44, 0.22)";
  ctx.lineWidth = 0.75;
  for (let i = -h + step * 0.5; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h * 0.42, h);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 28; row++) {
    const y = (row / 28) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Muro do coliseu: pedras marrons cartoon, juntas escuras. */
export function createCartoonColiseumWallTexture(w = 512, h = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#7a6558";
  ctx.fillRect(0, 0, w, h);

  const rows = 5;
  const cols = 8;
  const bh = h / rows;
  const bw = w / cols;
  const stones = ["#8b7565", "#7d6a5c", "#867260", "#786356", "#928070"];
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : bw * 0.5;
    for (let col = -1; col < cols + 1; col++) {
      const x = col * bw + offset + (Math.random() - 0.5) * 4;
      const y = row * bh + (Math.random() - 0.5) * 3;
      const sw = Math.max(bw - 8, bw - 5 + Math.random() * 3);
      const sh = Math.max(bh - 8, bh - 5 + Math.random() * 2);
      ctx.fillStyle = stones[(row + col + 9) % stones.length]!;
      ctx.fillRect(x + 3, y + 3, sw, sh);
    }
  }

  ctx.strokeStyle = "rgba(35, 28, 22, 0.45)";
  ctx.lineWidth = 2;
  for (let row = 0; row <= rows; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * bh);
    ctx.lineTo(w, row * bh);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.needsUpdate = true;
  return tex;
}

/** Portão de ferro enferrujado (cartoon): tábuas, manchas laranja-ferrugem, rebites, reforços. */
export function createCartoonIronGateTexture(s = 320): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2a2420";
  ctx.fillRect(0, 0, s, s);

  const rustBlotch = (x: number, y: number, r: number, a: number): void => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(160, 72, 38, ${a})`);
    g.addColorStop(0.45, `rgba(110, 52, 32, ${a * 0.65})`);
    g.addColorStop(1, "rgba(40, 32, 28, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 28; i++) {
    rustBlotch(
      Math.random() * s,
      Math.random() * s,
      8 + Math.random() * 38,
      0.12 + Math.random() * 0.22,
    );
  }
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(75, 55, 42, 0.35)";
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = "source-over";

  const plankW = s * 0.46;
  const gap = s * 0.04;
  const mid = s * 0.5;
  for (const x0 of [s * 0.05, mid + gap / 2]) {
    const grd = ctx.createLinearGradient(x0, 0, x0 + plankW, s);
    grd.addColorStop(0, "#5c4a42");
    grd.addColorStop(0.22, "#6b4035");
    grd.addColorStop(0.45, "#3d3530");
    grd.addColorStop(0.62, "#4a3228");
    grd.addColorStop(0.78, "#2e2824");
    grd.addColorStop(1, "#252018");
    ctx.fillStyle = grd;
    ctx.fillRect(x0, s * 0.08, plankW, s * 0.84);
    ctx.strokeStyle = "rgba(15, 10, 8, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, s * 0.08, plankW, s * 0.84);
    ctx.globalAlpha = 0.4;
    for (let ly = 0; ly < 6; ly++) {
      ctx.strokeStyle = `rgba(130, 60, 35, ${0.15 + Math.random() * 0.12})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + 2, s * 0.12 + ly * s * 0.14);
      ctx.lineTo(x0 + plankW - 2, s * 0.1 + ly * s * 0.15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "rgba(35, 22, 16, 0.65)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(s * 0.08, s * 0.15);
  ctx.lineTo(s * 0.92, s * 0.88);
  ctx.stroke();
  ctx.strokeStyle = "rgba(140, 65, 38, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(45, 38, 34, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 0.82);
  ctx.lineTo(s * 0.9, s * 0.18);
  ctx.stroke();

  const rivet = (x: number, y: number): void => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#3a3028";
    ctx.fill();
    ctx.strokeStyle = "rgba(100, 48, 28, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#5a4a3a";
    ctx.fill();
  };
  for (let py = 0; py < 5; py++) {
    rivet(s * 0.22, s * 0.18 + py * s * 0.16);
    rivet(s * 0.78, s * 0.18 + py * s * 0.16);
  }
  for (let px = 0; px < 4; px++) {
    rivet(s * 0.32 + px * s * 0.12, s * 0.1);
    rivet(s * 0.32 + px * s * 0.12, s * 0.9);
  }

  ctx.globalCompositeOperation = "soft-light";
  for (let i = 0; i < 12; i++) {
    const gx = Math.random() * s;
    const gy = Math.random() * s;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 6 + Math.random() * 10);
    gr.addColorStop(0, "rgba(55, 70, 58, 0.2)");
    gr.addColorStop(1, "rgba(55, 70, 58, 0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type MainMenuTextureSet = {
  sand: THREE.CanvasTexture;
  rock: THREE.CanvasTexture;
  bladeSteel: THREE.CanvasTexture;
  bladeEdge: THREE.CanvasTexture;
  fuller: THREE.CanvasTexture;
  bronze: THREE.CanvasTexture;
  leather: THREE.CanvasTexture;
  gripLeather: THREE.CanvasTexture;
  coliseumWall: THREE.CanvasTexture;
  ironGate: THREE.CanvasTexture;
};

export function createMainMenuTextureSet(): MainMenuTextureSet {
  return {
    sand: createCartoonSandTexture(),
    rock: createCartoonRockTexture(),
    bladeSteel: createCartoonBladeSteelTexture(),
    bladeEdge: createCartoonBladeEdgeTexture(),
    fuller: createCartoonFullerTexture(),
    bronze: createCartoonBronzeTexture(),
    leather: createCartoonLeatherTexture(),
    gripLeather: createCartoonGripLeatherTexture(),
    coliseumWall: createCartoonColiseumWallTexture(),
    ironGate: createCartoonIronGateTexture(),
  };
}

export function disposeMainMenuTextures(t: MainMenuTextureSet): void {
  t.sand.dispose();
  t.rock.dispose();
  t.bladeSteel.dispose();
  t.bladeEdge.dispose();
  t.fuller.dispose();
  t.bronze.dispose();
  t.leather.dispose();
  t.gripLeather.dispose();
  t.coliseumWall.dispose();
  t.ironGate.dispose();
}

/** Quantidade de variantes (partilhadas entre as muitas pétalas). */
export const ROSE_PETAL_TEXTURE_COUNT = 7;

/**
 * Silhueta de pétala de rosa (vista clássica): base estreita (ligação à flor),
 * corpo alargado, bordo superior arredondado — não elipse (evita “esfera rosada”).
 * Coordenadas: y=0 topo do canvas = extremo livre da pétala; y=s base estreita.
 */
function traceRosePetalPath(
  ctx: CanvasRenderingContext2D,
  s: number,
  cx: number,
  variant: number,
): void {
  const widen = 0.92 + (variant % 5) * 0.05;
  const skew = ((variant % 4) - 1.5) * 0.035 * s;
  const tipY = s * 0.07;
  const baseY = s * 0.9;
  const baseHalf = s * 0.045 * widen;
  const bellyY = s * 0.42;
  const bellyHalf = s * 0.21 * widen;

  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.bezierCurveTo(
    cx - baseHalf * 1.2,
    baseY - s * 0.06,
    cx - bellyHalf * 0.55,
    bellyY + s * 0.1,
    cx - bellyHalf,
    bellyY + skew * 0.15,
  );
  ctx.bezierCurveTo(
    cx - bellyHalf * 1.05,
    bellyY - s * 0.18,
    cx - bellyHalf * 0.42,
    tipY + s * 0.14,
    cx + skew * 0.25,
    tipY,
  );
  ctx.bezierCurveTo(
    cx + bellyHalf * 0.42,
    tipY + s * 0.14,
    cx + bellyHalf * 1.05,
    bellyY - s * 0.18,
    cx + bellyHalf,
    bellyY - skew * 0.15,
  );
  ctx.bezierCurveTo(
    cx + bellyHalf * 0.55,
    bellyY + s * 0.1,
    cx + baseHalf * 1.2,
    baseY - s * 0.06,
    cx,
    baseY,
  );
  ctx.closePath();
}

/**
 * Textura cartoon: só a forma da pétala (alpha suave nas bordas), gradiente e nervuras.
 */
function createCartoonRosePetalTexture(variant: number, s = 160): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);

  const hue0 = 324 + ((variant * 7) % 34);
  const cx = s * 0.5 + ((variant % 3) - 1) * 0.02 * s;

  traceRosePetalPath(ctx, s, cx, variant);

  const lg = ctx.createLinearGradient(cx, s * 0.06, cx, s * 0.92);
  lg.addColorStop(0, `hsla(${hue0 + 6}, 92%, 90%, 1)`);
  lg.addColorStop(0.22, `hsla(${hue0 + 2}, 88%, 76%, 1)`);
  lg.addColorStop(0.5, `hsla(${hue0 - 3}, 84%, 56%, 1)`);
  lg.addColorStop(0.78, `hsla(${hue0 - 10}, 80%, 40%, 1)`);
  lg.addColorStop(1, `hsla(${hue0 - 14}, 76%, 32%, 1)`);
  ctx.fillStyle = lg;
  ctx.fill();

  traceRosePetalPath(ctx, s, cx, variant);
  ctx.strokeStyle = `hsla(${hue0 - 18}, 72%, 24%, 0.42)`;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.save();
  traceRosePetalPath(ctx, s, cx, variant);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = `hsla(${hue0 - 24}, 65%, 20%, 0.28)`;
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, s * 0.88);
  ctx.bezierCurveTo(
    cx - s * 0.06,
    s * 0.55,
    cx + s * 0.05,
    s * 0.28,
    cx,
    s * 0.1,
  );
  ctx.stroke();
  if (variant % 2 === 0) {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.04, s * 0.72);
    ctx.quadraticCurveTo(cx - s * 0.14, s * 0.45, cx - s * 0.06, s * 0.2);
    ctx.stroke();
  } else {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.04, s * 0.72);
    ctx.quadraticCurveTo(cx + s * 0.14, s * 0.45, cx + s * 0.06, s * 0.2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  traceRosePetalPath(ctx, s, cx, variant);
  ctx.clip();
  const hi = ctx.createLinearGradient(cx - s * 0.22, 0, cx + s * 0.22, s * 0.5);
  hi.addColorStop(0, "rgba(255, 248, 252, 0.28)");
  hi.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  hi.addColorStop(1, "rgba(90, 35, 55, 0.08)");
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCartoonRosePetalTextures(): THREE.CanvasTexture[] {
  return Array.from({ length: ROSE_PETAL_TEXTURE_COUNT }, (_, i) =>
    createCartoonRosePetalTexture(i),
  );
}

export function disposeRosePetalTextures(texs: THREE.CanvasTexture[]): void {
  for (const t of texs) t.dispose();
}
