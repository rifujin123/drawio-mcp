import { BaseBuilder } from './base-builder.js';
import { ActivityDiagramInput, ActivityNode, ActivityFlow } from '../types/activity-diagram.js';
import {
  START_NODE_STYLE,
  END_NODE_STYLE,
  END_INNER_STYLE,
  ACTION_STYLE,
  DECISION_STYLE,
  FORK_STYLE,
  ACTIVITY_FLOW_STYLE,
  SWIMLANE_STYLE,
} from '../utils/styles.js';

// ─── Constants ──────────────────────────────────────────────────

const START_SIZE = 30;
const END_SIZE = 34;
const END_INNER_SIZE = 10;
const ACTION_W = 180;
const ACTION_H = 50;
const DECISION_W = 120;
const DECISION_H = 80;
const FORK_W = 300;
const FORK_H = 8;
const MERGE_W = 120;
const MERGE_H = 80;
const NODE_GAP_X = 40;
const NODE_GAP_Y = 30;
const LEVEL_HEIGHT = 90;    // ACTION_H + NODE_GAP_Y + extra margin
const MARGIN = 60;
const SWIMLANE_WIDTH = 260;
const SWIMLANE_HEADER_H = 40;
const BACKWARD_OFFSET_X = 30;
const BACKWARD_PADDING = 10;
const CANVAS_DEFAULT_W = 800;

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Topological sort via DFS with depth tracking.
 * Detects cycles (backward edges) via visiting-set.
 * Returns Map<nodeId, level> where level = longest-path depth from root.
 * Nodes not reachable from any root get level 0.
 */
function computeLevels(
  nodes: ActivityNode[],
  flows: ActivityFlow[],
): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const n of nodes) children.set(n.id, []);
  for (const f of flows) {
    if (f.from !== f.to) children.get(f.from)?.push(f.to);
  }

  const hasIncoming = new Set(flows.filter((f) => f.from !== f.to).map((f) => f.to));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);

  const level = new Map<string, number>();

  function dfs(id: string, depth: number, visiting: Set<string>): void {
    if (visiting.has(id)) return; // cycle → skip
    if (level.has(id) && level.get(id)! >= depth) return; // already deeper
    level.set(id, depth);
    visiting.add(id);
    for (const child of children.get(id) ?? []) {
      dfs(child, depth + 1, visiting);
    }
    visiting.delete(id);
  }

  for (const root of roots) {
    dfs(root, 0, new Set());
  }

  // Unvisited / disconnected nodes
  for (const n of nodes) {
    if (!level.has(n.id)) level.set(n.id, 0);
  }

  return level;
}

/**
 * Get the node dimensions based on type.
 */
function getNodeDimensions(node: ActivityNode): { w: number; h: number } {
  switch (node.type) {
    case 'start':
      return { w: START_SIZE, h: START_SIZE };
    case 'end':
      return { w: END_SIZE, h: END_SIZE };
    case 'decision':
      return { w: DECISION_W, h: DECISION_H };
    case 'merge':
      return { w: MERGE_W, h: MERGE_H };
    case 'fork':
    case 'join':
      return { w: FORK_W, h: FORK_H };
    default:
      return { w: ACTION_W, h: ACTION_H };
  }
}

/**
 * Builder for UML Activity Diagrams.
 *
 * Supports topological-layered layouts, swimlanes,
 * backward-edge waypoints, and bullseye end nodes.
 */
export class ActivityDiagramBuilder extends BaseBuilder {
  private nodeIds: Map<string, string> = new Map();
  private endInnerIds: Map<string, string> = new Map();
  private levels: Map<string, number> = new Map();
  private input: ActivityDiagramInput;

  constructor(input: ActivityDiagramInput) {
    super();
    this.input = input;
  }

  // ─── Build phase: create vertices only ────────────────────────

  build(): void {
    const { nodes } = this.input;

    for (const node of nodes) {
      const id = this.createNode(node);
      this.nodeIds.set(node.id, id);
    }

    // Note: edges are created in layout() after levels and positions are computed.
  }

  // ─── Layout phase: compute levels, position nodes, create edges ─

  layout(): void {
    const { nodes, flows, swimlanes } = this.input;
    const hasSwimlanes = (swimlanes ?? []).length > 0;

    // 1. Topological sort
    this.levels = computeLevels(nodes, flows);

    // 2. Position nodes
    if (hasSwimlanes) {
      this.layoutWithSwimlanes();
    } else {
      this.layoutSimple();
    }

    // 3. Create all flow edges (now we know positions and backward edges)
    this.createFlows(flows);
  }

