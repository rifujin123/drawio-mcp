import { z } from 'zod';

// ─── Use Case Diagram Types ───────────────────────────────────

export const ActorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const UseCaseSchema = z.object({
  name: z.string().min(1),
  id: z.string().min(1),
  description: z.string().optional(),
});

export const UseCaseAssocSchema = z.object({
  actor: z.string().min(1),
  useCase: z.string().min(1),
});

export const UseCaseRelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['include', 'extend', 'generalization']),
});

export const ActorRelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['generalization']),
});

export const SystemBoundarySchema = z.object({
  name: z.string().min(1),
  include: z.array(z.string()).optional().default([]),
});

export const UseCaseDiagramInputSchema = z.object({
  title: z.string().optional().default('Use Case Diagram'),
  systemName: z.string().optional().default('System'),
  actors: z.array(ActorSchema).min(1),
  useCases: z.array(UseCaseSchema).min(1),
  associations: z.array(UseCaseAssocSchema).optional().default([]),
  relationships: z.array(UseCaseRelationSchema).optional().default([]),
  actorRelationships: z.array(ActorRelationSchema).optional().default([]),
  systemBoundary: SystemBoundarySchema.optional(),
});

// ─── TypeScript Interfaces ────────────────────────────────────

export interface Actor {
  name: string;
  description?: string;
}

export interface UseCase {
  name: string;
  id: string;
  description?: string;
}

export interface UseCaseAssociation {
  actor: string;
  useCase: string;
}

export interface UseCaseRelation {
  from: string;
  to: string;
  type: 'include' | 'extend' | 'generalization';
}

export interface ActorRelation {
  from: string;
  to: string;
  type: 'generalization';
}

export interface SystemBoundary {
  name: string;
  include?: string[];
}

export interface UseCaseDiagramInput {
  title?: string;
  systemName?: string;
  actors: Actor[];
  useCases: UseCase[];
  associations?: UseCaseAssociation[];
  relationships?: UseCaseRelation[];
  actorRelationships?: ActorRelation[];
  systemBoundary?: SystemBoundary;
}
