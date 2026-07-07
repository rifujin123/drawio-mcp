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
const FORK_W = 150;
const FORK_H = 8;
const MERGE_W = 120;
const MERGE_H = 80;
const NODE_GAP_X = 50;
const NODE_GAP_Y = 30;
const LEVEL_HEIGHT = 100;
const MARGIN = 60;
const SWIMLANE_PADDING = 20;
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
 * Estimate pixel width of text at 12pt Helvetica (~6.5px per char).
 */
function estimateTextWidth(text: string): number {
  return text.length * 6.5 + 20; // +20 for inner padding
}

/**
 * Get effective node width: max of type's default width and label text width.
 * Capped at 350px to avoid absurdly wide nodes.
 */
function getEffectiveNodeWidth(node: ActivityNode): number {
  const dims = getNodeDimensions(node);
  if (!node.label) return dims.w;
  const textW = estimateTextWidth(node.label);
  return Math.max(dims.w, Math.min(textW, 350));
}

/**
 * Get effective node height (delegates to type-based, no text scaling for now).
 */
function getEffectiveNodeHeight(node: ActivityNode): number {
  return getNodeDimensions(node).h;
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

    // Calculate canvas width from widest level (using effective width)
    let canvasWidth = CANVAS_DEFAULT_W;
    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl)!;
      let rowW = 0;
      for (const node of group) {
        rowW += getEffectiveNodeWidth(node) + NODE_GAP_X;
      }
      rowW -= NODE_GAP_X;
      canvasWidth = Math.max(canvasWidth, rowW + MARGIN * 2);
    }

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl)!;
      const y = MARGIN + lvl * LEVEL_HEIGHT;

      // Calculate total width of this row (using effective width)
      let rowW = 0;
      for (const node of group) {
        rowW += getEffectiveNodeWidth(node) + NODE_GAP_X;
      }
      rowW -= NODE_GAP_X;

      const startX = (canvasWidth - rowW) / 2;
      let cursorX = startX;

      for (const node of group) {
        const w = getEffectiveNodeWidth(node);
        const h = getEffectiveNodeHeight(node);
        this.positionNode(node, cursorX, y, w, h);
        cursorX += w + NODE_GAP_X;
      }
    }
  }

  private layoutWithSwimlanes(): void {
    const { nodes, swimlanes, flows } = this.input;

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

    const numLanes = (swimlanes ?? []).length;

    // ── Step 1: Calculate lane widths considering parallel nodes ──
    // For each (lane, level) group, calculate total width needed for all parallel nodes side-by-side.
    const laneLevelWidths = new Map<string, number>(); // key = "li:level"
    for (const lvl of sortedLevels) {
      const grp = levelGroups.get(lvl)!;
      // Group by lane
      const byLane = new Map<number, typeof grp>();
      for (const node of grp) {
        const li = laneIndex.get(node.id) ?? 0;
        if (!byLane.has(li)) byLane.set(li, []);
        byLane.get(li)!.push(node);
      }
      for (const [li, laneNodes] of byLane) {
        let totalW = 0;
        for (const n of laneNodes) totalW += getEffectiveNodeWidth(n);
        totalW += (laneNodes.length - 1) * NODE_GAP_X;
        laneLevelWidths.set(`${li}:${lvl}`, totalW);
      }
    }

    // Lane width = max(level width for this lane, fork/join min width)
    const laneWidths = new Array<number>(numLanes).fill(0);
    for (let i = 0; i < numLanes; i++) {
      for (const [key, w] of laneLevelWidths) {
        if (key.startsWith(`${i}:`)) {
          laneWidths[i] = Math.max(laneWidths[i], w);
        }
      }
      laneWidths[i] = Math.max(laneWidths[i], FORK_W + SWIMLANE_PADDING * 2);
    }

    // ── Step 2: Collect fork/join IDs for centering (fixed FORK_W) ──
    const forkJoinIds = new Set<string>();
    for (const node of nodes) {
      if (node.type === 'fork' || node.type === 'join') forkJoinIds.add(node.id);
    }

    // ── Step 3: Position nodes ──
    for (const lvl of sortedLevels) {
      const grp = levelGroups.get(lvl)!;
      const y = MARGIN + SWIMLANE_HEADER_H + lvl * LEVEL_HEIGHT;

      // Group by lane
      const byLane = new Map<number, typeof grp>();
      for (const node of grp) {
        const li = laneIndex.get(node.id) ?? 0;
        if (!byLane.has(li)) byLane.set(li, []);
        byLane.get(li)!.push(node);
      }

      for (const [li, laneNodes] of byLane) {
        // Compute lane start X
        let laneStartX = MARGIN;
        for (let j = 0; j < li; j++) laneStartX += laneWidths[j];

        if (laneNodes.length === 1) {
          // Single node — center in lane
          const node = laneNodes[0];
          const w = getEffectiveNodeWidth(node);
          const h = getEffectiveNodeHeight(node);
          const x = laneStartX + (laneWidths[li] - w) / 2;
          this.positionNode(node, x, y, w, h);
        } else {
          // Multiple parallel nodes — distribute horizontally with gaps
          let totalW = 0;
          for (const node of laneNodes) totalW += getEffectiveNodeWidth(node);
          totalW += (laneNodes.length - 1) * NODE_GAP_X;

          let cursorX = laneStartX + (laneWidths[li] - totalW) / 2;
          for (const node of laneNodes) {
            const w = getEffectiveNodeWidth(node);
            const h = getEffectiveNodeHeight(node);
            this.positionNode(node, cursorX, y, w, h);
            cursorX += w + NODE_GAP_X;
          }
        }
      }
    }

    // ── Step 4: Center fork/join bars in their lanes (fixed FORK_W, not spanning) ──
    for (const id of forkJoinIds) {
      const cell = this.cells.find((c) => c.id === this.nodeIds.get(id));
      if (!cell?.geometry) continue;
      const li = laneIndex.get(id) ?? 0;
      let laneStartX = MARGIN;
      for (let j = 0; j < li; j++) laneStartX += laneWidths[j];
      cell.geometry.x = laneStartX + (laneWidths[li] - FORK_W) / 2;
      cell.geometry.width = FORK_W;
      cell.geometry.height = FORK_H;
    }

    // ── Step 5: Draw swimlane background rectangles ──
    const maxLevel = sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : 0;
    const laneHeight = MARGIN + SWIMLANE_HEADER_H + (maxLevel + 1) * LEVEL_HEIGHT + MARGIN;

    let cursorX = MARGIN;
    for (let i = 0; i < (swimlanes ?? []).length; i++) {
      const lane = swimlanes![i];
      this.addVertex(lane.name, SWIMLANE_STYLE, cursorX, MARGIN, laneWidths[i], laneHeight);
      cursorX += laneWidths[i];
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

    // Track branch count per decision node for side routing
    const decisionBranch = new Map<string, number>();

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

      // Find source node type from input
      const fromNode = this.input.nodes.find((n) => n.id === flow.from);

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
      } else if (fromNode && (fromNode.type === 'decision' || fromNode.type === 'merge')) {
        // ── Decision/Merge node: route branches from sides ──
        const branch = decisionBranch.get(flow.from) ?? 0;
        decisionBranch.set(flow.from, branch + 1);

        const cx = fromCell.geometry.x + fromCell.geometry.width / 2;
        const cy = fromCell.geometry.y + fromCell.geometry.height / 2;
        const sideGap = 50;
        const targetY = toCell.geometry.y;
        const targetCX = toCell.geometry.x + toCell.geometry.width / 2;

        if (branch === 0) {
          // First branch: exit from right side → right → down → target center
          const exitX = fromCell.geometry.x! + fromCell.geometry.width!;
          const turnX = Math.max(exitX + sideGap, targetCX + sideGap);
          this.addEdgeWithPoints(label, ACTIVITY_FLOW_STYLE, fromId, toId, [
            { x: exitX, y: cy },
            { x: turnX, y: cy },
            { x: turnX, y: targetY },
            { x: targetCX, y: targetY },
          ]);
        } else {
          // Second branch: exit from left side → left → down → target center
          const exitX = fromCell.geometry.x!;
          const turnX = Math.min(exitX - sideGap, targetCX - sideGap);
          this.addEdgeWithPoints(label, ACTIVITY_FLOW_STYLE, fromId, toId, [
            { x: exitX, y: cy },
            { x: turnX, y: cy },
            { x: turnX, y: targetY },
            { x: targetCX, y: targetY },
          ]);
        }
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
