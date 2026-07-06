import { BaseBuilder } from './base-builder.js';
import { SequenceDiagramInput, Participant, Message } from '../types/sequence-diagram.js';
import {
  PARTICIPANT_STYLE,
  ACTOR_PARTICIPANT_STYLE,
  BOUNDARY_STYLE,
  CONTROL_STYLE,
  ENTITY_STYLE,
  LIFELINE_STYLE,
  ACTIVATION_STYLE,
  SYNC_MESSAGE_STYLE,
  ASYNC_MESSAGE_STYLE,
  RETURN_MESSAGE_STYLE,
  CREATE_MESSAGE_STYLE,
  DESTROY_MESSAGE_STYLE,
  FRAGMENT_STYLE,
} from '../utils/styles.js';

const PARTICIPANT_W = 140;
const PARTICIPANT_H = 50;
const MESSAGE_Y_GAP = 60;
const MARGIN = 60;
const PARTICIPANT_GAP = 100;
const ACTIVATION_W = 16;
const ACTIVATION_PAD = 10;
const FIRST_MESSAGE_OFFSET = 40;
const LIFELINE_EXTRA = 2;

/**
 * Builder for UML Sequence Diagrams.
 *
 * Participants across top, messages flowing downward chronologically.
 * Supports self-loops, activation bars, and all message types.
 */
export class SequenceDiagramBuilder extends BaseBuilder {
  private participantIds: Map<string, string> = new Map();
  private participantX: Map<string, number> = new Map();
  private participantIndex: Map<string, number> = new Map();
  private lifelineBottomIds: Map<string, string> = new Map();

  constructor(private input: SequenceDiagramInput) {
    super();
  }

  /**
   * Phase 1: Create participant header boxes and lifeline structures.
   * Message edges and activation bars are created in layout() (Phase 2)
   * when X positions are known.
   */
  build(): void {
    const { participants } = this.input;

    for (const p of participants) {
      const style = this.getParticipantStyle(p);
      const id = this.addVertex(p.name, style, 0, 0, PARTICIPANT_W, PARTICIPANT_H);
      this.participantIds.set(p.name, id);
    }

    // Create lifeline bottom anchors + dashed edges from each participant header
    for (const p of participants) {
      const headerId = this.participantIds.get(p.name);
      if (!headerId) continue;

      const bottomId = this.addVertex(
        '',
        'fillColor=none;strokeColor=none;pointerEvents=0;',
        0, 0, 1, 1,
      );
      this.lifelineBottomIds.set(p.name, bottomId);
      this.addEdge('', LIFELINE_STYLE, headerId, bottomId);
    }
  }

