import type { MapTile } from "../../../../shared/src/map";

export type DraftTile = MapTile & {
  landRegionKey?: string;
};
