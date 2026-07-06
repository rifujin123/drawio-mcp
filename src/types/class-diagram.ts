import { z } from 'zod';

// ─── Class Diagram Types ──────────────────────────────────────

export const VisibilitySchema = z.enum(['+', '-', '#', '~']).optional();

export const AttributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional().default('void'),
  visibility: VisibilitySchema,
});

export const MethodParamSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional().default('void'),
});

export const MethodSchema = z.object({
  name: z.string().min(1),
  returnType: z.string().optional().default('void'),
  params: z.array(MethodParamSchema).optional().default([]),
  visibility: VisibilitySchema,
});

export const ClassElementSchema = z.object({
  name: z.string().min(1),
  extends: z.string().optional(),
  stereotype: z.enum(['interface', 'abstract', 'enum', '']).optional().default(''),
  attributes: z.array(AttributeSchema).optional().default([]),
  methods: z.array(MethodSchema).optional().default([]),
  isAbstract: z.boolean().optional().default(false),
});

export const RelationTypeSchema = z.enum([
  'association',
  'inheritance',
  'dependency',
  'aggregation',
  'composition',
  'realization',
]);

export const RelationshipSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: RelationTypeSchema,
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  label: z.string().optional(),
});

export const ClassDiagramInputSchema = z.object({
  title: z.string().optional().default('Class Diagram'),
  classes: z.array(ClassElementSchema).min(1),
  relationships: z.array(RelationshipSchema).optional().default([]),
});

// ─── TypeScript Interfaces ────────────────────────────────────

export interface Attribute {
  name: string;
  type?: string;
  visibility?: '+' | '-' | '#' | '~';
}

export interface MethodParam {
  name: string;
  type?: string;
}

export interface Method {
  name: string;
  returnType?: string;
  params?: MethodParam[];
  visibility?: '+' | '-' | '#' | '~';
}

export interface ClassElement {
  name: string;
  extends?: string;
  stereotype?: 'interface' | 'abstract' | 'enum' | '';
  attributes?: Attribute[];
  methods?: Method[];
  isAbstract?: boolean;
}

export type RelationType = 'association' | 'inheritance' | 'dependency' | 'aggregation' | 'composition' | 'realization';

export interface Relationship {
  from: string;
  to: string;
  type: RelationType;
  fromLabel?: string;
  toLabel?: string;
  label?: string;
}

export interface ClassDiagramInput {
  title?: string;
  classes: ClassElement[];
  relationships?: Relationship[];
}
