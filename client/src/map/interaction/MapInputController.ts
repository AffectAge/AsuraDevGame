import type { Nullable, Observer } from "@babylonjs/core";
import type { PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { findRoute } from "../../../../shared/src/map";
import type { MapLookup } from "../data/mapLookup";
import { pickHexFromPointer } from "../hex/picking";
import type { RoutePreviewLayer } from "../render/RoutePreviewLayer";
import type { HoverController } from "./HoverController";
import type { SelectionController } from "./SelectionController";

type MapInputControllerOptions = {
  scene: Scene;
  artifact: GeneratedMapArtifact;
  lookup: MapLookup;
  hover: HoverController;
  selection: SelectionController;
  routePreview: RoutePreviewLayer;
};

export class MapInputController {
  private readonly pointerObserver: Nullable<Observer<PointerInfo>>;

  constructor(private readonly options: MapInputControllerOptions) {
    this.pointerObserver = options.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) this.updateHover();
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) this.selectCurrentTile();
    });
  }

  dispose(): void {
    if (this.pointerObserver) {
      this.options.scene.onPointerObservable.remove(this.pointerObserver);
    }
  }

  private updateHover(): void {
    const tile = pickHexFromPointer(this.options.scene, this.options.artifact, this.options.lookup);
    this.options.hover.setHover(tile);
    this.updateRoutePreview();
  }

  private selectCurrentTile(): void {
    const tile = this.options.hover.current ?? pickHexFromPointer(this.options.scene, this.options.artifact, this.options.lookup);
    this.options.selection.select(tile);
    this.updateRoutePreview();
  }

  private updateRoutePreview(): void {
    const selected = this.options.selection.current;
    const hovered = this.options.hover.current;
    if (!selected || !hovered || selected.id === hovered.id) {
      this.options.routePreview.clear();
      return;
    }
    const route = findRoute(this.options.artifact, selected.id, hovered.id);
    this.options.routePreview.setRoute(route?.tileIds ?? []);
  }
}
