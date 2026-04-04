export interface Axial {
  q: number;
  r: number;
}

export function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function parseAxialKey(key: string): Axial {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

const DIRS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexNeighbors(q: number, r: number): Axial[] {
  return DIRS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/** Distância axial (cube metric) */
export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function axialToWorld(q: number, r: number, size: number): { x: number; z: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const z = size * (3 / 2) * r;
  return { x, z };
}

/**
 * Hex axial que contém o ponto no plano XZ (mesma convenção que `axialToWorld` / grelha da arena).
 */
export function worldXzToAxial(x: number, z: number, size: number): Axial {
  const qf = x / (size * Math.sqrt(3)) - z / (3 * size);
  const rf = (2 * z) / (3 * size);
  const xf = qf;
  const yf = -qf - rf;
  const zf = rf;
  return cubeRoundFrac(xf, yf, zf);
}

function cubeRoundFrac(x: number, y: number, z: number): Axial {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

/** Linha contínua de hexes entre dois pontos (métrica axial). */
export function hexLine(a: Axial, b: Axial): Axial[] {
  const N = hexDistance(a, b);
  if (N === 0) return [{ q: a.q, r: a.r }];
  const ax = a.q;
  const ay = -a.q - a.r;
  const az = a.r;
  const bx = b.q;
  const by = -b.q - b.r;
  const bz = b.r;
  const out: Axial[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const z = az + (bz - az) * t;
    const h = cubeRoundFrac(x, y, z);
    const prev = out[out.length - 1];
    if (!prev || prev.q !== h.q || prev.r !== h.r) out.push(h);
  }
  return out;
}

/**
 * Semirreta: do herói na direção do hex `through`, até sair da grelha ou `maxExtend` passos.
 */
export function hexBeamRayThroughGrid(
  hero: Axial,
  through: Axial,
  gridHas: (q: number, r: number) => boolean,
  maxExtend: number,
): Axial[] {
  const line = hexLine(hero, through);
  if (line.length < 2) return line;
  const dirQ = line[1]!.q - line[0]!.q;
  const dirR = line[1]!.r - line[0]!.r;
  const out = [...line];
  let last = out[out.length - 1]!;
  for (let i = 0; i < maxExtend; i++) {
    const nq = last.q + dirQ;
    const nr = last.r + dirR;
    if (!gridHas(nq, nr)) break;
    last = { q: nq, r: nr };
    out.push(last);
  }
  return out;
}
