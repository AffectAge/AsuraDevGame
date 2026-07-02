import type { ArcRotateCamera } from "@babylonjs/core";
import type { Nullable, Observer } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { clampCameraToMap } from "../scene/createMapCamera";

type CameraControllerOptions = {
  scene: Scene;
  camera: ArcRotateCamera;
  canvas: HTMLCanvasElement;
  artifact: GeneratedMapArtifact;
};

const MIN_ORTHO_HEIGHT = 8;
const MAX_ORTHO_HEIGHT = 72;
const DEFAULT_ALPHA = -Math.PI / 2;
const DEFAULT_BETA = Math.PI / 3;
const MIN_BETA = Math.PI / 4;
const MAX_BETA = Math.PI / 2.35;
type DragMode = "pan" | "rotate";

export class CameraController {
  private readonly pressedKeys = new Set<string>();
  private readonly beforeRenderObserver: Nullable<Observer<Scene>>;
  private velocityX = 0;
  private velocityZ = 0;
  private lastTime = performance.now();
  private pointerX = 0;
  private pointerY = 0;
  private pointerInside = false;
  private dragPointerId: number | null = null;
  private dragMode: DragMode | null = null;
  private lastDragX = 0;
  private lastDragY = 0;
  private fixedTilt = false;

  constructor(private readonly options: CameraControllerOptions) {
    options.canvas.tabIndex = 0;
    options.canvas.addEventListener("keydown", this.handleKeyDown);
    options.canvas.addEventListener("keyup", this.handleKeyUp);
    options.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    options.canvas.addEventListener("pointermove", this.handlePointerMove);
    options.canvas.addEventListener("pointerenter", this.handlePointerEnter);
    options.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    options.canvas.addEventListener("pointerdown", this.handlePointerDown);
    options.canvas.addEventListener("pointerup", this.handlePointerUp);
    options.canvas.addEventListener("pointercancel", this.handlePointerUp);
    options.canvas.addEventListener("contextmenu", this.preventContextMenu);
    this.beforeRenderObserver = options.scene.onBeforeRenderObservable.add(() => this.update());
  }

