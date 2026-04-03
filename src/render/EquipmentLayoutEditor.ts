import * as THREE from "three";
import type { HeroClassId } from "../game/types";
import { cloneHeroBodyFromGlb } from "./heroGlbLoader";
import {
  buildHeroEquipmentEditorRoot,
  computeAutoForgeAttachForGlbBody,
  getForgeAttachStaticFallback,
} from "./unitModels";
import {
  cloneForgeAttachConfig,
  clearForgeEquipmentAttachForClass,
  getSanitizedForgeEquipmentAttachForClass,
  loadForgeEquipmentLayoutPrefs,
  saveForgeEquipmentLayoutPrefs,
} from "./forgeEquipmentLayoutPrefs";
import type { HeroForgeAttachConfig } from "./heroGlbShared";
import { updateHeroUnitAnimations } from "./heroUnitAnimations";

export type ForgeEditSlot = "helmet" | "cape" | "manoplas";

function captureForgeGroups(root: THREE.Group): Record<
  ForgeEditSlot,
  THREE.Group | null
> {
  const out: Record<ForgeEditSlot, THREE.Group | null> = {
    helmet: null,
    cape: null,
    manoplas: null,
  };
  for (const ch of root.children) {
    const s = ch.userData.forgeSlot as string | undefined;
    if (s === "helmet" || s === "cape" || s === "manoplas") {
      out[s] = ch as THREE.Group;
    }
  }
  return out;
}

function disposeObject3D(o: THREE.Object3D): void {
  o.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
  });
}

function slotKey(slot: ForgeEditSlot): keyof HeroForgeAttachConfig {
  if (slot === "helmet") return "helmet";
  if (slot === "cape") return "cape";
  return "manoplas";
}

/**
 * Editor 3D (canvas dedicado): elmo, capa e manoplas por classe; grava em localStorage (`gladius-forge-equipment-layout-v1`).
 */
export class EquipmentLayoutEditor {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hit = new THREE.Vector3();
  private readonly clock = new THREE.Clock();

  private heroClass: HeroClassId = "gladiador";
  private readonly displayColor = 0x5a8cc8;
  private attach: HeroForgeAttachConfig;
  private autoAttach: HeroForgeAttachConfig;
  private heroRoot: THREE.Group | null = null;
  private forgeGroups: Record<ForgeEditSlot, THREE.Group | null> = {
    helmet: null,
    cape: null,
    manoplas: null,
  };

  selectedSlot: ForgeEditSlot = "helmet";

  private camYaw = 0.35;
  private camPitch = 0.12;
  private camDist = 2.95;
  private readonly orbitTarget = new THREE.Vector3(0, 0.88, 0);

  private dragMode: "none" | "move_xz" | "move_y" | "orbit" = "none";
  private lastClientX = 0;
  private lastClientY = 0;
  private raf = 0;
  private running = false;

