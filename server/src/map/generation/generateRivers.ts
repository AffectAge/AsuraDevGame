import type { HexDirection, MapGenerationSettings, RiverSegment, TileEdge } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";
import { hashString, octaveNoise } from "./rng";

type DrainageNode = {
  tile: DraftTile;
  downstreamId: string | null;
  downstreamDir: HexDirection | null;
  priority: number;
  flow: number;
  strahler: number;
  children: string[];
};

export function generateRivers(
  tiles: DraftTile[],
  edgesByTileId: Record<string, TileEdge[]>,
  settings: MapGenerationSettings
): RiverSegment[] {
  if (!settings.rivers.enabled) return [];
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const drainage = buildDrainageGraph(tiles, edgesByTileId);
  const rivers: RiverSegment[] = [];
  if (drainage.size === 0) return rivers;

  accumulateFlow(drainage);
  const landCount = drainage.size;
  const threshold = Math.max(3, landCount * (0.032 - Math.min(0.85, settings.rivers.density) * 0.018));
  const visibleNodes = [...drainage.values()]
    .filter((node) => node.downstreamId !== null && node.downstreamDir !== null && node.flow >= threshold && node.tile.elevation > 0.5)
    .sort((a, b) => b.flow - a.flow || a.tile.id.localeCompare(b.tile.id));
  const maxRiverEdges = Math.max(8, Math.floor(landCount * Math.min(1, settings.rivers.density) * 0.12));

  for (const node of visibleNodes.slice(0, maxRiverEdges)) {
    const downstream = byId.get(node.downstreamId ?? "");
    if (!downstream || node.downstreamDir === null) continue;
    const id = `river_${rivers.length}`;
    const width = 0.025 + Math.sqrt(node.flow / landCount) * 0.28 + node.strahler * 0.008;
    node.tile.isRiver = true;
    downstream.isRiver = true;
    markRiverEdge(edgesByTileId, node.tile.id, downstream.id, node.downstreamDir, id);
    rivers.push({
      id,
      fromCorner: cornerId(node.tile.id, node.downstreamDir),
      toCorner: cornerId(node.tile.id, ((node.downstreamDir + 1) % 6) as HexDirection),
      leftTileId: node.tile.id,
      rightTileId: downstream.id,
      flow: Number(node.flow.toFixed(3)),
      strahler: node.strahler,
      width: Number(width.toFixed(4)),
      noiseSeed: hashString(`${settings.seed}:river:${node.tile.id}:${downstream.id}`)
    });
  }

  return rivers;
}

function buildDrainageGraph(tiles: DraftTile[], edgesByTileId: Record<string, TileEdge[]>): Map<string, DrainageNode> {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const drainage = new Map<string, DrainageNode>();
  const queue = new PriorityQueue<DrainageNode>();

  for (const tile of tiles) {
    if (tile.isWater) continue;
    const outletEdge = edgesByTileId[tile.id]?.find((edge) => edge.neighborId === null || byId.get(edge.neighborId)?.isWater);
    if (!outletEdge) continue;
    const node = createNode(tile, null, outletEdge.dir, 0);
    drainage.set(tile.id, node);
    queue.push(node, 0);
  }

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    for (const edge of edgesByTileId[current.tile.id] ?? []) {
      if (!edge.neighborId || drainage.has(edge.neighborId)) continue;
      const neighbor = byId.get(edge.neighborId);
      if (!neighbor || neighbor.isWater) continue;
      const upstreamDir = oppositeDirection(edge.dir);
      const noise = octaveNoise("river-drainage", neighbor.q * 0.4, neighbor.r * 0.4, 3);
      const elevationCost = Math.max(0.05, neighbor.elevation - current.tile.elevation + 0.12) * 5;
      const moistureBias = (1 - neighbor.moisture) * 0.9;
      const priority = current.priority + 1 + elevationCost + moistureBias + noise * 0.7;
      const node = createNode(neighbor, current.tile.id, upstreamDir, priority);
      drainage.set(neighbor.id, node);
      current.children.push(neighbor.id);
      queue.push(node, priority);
    }
  }

  return drainage;
}

function createNode(tile: DraftTile, downstreamId: string | null, downstreamDir: HexDirection | null, priority: number): DrainageNode {
  return {
    tile,
    downstreamId,
    downstreamDir,
    priority,
    flow: Math.max(0.25, tile.moisture + tile.elevation * 0.35),
    strahler: 1,
    children: []
  };
}

function accumulateFlow(drainage: Map<string, DrainageNode>): void {
  const nodes = [...drainage.values()].sort((a, b) => b.priority - a.priority);
  for (const node of nodes) {
    const childOrders = node.children.map((id) => drainage.get(id)?.strahler ?? 1);
    if (childOrders.length > 0) {
      const maxOrder = Math.max(...childOrders);
      const maxOrderCount = childOrders.filter((order) => order === maxOrder).length;
      node.strahler = maxOrderCount >= 2 ? maxOrder + 1 : maxOrder;
    }
    if (node.downstreamId) {
      const downstream = drainage.get(node.downstreamId);
      if (downstream) downstream.flow += node.flow;
    }
  }
}

function markRiverEdge(edgesByTileId: Record<string, TileEdge[]>, tileId: string, neighborId: string, dir: HexDirection, riverId: string): void {
  const edge = edgesByTileId[tileId]?.find((candidate) => candidate.dir === dir);
  if (edge) edge.riverId = riverId;
  const opposite = edgesByTileId[neighborId]?.find((candidate) => candidate.neighborId === tileId);
  if (opposite) opposite.riverId = riverId;
}

function cornerId(tileId: string, corner: HexDirection): string {
  return `${tileId}:c${corner}`;
}

function oppositeDirection(dir: HexDirection): HexDirection {
  return ((dir + 3) % 6) as HexDirection;
}

class PriorityQueue<T> {
  private readonly items: { value: T; priority: number }[] = [];

  get length(): number {
    return this.items.length;
  }

  push(value: T, priority: number): void {
    this.items.push({ value, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const first = this.items[0].value;
    const last = this.items.pop();
    if (last && this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= this.items[index].priority) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}
