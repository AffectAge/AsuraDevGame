import type { MapTile } from "../../../../shared/src/map";
import type { HighlightLayer } from "../render/HighlightLayer";

export class SelectionController {
  private selected: MapTile | null = null;

  constructor(
    private readonly highlight: HighlightLayer,
    private readonly onSelect: (tile: MapTile | null) => void
  ) {}

  select(tile: MapTile | null): void {
    this.selected = tile;
    this.highlight.setSelected(tile);
    this.onSelect(tile);
  }

  get current(): MapTile | null {
    return this.selected;
  }
}