  dispose(): void {
    this.options.canvas.removeEventListener("keydown", this.handleKeyDown);
    this.options.canvas.removeEventListener("keyup", this.handleKeyUp);
    this.options.canvas.removeEventListener("wheel", this.handleWheel);
    this.options.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.options.canvas.removeEventListener("pointerenter", this.handlePointerEnter);
    this.options.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.options.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.options.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.options.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.options.canvas.removeEventListener("contextmenu", this.preventContextMenu);
    if (this.beforeRenderObserver) {
      this.options.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.pressedKeys.add(key);
    if (!event.repeat && key === "t") {
      this.fixedTilt = !this.fixedTilt;
      event.preventDefault();
    }
    if (key === "r") {
      this.resetRotation();
      event.preventDefault();
    }
    if (event.code === "NumpadAdd" || key === "+" || key === "=") {
      this.zoomByFactor(0.89);
      event.preventDefault();
    }
    if (event.code === "NumpadSubtract" || key === "-" || key === "_") {
      this.zoomByFactor(1.12);
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.pressedKeys.delete(key);
    if (key === "alt" && this.dragMode === "rotate" && !this.fixedTilt) {
      this.resetRotation();
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomByFactor(event.deltaY > 0 ? 1.12 : 0.89);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerInside = true;
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
    if (this.dragPointerId !== event.pointerId || this.dragMode === null) return;

    const dx = event.clientX - this.lastDragX;
    const dy = event.clientY - this.lastDragY;
    this.lastDragX = event.clientX;
    this.lastDragY = event.clientY;
    if (this.dragMode === "pan") {
      this.panByScreenPixels(-dx, dy);
    } else {
      this.rotateByScreenPixels(dx, dy);
    }
  };

  private readonly handlePointerEnter = (): void => {
    this.pointerInside = true;
  };

  private readonly handlePointerLeave = (): void => {
    this.pointerInside = false;
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.options.canvas.focus();
    const nextDragMode: DragMode | null = event.altKey && event.button === 0 ? "rotate" : event.button === 1 || event.button === 2 ? "pan" : null;
    if (!nextDragMode) return;
    event.preventDefault();
    this.dragPointerId = event.pointerId;
    this.dragMode = nextDragMode;
    this.lastDragX = event.clientX;
    this.lastDragY = event.clientY;
    this.options.canvas.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.dragPointerId !== event.pointerId) return;
    const completedMode = this.dragMode;
    this.dragPointerId = null;
    this.dragMode = null;
    if (this.options.canvas.hasPointerCapture(event.pointerId)) {
      this.options.canvas.releasePointerCapture(event.pointerId);
    }
    if (completedMode === "rotate" && !this.fixedTilt) {
      this.resetRotation();
    }
  };

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private update(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const keyboardX = (this.isPressed("d") || this.isPressed("arrowright") ? 1 : 0) - (this.isPressed("a") || this.isPressed("arrowleft") ? 1 : 0);
    const keyboardZ = (this.isPressed("w") || this.isPressed("arrowup") ? 1 : 0) - (this.isPressed("s") || this.isPressed("arrowdown") ? 1 : 0);
    const edge = this.edgePanInput();
    const inputX = clamp(keyboardX + edge.x, -1, 1);
    const inputZ = clamp(keyboardZ + edge.z, -1, 1);
    const orthoHeight = (this.options.camera.orthoTop ?? 30) - (this.options.camera.orthoBottom ?? -30);
    const speed = orthoHeight * 1.35;

    this.velocityX = approach(this.velocityX, inputX * speed, dt * speed * 5);
    this.velocityZ = approach(this.velocityZ, inputZ * speed, dt * speed * 5);
    if (Math.abs(this.velocityX) < 0.01 && Math.abs(this.velocityZ) < 0.01) return;

    const target = this.options.camera.target;
    target.x += this.velocityX * dt;
    target.z += this.velocityZ * dt;
    clampCameraToMap(this.options.camera, this.options.artifact);
  }

  private panByScreenPixels(dx: number, dy: number): void {
    const orthoHeight = (this.options.camera.orthoTop ?? 30) - (this.options.camera.orthoBottom ?? -30);
    const worldPerPixel = orthoHeight / Math.max(1, this.options.canvas.clientHeight);
    const target = this.options.camera.target;
    target.x += dx * worldPerPixel;
    target.z += dy * worldPerPixel;
    this.options.camera.inertialPanningX = 0;
    this.options.camera.inertialPanningY = 0;
    clampCameraToMap(this.options.camera, this.options.artifact);
  }

  private rotateByScreenPixels(dx: number, dy: number): void {
    this.options.camera.alpha += dx * 0.006;
    this.options.camera.beta = clamp(this.options.camera.beta + dy * 0.004, MIN_BETA, MAX_BETA);
  }

  private edgePanInput(): { x: number; z: number } {
    if (!this.pointerInside || this.dragPointerId !== null) return { x: 0, z: 0 };
    const margin = 22;
    const width = this.options.canvas.clientWidth;
    const height = this.options.canvas.clientHeight;
    const x = this.pointerX <= margin ? -1 : this.pointerX >= width - margin ? 1 : 0;
    const z = this.pointerY <= margin ? 1 : this.pointerY >= height - margin ? -1 : 0;
    return { x, z };
  }

  private setOrthoHeight(height: number): void {
    const aspect = this.options.canvas.clientWidth / Math.max(1, this.options.canvas.clientHeight);
    this.options.camera.orthoTop = height / 2;
    this.options.camera.orthoBottom = -height / 2;
    this.options.camera.orthoRight = (height * aspect) / 2;
    this.options.camera.orthoLeft = (-height * aspect) / 2;
  }

  private zoomByFactor(factor: number): void {
    const currentHeight = (this.options.camera.orthoTop ?? 30) - (this.options.camera.orthoBottom ?? -30);
    this.setOrthoHeight(clamp(currentHeight * factor, MIN_ORTHO_HEIGHT, MAX_ORTHO_HEIGHT));
    clampCameraToMap(this.options.camera, this.options.artifact);
  }

  private resetRotation(): void {
    this.options.camera.alpha = DEFAULT_ALPHA;
    this.options.camera.beta = DEFAULT_BETA;
  }

  private isPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }
}

function approach(current: number, target: number, amount: number): number {
  if (current < target) return Math.min(target, current + amount);
  return Math.max(target, current - amount);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