  // ─── Layout strategies ────────────────────────────────────────

  private layoutSimple(): void {
    const { nodes } = this.input;

    // Group nodes by level
    const levelGroups = this.groupByLevel(nodes);

    // Sort levels
    const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

    // Calculate canvas width from widest level
    let canvasWidth = CANVAS_DEFAULT_W;
    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl)!;
      let rowW = 0;
      for (const node of group) {
        const { w } = getNodeDimensions(node);
        rowW += w + NODE_GAP_X;
      }
      rowW -= NODE_GAP_X; // last item has no trailing gap
      canvasWidth = Math.max(canvasWidth, rowW + MARGIN * 2);
    }

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl)!;
      const y = MARGIN + lvl * LEVEL_HEIGHT;

      // Calculate total width of this row
      let rowW = 0;
      for (const node of group) {
        const { w } = getNodeDimensions(node);
        rowW += w + NODE_GAP_X;
      }
      rowW -= NODE_GAP_X;

      const startX = (canvasWidth - rowW) / 2;
      let cursorX = startX;

      for (const node of group) {
        const { w, h } = getNodeDimensions(node);
        this.positionNode(node, cursorX, y, w, h);
        cursorX += w + NODE_GAP_X;
      }
    }
  }

  private layoutWithSwimlanes(): void {
    const { nodes, swimlanes } = this.input;

    // Build node → laneIndex mapping
    const laneIndex = new Map<string, number>();
    for (let i = 0; i < (swimlanes ?? []).length; i++) {
      for (const nodeId of swimlanes![i].nodes) {
        laneIndex.set(nodeId, i);
      }
    }

    // Group nodes by level
    const levelGroups = this.groupByLevel(nodes);
    const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl)!;

      for (const node of group) {
        const li = laneIndex.get(node.id) ?? 0;
        const { w, h } = getNodeDimensions(node);
        const x = MARGIN + li * SWIMLANE_WIDTH + (SWIMLANE_WIDTH - w) / 2;
        const y = MARGIN + SWIMLANE_HEADER_H + lvl * LEVEL_HEIGHT;
        this.positionNode(node, x, y, w, h);
      }
    }

    // Draw swimlane background rectangles
    const maxLevel = sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : 0;
    const laneHeight = MARGIN + SWIMLANE_HEADER_H + (maxLevel + 1) * LEVEL_HEIGHT + MARGIN;

    for (let i = 0; i < (swimlanes ?? []).length; i++) {
      const lane = swimlanes![i];
      const x = MARGIN + i * SWIMLANE_WIDTH;
      // Insert swimlane background at the right position in the cells array
      this.addVertex(lane.name, SWIMLANE_STYLE, x, MARGIN, SWIMLANE_WIDTH, laneHeight);
    }
  }

  // ─── Edge creation ─────────────────────────────────────────────

  private createFlows(flows: ActivityFlow[]): void {
    // Find rightmost node edge for backward routing
    let rightmostEdge = 0;
    for (const cell of this.cells) {
      if (cell.geometry && !cell.edge) {
        const right = cell.geometry.x + cell.geometry.width;
        if (right > rightmostEdge) rightmostEdge = right;
      }
    }

    for (const flow of flows) {
      const fromId = this.nodeIds.get(flow.from);
      const toId = this.nodeIds.get(flow.to);
      if (!fromId || !toId) continue;

      const fromCell = this.cells.find((c) => c.id === fromId);
      const toCell = this.cells.find((c) => c.id === toId);
      if (!fromCell?.geometry || !toCell?.geometry) continue;

      const fromLevel = this.levels.get(flow.from) ?? 0;
      const toLevel = this.levels.get(flow.to) ?? 0;
      const label = flow.label ?? '';

      if (flow.from === flow.to) {
        // ── Self-loop (U-turn around the node) ──
        const cx = fromCell.geometry.x + fromCell.geometry.width / 2;
        const cy = fromCell.geometry.y;
        const offset = 25;
        const loopWidth = 50;
        const loopHeight = 30;
        const waypoints = [
          { x: cx + offset, y: cy + fromCell.geometry.height / 2 },
          { x: cx + offset + loopWidth, y: cy + fromCell.geometry.height / 2 },
          { x: cx + offset + loopWidth, y: cy - loopHeight },
          { x: cx + offset, y: cy - loopHeight },
          { x: cx + offset, y: cy },
        ];
        this.addEdgeWithPoints(label, ACTIVITY_FLOW_STYLE, fromId, toId, waypoints);
      } else if (fromLevel > toLevel || (fromLevel === toLevel && this.isBackwardByPosition(fromCell, toCell))) {
        // Backward edge (loop) — route around right side
        const fromRight = fromCell.geometry.x + fromCell.geometry.width;
        const toX = toCell.geometry.x;
        const targetRight = rightmostEdge + BACKWARD_OFFSET_X + 20;

        const waypoints = [
          { x: fromRight, y: fromCell.geometry.y + fromCell.geometry.height / 2 },
          { x: targetRight, y: fromCell.geometry.y + fromCell.geometry.height / 2 },
          { x: targetRight, y: toCell.geometry.y - BACKWARD_PADDING },
          { x: toX - 5, y: toCell.geometry.y - BACKWARD_PADDING },
        ];
        this.addEdgeWithPoints(label, ACTIVITY_FLOW_STYLE, fromId, toId, waypoints);
      } else {
        // Normal forward edge
        this.addEdge(label, ACTIVITY_FLOW_STYLE, fromId, toId);
      }
    }
  }

  /**
   * Check if an edge is effectively backward based on position
   * (same approximate level but target is positioned above source).
   */
  private isBackwardByPosition(fromCell: any, toCell: any): boolean {
    if (!fromCell?.geometry || !toCell?.geometry) return false;
    return toCell.geometry.y + toCell.geometry.height / 2 < fromCell.geometry.y + fromCell.geometry.height / 2;
  }

  // ─── Node creation ─────────────────────────────────────────────

  private createNode(node: ActivityNode): string {
    switch (node.type) {
      case 'start':
        return this.addVertex('', START_NODE_STYLE, 0, 0, START_SIZE, START_SIZE);

      case 'end': {
        const outerId = this.addVertex('', END_NODE_STYLE, 0, 0, END_SIZE, END_SIZE);
        const innerId = this.addVertex('', END_INNER_STYLE, 0, 0, END_INNER_SIZE, END_INNER_SIZE);
        this.endInnerIds.set(node.id, innerId);
        return outerId;
      }
      case 'action':
        return this.addVertex(node.label ?? '', ACTION_STYLE, 0, 0, ACTION_W, ACTION_H);

      case 'decision':
        return this.addVertex(node.label ?? '', DECISION_STYLE, 0, 0, DECISION_W, DECISION_H);

      case 'merge':
        return this.addVertex(node.label ?? '', DECISION_STYLE, 0, 0, MERGE_W, MERGE_H);

      case 'fork':
      case 'join':
        return this.addVertex('', FORK_STYLE, 0, 0, FORK_W, FORK_H);

      default:
        return this.addVertex(node.label ?? '', ACTION_STYLE, 0, 0, ACTION_W, ACTION_H);
    }
  }

  // ─── Positioning ───────────────────────────────────────────────

  private positionNode(
    node: ActivityNode,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const id = this.nodeIds.get(node.id);
    if (!id) return;
    const cell = this.cells.find((c) => c.id === id);
    if (cell?.geometry) {
      cell.geometry.x = x;
      cell.geometry.y = y;
      cell.geometry.width = width;
      cell.geometry.height = height;
    }

    // Position end inner dot at center
    if (node.type === 'end') {
      const innerId = this.endInnerIds.get(node.id);
      if (innerId) {
        const innerCell = this.cells.find((c) => c.id === innerId);
        if (innerCell?.geometry) {
          innerCell.geometry.x = x + (width - END_INNER_SIZE) / 2;
          innerCell.geometry.y = y + (height - END_INNER_SIZE) / 2;
          innerCell.geometry.width = END_INNER_SIZE;
          innerCell.geometry.height = END_INNER_SIZE;
        }
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private groupByLevel(nodes: ActivityNode[]): Map<number, ActivityNode[]> {
    const groups = new Map<number, ActivityNode[]>();
    for (const node of nodes) {
      const lvl = this.levels.get(node.id) ?? 0;
      if (!groups.has(lvl)) groups.set(lvl, []);
      groups.get(lvl)!.push(node);
    }
    return groups;
  }
}
