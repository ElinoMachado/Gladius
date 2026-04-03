const LS_KEY = "gladius-scene-layout-v1";

export type SceneLayoutPrefs = {
  /** Deslocamento extra do grupo que contém o GLB do coliseu (mundo → local do arenaRoot). */
  coliseum: { x: number; y: number; z: number };
  /** Câmara livre (perspetiva); null = usar câmara ortográfica de combate. */
  freeCamera: null | {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    fov: number;
  };
};

const DEFAULT_PREFS: SceneLayoutPrefs = {
  coliseum: { x: 0, y: 0, z: 0 },
  freeCamera: null,
};

function parsePrefs(raw: string | null): SceneLayoutPrefs {
  if (!raw) return { ...DEFAULT_PREFS, coliseum: { ...DEFAULT_PREFS.coliseum } };
  try {
    const o = JSON.parse(raw) as Partial<SceneLayoutPrefs>;
    const col = o.coliseum;
    const cx =
      col && typeof col.x === "number" && Number.isFinite(col.x) ? col.x : 0;
    const cy =
      col && typeof col.y === "number" && Number.isFinite(col.y) ? col.y : 0;
    const cz =
      col && typeof col.z === "number" && Number.isFinite(col.z) ? col.z : 0;
    let freeCamera: SceneLayoutPrefs["freeCamera"] = null;
    const fc = o.freeCamera;
    if (
      fc &&
      Array.isArray(fc.position) &&
      fc.position.length === 3 &&
      Array.isArray(fc.quaternion) &&
      fc.quaternion.length === 4
    ) {
      const fov = typeof fc.fov === "number" && Number.isFinite(fc.fov) ? fc.fov : 48;
      freeCamera = {
        position: [fc.position[0]!, fc.position[1]!, fc.position[2]!],
        quaternion: [
          fc.quaternion[0]!,
          fc.quaternion[1]!,
          fc.quaternion[2]!,
          fc.quaternion[3]!,
        ],
        fov,
      };
    }
    return { coliseum: { x: cx, y: cy, z: cz }, freeCamera };
  } catch {
    return { ...DEFAULT_PREFS, coliseum: { ...DEFAULT_PREFS.coliseum } };
  }
}

export function loadSceneLayoutPrefs(): SceneLayoutPrefs {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_PREFS, coliseum: { ...DEFAULT_PREFS.coliseum } };
  }
  return parsePrefs(localStorage.getItem(LS_KEY));
}

export function saveSceneLayoutPrefs(p: SceneLayoutPrefs): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
