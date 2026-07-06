import { z } from 'zod';

// ─── Sequence Diagram Types ───────────────────────────────────

export const ParticipantTypeSchema = z.enum([
  'actor',
  'boundary',
  'control',
  'entity',
  'lifeline',
]);

export const ParticipantSchema = z.object({
  name: z.string().min(1),
  type: ParticipantTypeSchema.optional().default('lifeline'),
});

export const MessageTypeSchema = z.enum([
  'synchronous',
  'asynchronous',
  'return',
  'create',
  'destroy',
]);

export const FragmentTypeSchema = z.enum(['alt', 'opt', 'loop', 'par', 'critical', 'assert']);

export const CombinedFragmentSchema = z.object({
  type: FragmentTypeSchema,
  condition: z.string().optional(),
  fromOrder: z.number().int(),
  toOrder: z.number().int(),
});

export const MessageSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1),
  type: MessageTypeSchema.optional().default('synchronous'),
  order: z.number().int().min(0),
  fragment: CombinedFragmentSchema.optional(),
});

export const SequenceDiagramInputSchema = z.object({
  title: z.string().optional().default('Sequence Diagram'),
  participants: z.array(ParticipantSchema).min(1),
  messages: z.array(MessageSchema).min(1),
});

// ─── TypeScript Interfaces ────────────────────────────────────

export type ParticipantType = 'actor' | 'boundary' | 'control' | 'entity' | 'lifeline';

export interface Participant {
  name: string;
  type?: ParticipantType;
}

export type MessageType = 'synchronous' | 'asynchronous' | 'return' | 'create' | 'destroy';

export type FragmentType = 'alt' | 'opt' | 'loop' | 'par' | 'critical' | 'assert';

export interface CombinedFragment {
  type: FragmentType;
  condition?: string;
  fromOrder: number;
  toOrder: number;
}

export interface Message {
  from: string;
  to: string;
  label: string;
  type?: MessageType;
  order: number;
  fragment?: CombinedFragment;
}

export interface SequenceDiagramInput {
  title?: string;
  participants: Participant[];
  messages: Message[];
}
