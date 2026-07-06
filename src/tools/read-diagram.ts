import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readDrawioFile } from '../utils/diagram-reader.js';

const ReadDiagramInputSchema = z.object({
  file_path: z.string().min(1).describe('Path to .drawio file (absolute, or relative to ./output/)'),
});

export const readDiagramFileTool = {
  name: 'read_diagram_file',
  description: `Read and parse an existing .drawio diagram file.
Returns all cells with their IDs, positions, labels, styles, and connections.
Useful for inspecting a generated diagram to understand its structure before making changes.`,
  inputSchema: zodToJsonSchema(ReadDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = ReadDiagramInputSchema.parse(args);
    const data = await readDrawioFile(parsed.file_path);
    const { diagramName, cells } = data;

    // Enrich for readability
    const enriched = cells
      .filter((c) => c.id !== '0' && c.id !== '1') // skip root cells
      .map((c) => {
        const type = c.edge ? 'edge' : c.vertex ? 'vertex' : 'other';
        return {
          id: c.id,
          type,
          value: c.value ?? '',
          style: c.style ?? '',
          parent: c.parent,
          ...(c.source ? { source: c.source } : {}),
          ...(c.target ? { target: c.target } : {}),
          ...(c.geometry
            ? {
                position: {
                  x: c.geometry.x ?? 0,
                  y: c.geometry.y ?? 0,
                },
                size: {
                  width: c.geometry.width ?? 0,
                  height: c.geometry.height ?? 0,
                },
                ...(c.geometry.points ? { waypoints: c.geometry.points } : {}),
              }
            : {}),
        };
      });

    const vertexCount = enriched.filter((c) => c.type === 'vertex').length;
    const edgeCount = enriched.filter((c) => c.type === 'edge').length;

    const summary = `📊 Diagram: "${diagramName}"
   Total cells: ${enriched.length}
   Vertices (shapes): ${vertexCount}
   Edges (connectors): ${edgeCount}
   File: ${parsed.file_path}`;

    return {
      content: [
        { type: 'text', text: summary },
        {
          type: 'text',
          text: `\n=== Cell Details ===\n${JSON.stringify(enriched, null, 2)}`,
        },
      ],
    };
  },
};
