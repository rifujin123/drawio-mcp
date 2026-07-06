import { BaseBuilder } from './base-builder.js';
import { UseCaseDiagramInput } from '../types/usecase-diagram.js';
import {
  ACTOR_STYLE,
  USECASE_STYLE,
  SYSTEM_BOUNDARY_STYLE,
  USECASE_ASSOCIATION_STYLE,
  INCLUDE_STYLE,
  EXTEND_STYLE,
  USECASE_GENERALIZATION_STYLE,
  ACTOR_GENERALIZATION_STYLE,
} from '../utils/styles.js';
import {
  ACTOR_WIDTH,
  ACTOR_HEIGHT,
  USECASE_WIDTH,
  USECASE_HEIGHT,
} from '../utils/layout.js';

const MARGIN = 60;
const GAP_X = 80;
const GAP_Y = 40;
const ACTOR_COL_X = MARGIN;
const USECASE_COL_X = MARGIN + ACTOR_WIDTH + GAP_X * 2;
const BOUNDARY_PADDING = 25;
const UC_GRID_GAP_X = 40;
const UC_GRID_COLS = 2;

/**
 * UML Use Case Diagram Builder — proper UML notation.
 * - Actors: stick figure (shape=umlActor) on left
 * - Use cases: white ellipses on right inside system boundary
 * - Supports include/extend/generalization + actor generalization
 */
export class UseCaseDiagramBuilder extends BaseBuilder {
  private actorIds: Map<string, string> = new Map();
  private useCaseIds: Map<string, string> = new Map();
  private boundaryId: string | null = null;

  constructor(private input: UseCaseDiagramInput) {
    super();
  }

  build(): void {
    // Create actors
    this.input.actors.forEach((actor) => {
      const id = this.addVertex(
        actor.name,
        ACTOR_STYLE,
        0, 0,
        ACTOR_WIDTH,
        ACTOR_HEIGHT,
      );
      this.actorIds.set(actor.name, id);
    });

    // Create use cases
    this.input.useCases.forEach((uc) => {
      const id = this.addVertex(
        uc.name,
        USECASE_STYLE,
        0, 0,
        USECASE_WIDTH,
        USECASE_HEIGHT,
      );
      this.useCaseIds.set(uc.id, id);
    });

    // Create system boundary
    const sysName = this.input.systemBoundary?.name ?? this.input.systemName ?? 'System';
    this.boundaryId = this.addVertex(
      sysName,
      SYSTEM_BOUNDARY_STYLE,
      0, 0, 1, 1,
    );

    // Create associations (actor ↔ use case)
    for (const assoc of this.input.associations ?? []) {
      const fromId = this.actorIds.get(assoc.actor);
      const toId = this.useCaseIds.get(assoc.useCase);
      if (fromId && toId) {
        this.addEdge('', USECASE_ASSOCIATION_STYLE, fromId, toId);
      }
    }

    // Create relationships (include/extend/generalization between use cases)
    for (const rel of this.input.relationships ?? []) {
      const fromId = this.useCaseIds.get(rel.from);
      const toId = this.useCaseIds.get(rel.to);
      if (!fromId || !toId) continue;

      let style: string;
      let label: string;
      switch (rel.type) {
        case 'include':
          style = INCLUDE_STYLE;
          label = '«include»';
          break;
        case 'extend':
          style = EXTEND_STYLE;
          label = '«extend»';
          break;
        case 'generalization':
          style = USECASE_GENERALIZATION_STYLE;
          label = '';
          break;
        default:
          style = USECASE_ASSOCIATION_STYLE;
          label = '';
      }
      this.addEdge(label, style, fromId, toId);
    }

    // Create actor generalizations (child → parent)
    for (const rel of this.input.actorRelationships ?? []) {
      const fromId = this.actorIds.get(rel.from);
      const toId = this.actorIds.get(rel.to);
      if (fromId && toId) {
        this.addEdge('', ACTOR_GENERALIZATION_STYLE, fromId, toId);
      }
    }
  }

  layout(): void {
    const numActors = this.input.actors.length;
    const numUCs = this.input.useCases.length;

    // Calculate dimensions
    const actorTotalHeight = numActors * ACTOR_HEIGHT + (numActors - 1) * GAP_Y;

    // Use cases: single column or 2-column grid
    const ucCols = (numUCs > 6) ? UC_GRID_COLS : 1;
    const ucRows = ucCols === 1 ? numUCs : Math.ceil(numUCs / UC_GRID_COLS);
    const ucTotalWidth = ucCols === 1
      ? USECASE_WIDTH
      : UC_GRID_COLS * USECASE_WIDTH + (UC_GRID_COLS - 1) * UC_GRID_GAP_X;
    const ucTotalHeight = ucRows * USECASE_HEIGHT + (ucRows - 1) * GAP_Y;

    const contentHeight = Math.max(actorTotalHeight, ucTotalHeight);
    const totalWidth = USECASE_COL_X + ucTotalWidth + MARGIN;
    const totalHeight = contentHeight + 2 * MARGIN;

    // Position actors (vertically centered relative to content)
    const actorStartY = MARGIN + Math.max(0, (contentHeight - actorTotalHeight) / 2);
    this.input.actors.forEach((actor, i) => {
      const id = this.actorIds.get(actor.name);
      if (!id) return;
      const cell = this.cells.find((c) => c.id === id);
      if (cell?.geometry) {
        cell.geometry.x = ACTOR_COL_X;
        cell.geometry.y = actorStartY + i * (ACTOR_HEIGHT + GAP_Y);
        cell.geometry.width = ACTOR_WIDTH;
        cell.geometry.height = ACTOR_HEIGHT;
      }
    });

    // Position use cases (single column or grid)
    const ucStartY = MARGIN + Math.max(0, (contentHeight - ucTotalHeight) / 2);
    this.input.useCases.forEach((uc, i) => {
      const id = this.useCaseIds.get(uc.id);
      if (!id) return;
      const cell = this.cells.find((c) => c.id === id);
      if (!cell?.geometry) return;

      if (ucCols === 1) {
        cell.geometry.x = USECASE_COL_X;
        cell.geometry.y = ucStartY + i * (USECASE_HEIGHT + GAP_Y);
      } else {
        const col = i % UC_GRID_COLS;
        const row = Math.floor(i / UC_GRID_COLS);
        cell.geometry.x = USECASE_COL_X + col * (USECASE_WIDTH + UC_GRID_GAP_X);
        cell.geometry.y = ucStartY + row * (USECASE_HEIGHT + GAP_Y);
      }
      cell.geometry.width = USECASE_WIDTH;
      cell.geometry.height = USECASE_HEIGHT;
    });

    // Position system boundary (encloses use cases)
    if (this.boundaryId) {
      const cell = this.cells.find((c) => c.id === this.boundaryId);
      if (cell?.geometry) {
        const ucAreaWidth = ucTotalWidth + BOUNDARY_PADDING * 2;
        const ucAreaHeight = ucTotalHeight + BOUNDARY_PADDING * 2;
        cell.geometry.x = USECASE_COL_X - BOUNDARY_PADDING;
        cell.geometry.y = ucStartY - BOUNDARY_PADDING;
        cell.geometry.width = ucAreaWidth;
        cell.geometry.height = ucAreaHeight;
      }
    }
  }
}
