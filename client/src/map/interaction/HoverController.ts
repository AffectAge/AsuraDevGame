import type { MapTile } from "../../../../shared/src/map";
import type { HighlightLayer } from "../render/HighlightLayer";

export class HoverController {
  private hovered: MapTile | null = null;

  constructor(
    private readonly highlight: HighlightLayer,
    private readonly onHover: (tile: MapTile | null) => void
  ) {}

  setHover(tile: MapTile | null): void {
    if (tile?.id === this.hovered?.id) return;
    this.hovered = tile;
    this.highlight.setHover(tile);
    this.onHover(tile);
  }

  get current(): MapTile | null {
    return this.hovered;
  }
}
