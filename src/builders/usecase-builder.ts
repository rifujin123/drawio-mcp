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
const BOUNDARY_PADDING = 30;

/**
 * Builder for UML Use Case Diagrams.
 * Layout: Actors on the left, use cases on the right inside system boundary.
 */
export class UseCaseDiagramBuilder extends BaseBuilder {
  private actorIds: Map<string, string> = new Map();
  private useCaseIds: Map<string, string> = new Map();
  private boundaryId: string | null = null;

  // Computed layout dimensions
  private diagramWidth = 800;
  private diagramHeight = 600;

  constructor(private input: UseCaseDiagramInput) {
    super();
  }

  build(): void {
    // Create actors
    this.input.actors.forEach((actor, i) => {
      const id = this.addVertex(
        `${actor.name}`,
        ACTOR_STYLE,
        0, 0,
        ACTOR_WIDTH,
        ACTOR_HEIGHT,
      );
      this.actorIds.set(actor.name, id);
    });

    // Create use cases
    this.input.useCases.forEach((uc, i) => {
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
  }

  layout(): void {
    const numActors = this.input.actors.length;
    const numUCs = this.input.useCases.length;

    // Calculate dimensions
    const ucColWidth = USECASE_WIDTH;
    const totalWidth = USECASE_COL_X + ucColWidth + MARGIN;

    // Layout actors vertically
    const actorTotalHeight = numActors * ACTOR_HEIGHT + (numActors - 1) * GAP_Y;
    const ucTotalHeight = numUCs * USECASE_HEIGHT + (numUCs - 1) * GAP_Y;
    const contentHeight = Math.max(actorTotalHeight, ucTotalHeight);
    const totalHeight = contentHeight + 2 * MARGIN;

    this.diagramWidth = Math.max(totalWidth, 800);
    this.diagramHeight = Math.max(totalHeight, 400);

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

    // Position use cases
    const ucStartY = MARGIN + Math.max(0, (contentHeight - ucTotalHeight) / 2);
    this.input.useCases.forEach((uc, i) => {
      const id = this.useCaseIds.get(uc.id);
      if (!id) return;
      const cell = this.cells.find((c) => c.id === id);
      if (cell?.geometry) {
        cell.geometry.x = USECASE_COL_X;
        cell.geometry.y = ucStartY + i * (USECASE_HEIGHT + GAP_Y);
        cell.geometry.width = USECASE_WIDTH;
        cell.geometry.height = USECASE_HEIGHT;
      }
    });

    // Position system boundary (encloses use cases)
    if (this.boundaryId) {
      const cell = this.cells.find((c) => c.id === this.boundaryId);
      if (cell?.geometry) {
        cell.geometry.x = USECASE_COL_X - BOUNDARY_PADDING;
        cell.geometry.y = MARGIN - BOUNDARY_PADDING;
        cell.geometry.width = USECASE_WIDTH + BOUNDARY_PADDING * 2;
        cell.geometry.height = contentHeight + BOUNDARY_PADDING * 2;
      }
    }
  }
}
