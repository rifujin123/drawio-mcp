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

const PARTICIPANT_W = 90;
const PARTICIPANT_H = 55;
const ACTOR_W = 40;
const ACTOR_H = 60;
const MESSAGE_Y_GAP = 60;
const MARGIN = 60;
const PARTICIPANT_GAP = 100;
const ACTIVATION_W = 16;
const ACTIVATION_PAD = 10;
const FIRST_MESSAGE_OFFSET = 40;
const LIFELINE_EXTRA = 2;
const FRAGMENT_PAD = 12;
const FRAGMENT_TAB_W = 55;
const FRAGMENT_TAB_H = 22;

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
      const pw = this.getParticipantWidth(p);
      const ph = this.getParticipantHeight(p);
      const id = this.addVertex(p.name, style, 0, 0, pw, ph);
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

  private getParticipantWidth(p: Participant): number {
    return p.type === 'actor' ? ACTOR_W : PARTICIPANT_W;
  }
  private getParticipantHeight(p: Participant): number {
    return p.type === 'actor' ? ACTOR_H : PARTICIPANT_H;
  }

  /**
   * Phase 2: Position all elements, create message edges and activation bars.
   */
  layout(): void {
    const { participants, messages } = this.input;
    const count = participants.length;
    const sortedMessages = [...messages].sort((a, b) => a.order - b.order);

    // ── Calculate X positions ──
    let totalContentWidth = 0;
    for (let i = 0; i < count; i++) {
      totalContentWidth += this.getParticipantWidth(participants[i]);
      if (i < count - 1) totalContentWidth += PARTICIPANT_GAP;
    }
    const canvasWidth = Math.max(totalContentWidth + MARGIN * 2, 800);
    let cursorX = MARGIN + (canvasWidth - MARGIN * 2 - totalContentWidth) / 2;

    // ── Position participant headers ──
    participants.forEach((p, i) => {
      const id = this.participantIds.get(p.name);
      if (!id) return;

      const pw = this.getParticipantWidth(p);
      const ph = this.getParticipantHeight(p);
      const x = cursorX;
      this.participantX.set(p.name, x + pw / 2);
      this.participantIndex.set(p.name, i);
      cursorX += pw + PARTICIPANT_GAP;

      const cell = this.cells.find((c) => c.id === id);
      if (cell?.geometry) {
        cell.geometry.x = x;
        cell.geometry.y = MARGIN;
        cell.geometry.width = pw;
        cell.geometry.height = ph;
      }
    });

    // Calculate Y positions for messages
    const maxPH = Math.max(...participants.map(p => this.getParticipantHeight(p)));
    const firstMessageY = MARGIN + maxPH + FIRST_MESSAGE_OFFSET;

    // Position lifeline bottoms
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

    // Activation segments per participant (stack-based)
    interface ActivationSegment {
      startMsgIdx: number;
      endMsgIdx: number;
      depth: number;
    }
    // Receiving sync/create = push. Sending return = pop.
    // Depth tracks nesting level for bar width.
    const activationSegments = new Map<string, ActivationSegment[]>();
    for (const p of participants) {
      if (p.type === 'actor') continue;
      const stack: number[] = [];
      const segments: ActivationSegment[] = [];
      sortedMessages.forEach((msg, i) => {
        if (msg.to === p.name && msg.from !== p.name && (msg.type === 'synchronous' || msg.type === 'create')) {
          stack.push(i);
        }
        if (msg.from === p.name && msg.type === 'return' && stack.length > 0) {
          const startIdx = stack.pop()!;
          segments.push({ startMsgIdx: startIdx, endMsgIdx: i, depth: stack.length });
        }
      });
      while (stack.length > 0) {
        const startIdx = stack.pop()!;
        segments.push({ startMsgIdx: startIdx, endMsgIdx: sortedMessages.length - 1, depth: stack.length });
      }
      activationSegments.set(p.name, segments);
    }

    // Create messages
    sortedMessages.forEach((msg, i) => {
      const y = firstMessageY + i * MESSAGE_Y_GAP;

      const fromX = this.participantX.get(msg.from);
      const toX = this.participantX.get(msg.to);
      if (!fromX || !toX) return;

      const style = this.getMessageStyle(msg.type ?? 'synchronous');
      const label = msg.label;

      if (msg.from === msg.to) {
        // Self-loop message
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

      // Destroy marker: X at target lifeline
      if (msg.type === 'destroy' && msg.from !== msg.to) {
        const destroyStyle = 'text;html=1;align=center;verticalAlign=middle;fontSize=16;fontStyle=2;fillColor=none;strokeColor=none;';
        this.addVertex('✕', destroyStyle, toX - 8, y - 8, 16, 16);
      }
    });

    // Create activation bars from segments
    for (const [name, segments] of activationSegments) {
      const cx = this.participantX.get(name);
      if (!cx) continue;
      for (const seg of segments) {
        const barW = Math.max(ACTIVATION_W - seg.depth * 3, 6);
        const startY = firstMessageY + seg.startMsgIdx * MESSAGE_Y_GAP - ACTIVATION_PAD;
        const endY = firstMessageY + seg.endMsgIdx * MESSAGE_Y_GAP + ACTIVATION_PAD;
        const height = Math.max(endY - startY, ACTIVATION_PAD * 2);
        this.addVertex('', ACTIVATION_STYLE, cx - barW / 2, startY, barW, height);
      }
    }

    // Create combined fragments (alt, loop, opt, par, etc.)
    const fragmentGroups = new Map<string, { type: string; condition?: string; minOrder: number; maxOrder: number }>();
    for (const msg of sortedMessages) {
      if (msg.fragment) {
        const key = `${msg.fragment.type}-${msg.fragment.fromOrder}-${msg.fragment.toOrder}`;
        if (!fragmentGroups.has(key)) {
          fragmentGroups.set(key, {
            type: msg.fragment.type,
            condition: msg.fragment.condition,
            minOrder: msg.fragment.fromOrder,
            maxOrder: msg.fragment.toOrder,
          });
        }
      }
    }
    for (const [, group] of fragmentGroups) {
      const startY = firstMessageY + group.minOrder * MESSAGE_Y_GAP - FRAGMENT_PAD;
      const endY = firstMessageY + (group.maxOrder + 1) * MESSAGE_Y_GAP + FRAGMENT_PAD;
      const fh = endY - startY;
      const fx = MARGIN;
      const fw = canvasWidth - MARGIN * 2;
      this.addVertex('', FRAGMENT_STYLE, fx, startY, fw, fh);

      // Label tab at top-left corner
      const label = group.condition ? `${group.type} [${group.condition}]` : group.type;
      this.addVertex(label, 'rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#444444;fontFamily=Helvetica;fontSize=12;fontStyle=1;', fx, startY, FRAGMENT_TAB_W, FRAGMENT_TAB_H);
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
