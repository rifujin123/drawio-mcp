import { z } from 'zod';

// ─── Activity Diagram Types ───────────────────────────────────

export const NodeTypeSchema = z.enum([
  'action',
  'decision',
  'fork',
  'join',
  'start',
  'end',
  'merge',
]);

export const ActivityNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  label: z.string().optional().default(''),
});

export const ActivityFlowSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const SwimlaneSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.string()).min(1),
});

export const ActivityDiagramInputSchema = z.object({
  title: z.string().optional().default('Activity Diagram'),
  nodes: z.array(ActivityNodeSchema).min(1),
  flows: z.array(ActivityFlowSchema).min(1),
  swimlanes: z.array(SwimlaneSchema).optional().default([]),
  startNodeId: z.string().optional(),
  endNodeId: z.string().optional(),
});

// ─── TypeScript Interfaces ────────────────────────────────────

export type ActivityNodeType = 'action' | 'decision' | 'fork' | 'join' | 'start' | 'end' | 'merge';

export interface ActivityNode {
  id: string;
  type: ActivityNodeType;
  label?: string;
}

export interface ActivityFlow {
  from: string;
  to: string;
  label?: string;
}

export interface Swimlane {
  name: string;
  nodes: string[];
}

export interface ActivityDiagramInput {
  title?: string;
  nodes: ActivityNode[];
  flows: ActivityFlow[];
  swimlanes?: Swimlane[];
  startNodeId?: string;
  endNodeId?: string;
}