  /**
   * Phase 2: Position all elements, create message edges and activation bars.
   */
  layout(): void {
    const { participants, messages } = this.input;
    const count = participants.length;
    const sortedMessages = [...messages].sort((a, b) => a.order - b.order);

    // ── Calculate X positions ──
    const totalContentWidth = count * PARTICIPANT_W + (count - 1) * PARTICIPANT_GAP;
    const canvasWidth = Math.max(totalContentWidth + MARGIN * 2, 800);
    const startX = MARGIN + (canvasWidth - MARGIN * 2 - totalContentWidth) / 2;

    // ── Position participant headers ──
    participants.forEach((p, i) => {
      const id = this.participantIds.get(p.name);
      if (!id) return;

      const x = startX + i * (PARTICIPANT_W + PARTICIPANT_GAP);
      this.participantX.set(p.name, x + PARTICIPANT_W / 2);
      this.participantIndex.set(p.name, i);

      const cell = this.cells.find((c) => c.id === id);
      if (cell?.geometry) {
        cell.geometry.x = x;
        cell.geometry.y = MARGIN;
        cell.geometry.width = PARTICIPANT_W;
        cell.geometry.height = PARTICIPANT_H;
      }
    });

    // ── Calculate Y positions for messages ──
    const firstMessageY = MARGIN + PARTICIPANT_H + FIRST_MESSAGE_OFFSET;

    // ── Position lifeline bottoms ──
    const lastMsgIdx = sortedMessages.length - 1;
    const bottomY = firstMessageY + (lastMsgIdx + LIFELINE_EXTRA) * MESSAGE_Y_GAP;

    for (const p of participants) {
      const bottomId = this.lifelineBottomIds.get(p.name);
      if (!bottomId) continue;
      const cx = this.participantX.get(p.name) ?? 0;
      const cell = this.cells.find((c) => c.id === bottomId);
      if (cell?.geometry) {
        cell.geometry.x = cx - 0.5;
        cell.geometry.y = bottomY;
        cell.geometry.width = 1;
        cell.geometry.height = 1;
      }
    }

    // ── Track activation ranges per participant ──
    // first/last are indices into sortedMessages
    const activationRanges = new Map<string, { first: number; last: number }>();

    // ── Create messages ──
    sortedMessages.forEach((msg, i) => {
      const y = firstMessageY + i * MESSAGE_Y_GAP;

      const fromX = this.participantX.get(msg.from);
      const toX = this.participantX.get(msg.to);
      if (!fromX || !toX) return;

      const style = this.getMessageStyle(msg.type ?? 'synchronous');
      const label = msg.label;

      // Update activation ranges for both participants
      for (const name of [msg.from, msg.to]) {
        const range = activationRanges.get(name) ?? { first: i, last: i };
        if (i < range.first) range.first = i;
        if (i > range.last) range.last = i;
        activationRanges.set(name, range);
      }

      if (msg.from === msg.to) {
        // ── Self-loop message (e.g. "Recuperar Senha") ──
        const headerId = this.participantIds.get(msg.from);
        if (headerId) {
          this.createSelfLoop(msg.label, style, headerId, y, fromX);
        }
      } else {
        // ── Normal message between two participants ──
        // Create invisible anchor vertices at message Y position,
        // then connect them with an edge for exact horizontal routing.
        const fromAnchor = this.addVertex(
          '', 'fillColor=none;strokeColor=none;pointerEvents=0;',
          fromX - 2, y, 4, 4,
        );
        const toAnchor = this.addVertex(
          '', 'fillColor=none;strokeColor=none;pointerEvents=0;',
          toX - 2, y, 4, 4,
        );
        this.addEdge(label, style, fromAnchor, toAnchor);
      }
    });

    // ── Create activation bars ──
    for (const [name, range] of activationRanges) {
      // Actor type participants usually don't have activation bars in UML
      const participant = this.input.participants.find((p) => p.name === name);
      if (participant?.type === 'actor') continue;

      const cx = this.participantX.get(name);
      if (!cx) continue;

      const startY = firstMessageY + range.first * MESSAGE_Y_GAP - ACTIVATION_PAD;
      const endY = firstMessageY + range.last * MESSAGE_Y_GAP + ACTIVATION_PAD;
      const height = Math.max(endY - startY, ACTIVATION_PAD * 2);

      this.addVertex('', ACTIVATION_STYLE, cx - ACTIVATION_W / 2, startY, ACTIVATION_W, height);
    }
  }

  /**
   * Create a self-loop (self-call) message.
   * Draws a U-shaped edge from a participant header back to itself
   * using waypoints to form the loop shape to the right of the lifeline.
   */
  private createSelfLoop(
    label: string,
    style: string,
    headerId: string,
    y: number,
    cx: number,
  ): void {
    const offset = 25;       // distance from lifeline center to start of loop
    const loopWidth = 50;    // horizontal width of the loop
    const loopHeight = 20;   // vertical height of the loop arm

    const waypoints = [
      { x: cx + offset, y },
      { x: cx + offset + loopWidth, y },
      { x: cx + offset + loopWidth, y: y + loopHeight },
      { x: cx + offset, y: y + loopHeight },
    ];

    this.addEdgeWithPoints(label, style, headerId, headerId, waypoints);
  }

  private getParticipantStyle(p: Participant): string {
    switch (p.type) {
      case 'actor':     return ACTOR_PARTICIPANT_STYLE;
      case 'boundary':  return BOUNDARY_STYLE;
      case 'control':   return CONTROL_STYLE;
      case 'entity':    return ENTITY_STYLE;
      default:          return PARTICIPANT_STYLE;
    }
  }

  private getMessageStyle(type: string): string {
    switch (type) {
      case 'synchronous':   return SYNC_MESSAGE_STYLE;
      case 'asynchronous':  return ASYNC_MESSAGE_STYLE;
      case 'return':        return RETURN_MESSAGE_STYLE;
      case 'create':        return CREATE_MESSAGE_STYLE;
      case 'destroy':       return DESTROY_MESSAGE_STYLE;
      default:              return SYNC_MESSAGE_STYLE;
    }
  }
}
