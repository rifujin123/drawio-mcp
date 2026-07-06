import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  readDrawioFile,
  writeDrawioFile,
  parseMxGraphXml,
  serializeMxGraphXml,
  getNextCellId,
  ParsedCell,
} from '../utils/diagram-reader.js';

// ─── Operation schemas ──────────────────────────────────────────

const MoveOpSchema = z.object({
  type: z.literal('move'),
  cellId: z.string(),
  x: z.number(),
  y: z.number(),
});

const ResizeOpSchema = z.object({
  type: z.literal('resize'),
  cellId: z.string(),
  width: z.number(),
  height: z.number(),
});

const RelabelOpSchema = z.object({
  type: z.literal('relabel'),
  cellId: z.string(),
  value: z.string(),
});

const RestyleOpSchema = z.object({
  type: z.literal('restyle'),
  cellId: z.string(),
  style: z.string(),
});

const MoveByOpSchema = z.object({
  type: z.literal('move_by'),
  cellId: z.string(),
  dx: z.number(),
  dy: z.number(),
});

const AddVertexOpSchema = z.object({
  type: z.literal('add_vertex'),
  value: z.string().optional().default(''),
  style: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const AddEdgeOpSchema = z.object({
  type: z.literal('add_edge'),
  value: z.string().optional().default(''),
  style: z.string(),
  source: z.string(),
  target: z.string(),
  points: z
    .array(z.object({ x: z.number(), y: z.number() }))
    .optional(),
});

const RemoveOpSchema = z.object({
  type: z.literal('remove'),
  cellId: z.string(),
});

const OperationSchema = z.discriminatedUnion('type', [
  MoveOpSchema,
  ResizeOpSchema,
  RelabelOpSchema,
  RestyleOpSchema,
  MoveByOpSchema,
  AddVertexOpSchema,
  AddEdgeOpSchema,
  RemoveOpSchema,
]);

const UpdateDiagramInputSchema = z.object({
  file_path: z.string().min(1).describe('Path to .drawio file to update'),
  operations: z.array(OperationSchema).min(1).describe('List of operations to apply'),
});

// ─── Tool definition ────────────────────────────────────────────

export const updateDiagramFileTool = {
  name: 'update_diagram_file',
  description: `Modify an existing .drawio diagram file.
Supports operations: move (absolute), move_by (relative offset), resize, relabel, restyle, add_vertex, add_edge, remove.
Use read_diagram_file first to inspect cell IDs, then call update_diagram_file with the target operations.`,
  inputSchema: zodToJsonSchema(UpdateDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = UpdateDiagramInputSchema.parse(args);
    const { file_path, operations } = parsed;

    // 1. Read existing file
    const data = await readDrawioFile(file_path);
    const cells = data.xml ? parseMxGraphXml(data.xml) : data.cells;
    const modifiedCells = [...cells]; // shallow clone

    // 2. Track changes for reporting
    const changes: string[] = [];

    for (const op of operations) {
      switch (op.type) {
        case 'move': {
          const cell = modifiedCells.find((c) => c.id === op.cellId);
          if (!cell) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          if (!cell.geometry) cell.geometry = {};
          cell.geometry.x = op.x;
          cell.geometry.y = op.y;
          changes.push(`✅ Moved cell ${op.cellId} → (${op.x}, ${op.y})`);
          break;
        }

        case 'resize': {
          const cell = modifiedCells.find((c) => c.id === op.cellId);
          if (!cell) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          if (!cell.geometry) cell.geometry = {};
          cell.geometry.width = op.width;
          cell.geometry.height = op.height;
          changes.push(`✅ Resized cell ${op.cellId} → ${op.width}×${op.height}`);
          break;
        }

        case 'relabel': {
          const cell = modifiedCells.find((c) => c.id === op.cellId);
          if (!cell) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          cell.value = op.value;
          changes.push(`✅ Relabeled cell ${op.cellId} → "${op.value}"`);
          break;
        }

        case 'restyle': {
          const cell = modifiedCells.find((c) => c.id === op.cellId);
          if (!cell) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          cell.style = op.style;
          changes.push(`✅ Restyled cell ${op.cellId}`);
          break;
        }

        case 'move_by': {
          const cell = modifiedCells.find((c) => c.id === op.cellId);
          if (!cell) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          if (!cell.geometry) cell.geometry = {};
          cell.geometry.x = (cell.geometry.x ?? 0) + op.dx;
          cell.geometry.y = (cell.geometry.y ?? 0) + op.dy;
          changes.push(`✅ Moved cell ${op.cellId} by (${op.dx}, ${op.dy}) → (${cell.geometry.x}, ${cell.geometry.y})`);
          break;
        }

        case 'add_vertex': {
          const newId = getNextCellId(modifiedCells);
          const newCell: ParsedCell = {
            id: newId,
            value: op.value,
            style: op.style,
            vertex: true,
            edge: false,
            parent: '1',
            geometry: {
              x: op.x,
              y: op.y,
              width: op.width,
              height: op.height,
              relative: false,
            },
          };
          modifiedCells.push(newCell);
          changes.push(`✅ Added vertex cell ${newId} (${op.value || 'no label'})`);
          break;
        }

        case 'add_edge': {
          const newId = getNextCellId(modifiedCells);
          const newCell: ParsedCell = {
            id: newId,
            value: op.value,
            style: op.style,
            vertex: false,
            edge: true,
            parent: '1',
            source: op.source,
            target: op.target,
            geometry: {
              x: 0, y: 0, width: 0, height: 0,
              relative: true,
              ...(op.points ? { points: op.points } : {}),
            },
          };
          modifiedCells.push(newCell);
          changes.push(`✅ Added edge cell ${newId} (${op.source} → ${op.target})`);
          break;
        }

        case 'remove': {
          const idx = modifiedCells.findIndex((c) => c.id === op.cellId);
          if (idx === -1) { changes.push(`⚠️ Cell ${op.cellId} not found`); continue; }
          modifiedCells.splice(idx, 1);
          changes.push(`✅ Removed cell ${op.cellId}`);
          break;
        }
      }
    }

    // 3. Serialize and write back
    const newXml = serializeMxGraphXml(modifiedCells);
    const resolvedPath = await writeDrawioFile(file_path, newXml, data.diagramName);

    const successCount = changes.filter((c) => c.startsWith('✅')).length;
    const warnCount = changes.filter((c) => c.startsWith('⚠️')).length;

    const summary = [
      `✅ File updated: ${resolvedPath}`,
      `   Operations: ${successCount} succeeded, ${warnCount} warnings`,
      ``,
      ...changes,
    ].join('\n');

    return {
      content: [{ type: 'text', text: summary }],
    };
  },
};