  private boundDown = (e: PointerEvent) => this.onPointerDown(e);
  private boundMove = (e: PointerEvent) => this.onPointerMove(e);
  private boundUp = (e: PointerEvent) => this.onPointerUp(e);
  private boundWheel = (e: WheelEvent) => this.onWheel(e);
  private boundKey = (e: KeyboardEvent) => this.onKeyDown(e);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onStateChange?: () => void,
  ) {
    this.scene.background = new THREE.Color(0x1a1520);
    const amb = new THREE.AmbientLight(0xccc4dc, 0.58);
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.92);
    dir.position.set(2.2, 5.2, 3.2);
    this.scene.add(amb, dir);

    const aspect = Math.max(
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.01,
    );
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.08, 80);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();

    this.autoAttach = this.computeAutoAttachOnly("gladiador");
    const saved = getSanitizedForgeEquipmentAttachForClass(
      "gladiador",
      this.autoAttach,
    );
    this.attach = cloneForgeAttachConfig(saved ?? this.autoAttach);
    this.updateCameraPosition();
    this.rebuildHero();

    this.canvas.addEventListener("pointerdown", this.boundDown);
    this.canvas.addEventListener("pointermove", this.boundMove);
    this.canvas.addEventListener("pointerup", this.boundUp);
    this.canvas.addEventListener("pointerleave", this.boundUp);
    this.canvas.addEventListener("wheel", this.boundWheel, { passive: false });
    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    window.addEventListener("keydown", this.boundKey);
  }

  private computeAutoAttachOnly(heroClass: HeroClassId): HeroForgeAttachConfig {
    const tmp = new THREE.Group();
    const glb = cloneHeroBodyFromGlb(heroClass, this.displayColor);
    if (!glb) {
      return cloneForgeAttachConfig(getForgeAttachStaticFallback(heroClass));
    }
    tmp.add(glb);
    tmp.updateMatrixWorld(true);
    return computeAutoForgeAttachForGlbBody(heroClass, tmp, glb);
  }

  getHeroClass(): HeroClassId {
    return this.heroClass;
  }

  getAttach(): HeroForgeAttachConfig {
    return this.attach;
  }

  getAutoAttach(): HeroForgeAttachConfig {
    return this.autoAttach;
  }

  hasSavedLayoutForCurrentClass(): boolean {
    return (
      loadForgeEquipmentLayoutPrefs().byClass[this.heroClass] !== undefined
    );
  }

  setHeroClass(heroClass: HeroClassId): void {
    if (this.heroClass === heroClass) return;
    this.heroClass = heroClass;
    this.autoAttach = this.computeAutoAttachOnly(heroClass);
    const saved = getSanitizedForgeEquipmentAttachForClass(
      heroClass,
      this.autoAttach,
    );
    this.attach = cloneForgeAttachConfig(saved ?? this.autoAttach);
    this.rebuildHero();
    this.onStateChange?.();
  }

  setSelectedSlot(slot: ForgeEditSlot): void {
    this.selectedSlot = slot;
    this.syncSelectionOutline();
    this.onStateChange?.();
  }

  /** Volta aos valores automáticos (rig/bbox) sem gravar. */
  resetCurrentClassToAuto(): void {
    this.attach = cloneForgeAttachConfig(this.autoAttach);
    this.applyAttachToForgeGroups();
    this.syncSelectionOutline();
    this.onStateChange?.();
  }

  /** Apaga o layout guardado desta classe e repõe o automático. */
  clearSavedForCurrentClass(): void {
    clearForgeEquipmentAttachForClass(this.heroClass);
    this.resetCurrentClassToAuto();
  }

  /** Grava o layout atual das três peças para a classe em curso. */
  saveCurrentClassToStorage(): void {
    const p = loadForgeEquipmentLayoutPrefs();
    p.byClass[this.heroClass] = cloneForgeAttachConfig(this.attach);
    saveForgeEquipmentLayoutPrefs(p);
    this.onStateChange?.();
  }

  saveAllAndExit(): void {
    this.saveCurrentClassToStorage();
  }

  resize(): void {
    const w = Math.max(this.canvas.clientWidth, 2);
    const h = Math.max(this.canvas.clientHeight, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private rebuildHero(): void {
    if (this.heroRoot) {
      this.scene.remove(this.heroRoot);
      disposeObject3D(this.heroRoot);
      this.heroRoot = null;
    }
    const glb = cloneHeroBodyFromGlb(this.heroClass, this.displayColor);
    if (!glb) {
      this.forgeGroups = { helmet: null, cape: null, manoplas: null };
      return;
    }
    const tmp = new THREE.Group();
    tmp.add(glb);
    tmp.updateMatrixWorld(true);
    this.autoAttach = computeAutoForgeAttachForGlbBody(
      this.heroClass,
      tmp,
      glb,
    );
    this.heroRoot = buildHeroEquipmentEditorRoot(
      this.heroClass,
      this.displayColor,
      this.attach,
    );
    this.scene.add(this.heroRoot);
    this.heroRoot.updateMatrixWorld(true);
    this.forgeGroups = captureForgeGroups(this.heroRoot);
    this.syncSelectionOutline();
  }

  private applyAttachToForgeGroups(): void {
    const h = this.attach.helmet;
    const c = this.attach.cape;
    const m = this.attach.manoplas;
    const gh = this.forgeGroups.helmet;
    const gc = this.forgeGroups.cape;
    const gm = this.forgeGroups.manoplas;
    if (gh) {
      gh.position.set(h.x ?? 0, h.y, h.z ?? 0);
      gh.scale.setScalar(h.scale);
      gh.rotation.set(h.rotX ?? 0, h.rotY ?? 0, h.rotZ ?? 0);
    }
    if (gc) {
      gc.position.set(c.x, c.y, c.z);
      gc.scale.setScalar(c.scale);
      gc.rotation.set(c.rotX, c.rotY ?? 0, c.rotZ ?? 0);
    }
    if (gm) {
      gm.position.set(m.x ?? 0, m.y, m.z);
      gm.scale.setScalar(m.scale);
      gm.rotation.set(m.rotX ?? 0, m.rotY ?? 0, m.rotZ ?? 0);
    }
  }

  private readSelectedPieceFromGroup(): void {
    const g = this.forgeGroups[this.selectedSlot];
    if (!g) return;
    const k = slotKey(this.selectedSlot);
    const p = this.attach[k] as Record<string, number | undefined>;
    if (this.selectedSlot === "helmet" || this.selectedSlot === "manoplas") {
      p.x = g.position.x;
      p.y = g.position.y;
      p.z = g.position.z;
    } else {
      p.x = g.position.x;
      p.y = g.position.y;
      p.z = g.position.z;
    }
    p.scale = g.scale.x;
    p.rotX = g.rotation.x;
    p.rotY = g.rotation.y;
    p.rotZ = g.rotation.z;
  }

  private syncSelectionOutline(): void {
    for (const slot of ["helmet", "cape", "manoplas"] as const) {
      const gr = this.forgeGroups[slot];
      if (!gr) continue;
      const sel = slot === this.selectedSlot;
      gr.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mat = obj.material;
        const apply = (m: THREE.MeshStandardMaterial) => {
          if (sel) {
            m.emissive.setHex(0x442266);
            m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.35);
          } else {
            m.emissive.setHex(0);
            m.emissiveIntensity = 0;
          }
        };
        if (Array.isArray(mat)) {
          mat.forEach((x) => {
            if (x instanceof THREE.MeshStandardMaterial) apply(x);
          });
        } else if (mat instanceof THREE.MeshStandardMaterial) {
          apply(mat);
        }
      });
    }
  }

  private updateCameraPosition(): void {
    const cp = Math.max(0.08, Math.min(1.35, this.camPitch));
    const y = this.orbitTarget.y + this.camDist * Math.sin(cp);
    const h = this.camDist * Math.cos(cp);
    const x = this.orbitTarget.x + h * Math.sin(this.camYaw);
    const z = this.orbitTarget.z + h * Math.cos(this.camYaw);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.orbitTarget);
  }

  private pickForgeMeshes(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const gr of Object.values(this.forgeGroups)) {
      if (!gr) continue;
      gr.traverse((o) => {
        if (o instanceof THREE.Mesh) list.push(o);
      });
    }
    return list;
  }

  private forgeSlotFromHit(obj: THREE.Object3D | null): ForgeEditSlot | null {
    let o: THREE.Object3D | null = obj;
    while (o) {
      const s = o.userData.forgeSlot as string | undefined;
      if (s === "helmet" || s === "cape" || s === "manoplas") return s;
      o = o.parent;
    }
    return null;
  }

  private ndc(e: PointerEvent): THREE.Vector2 {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1;
    const y = -((e.clientY - r.top) / Math.max(r.height, 1)) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  private onPointerDown(e: PointerEvent): void {
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    if (e.button === 2 || e.buttons === 2) {
      this.dragMode = "orbit";
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const ndc = this.ndc(e);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hitSlot = this.forgeSlotFromHit(
      this.raycaster.intersectObjects(this.pickForgeMeshes(), false)[0]?.object ??
        null,
    );
    if (hitSlot) {
      this.setSelectedSlot(hitSlot);
    }
    const piece = this.forgeGroups[this.selectedSlot];
    if (e.shiftKey) {
      this.dragMode = piece ? "move_y" : "none";
    } else {
      this.dragMode = piece ? "move_xz" : "none";
    }
    if (this.dragMode === "move_xz" || this.dragMode === "move_y") {
      const g = this.forgeGroups[this.selectedSlot];
      if (g) {
        this.plane.constant = -g.position.y;
      } else {
        this.dragMode = "none";
      }
    }
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    const dx = e.clientX - this.lastClientX;
    const dy = e.clientY - this.lastClientY;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    if (this.dragMode === "orbit") {
      this.camYaw -= dx * 0.0065;
      this.camPitch += dy * 0.0055;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, 0.06, 1.28);
      this.updateCameraPosition();
      return;
    }
    const g = this.forgeGroups[this.selectedSlot];
    if (!g || this.dragMode === "none") return;
    if (this.dragMode === "move_xz") {
      const ndc = this.ndc(e);
      this.raycaster.setFromCamera(ndc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
        g.position.x = this.hit.x;
        g.position.z = this.hit.z;
        this.readSelectedPieceFromGroup();
        this.onStateChange?.();
      }
    } else if (this.dragMode === "move_y") {
      g.position.y += -dy * 0.0045;
      this.readSelectedPieceFromGroup();
      this.onStateChange?.();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    this.dragMode = "none";
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const z = e.deltaY > 0 ? 1.06 : 1 / 1.06;
    this.camDist = THREE.MathUtils.clamp(this.camDist * z, 1.15, 8.5);
    this.updateCameraPosition();
  }

  private nudgeSelected(dx: number, dy: number, dz: number): void {
    const k = slotKey(this.selectedSlot);
    const p = this.attach[k] as Record<string, number>;
    if ("x" in p) p.x = (p.x ?? 0) + dx;
    p.y += dy;
    if ("z" in p) p.z = (p.z ?? 0) + dz;
    this.applyAttachToForgeGroups();
    this.onStateChange?.();
  }

  private rotateSelected(rx: number, ry: number, rz: number): void {
    const k = slotKey(this.selectedSlot);
    const p = this.attach[k] as Record<string, number | undefined>;
    p.rotX = (p.rotX ?? 0) + rx;
    p.rotY = (p.rotY ?? 0) + ry;
    p.rotZ = (p.rotZ ?? 0) + rz;
    this.applyAttachToForgeGroups();
    this.onStateChange?.();
  }

  private scaleSelected(factor: number): void {
    const k = slotKey(this.selectedSlot);
    const p = this.attach[k] as { scale: number };
    p.scale = THREE.MathUtils.clamp(p.scale * factor, 0.06, 2.4);
    this.applyAttachToForgeGroups();
    this.onStateChange?.();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Escape") return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) return;
    const step = e.shiftKey ? 0.012 : 0.006;
    const rotStep = e.shiftKey ? 0.09 : 0.045;
    switch (e.code) {
      case "KeyW":
        this.nudgeSelected(0, step, 0);
        e.preventDefault();
        break;
      case "KeyS":
        this.nudgeSelected(0, -step, 0);
        e.preventDefault();
        break;
      case "KeyA":
        this.nudgeSelected(-step, 0, 0);
        e.preventDefault();
        break;
      case "KeyD":
        this.nudgeSelected(step, 0, 0);
        e.preventDefault();
        break;
      case "KeyQ":
        this.nudgeSelected(0, 0, -step);
        e.preventDefault();
        break;
      case "KeyE":
        this.nudgeSelected(0, 0, step);
        e.preventDefault();
        break;
      case "KeyI":
        this.rotateSelected(rotStep, 0, 0);
        e.preventDefault();
        break;
      case "KeyK":
        this.rotateSelected(-rotStep, 0, 0);
        e.preventDefault();
        break;
      case "KeyJ":
        this.rotateSelected(0, -rotStep, 0);
        e.preventDefault();
        break;
      case "KeyL":
        this.rotateSelected(0, rotStep, 0);
        e.preventDefault();
        break;
      case "KeyU":
        this.rotateSelected(0, 0, -rotStep);
        e.preventDefault();
        break;
      case "KeyO":
        this.rotateSelected(0, 0, rotStep);
        e.preventDefault();
        break;
      case "BracketRight":
      case "NumpadAdd":
        this.scaleSelected(1.04);
        e.preventDefault();
        break;
      case "BracketLeft":
      case "NumpadSubtract":
        this.scaleSelected(1 / 1.04);
        e.preventDefault();
        break;
      default:
        break;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, this.clock.getDelta());
      if (this.heroRoot) {
        const body = this.heroRoot.children.find((c) => !c.userData?.forgeSlot);
        if (body) updateHeroUnitAnimations(body, dt);
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    this.canvas.removeEventListener("pointerdown", this.boundDown);
    this.canvas.removeEventListener("pointermove", this.boundMove);
    this.canvas.removeEventListener("pointerup", this.boundUp);
    this.canvas.removeEventListener("pointerleave", this.boundUp);
    this.canvas.removeEventListener("wheel", this.boundWheel);
    window.removeEventListener("keydown", this.boundKey);
    if (this.heroRoot) {
      this.scene.remove(this.heroRoot);
      disposeObject3D(this.heroRoot);
    }
    this.renderer.dispose();
  }
}
