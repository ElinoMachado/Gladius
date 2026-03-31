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
