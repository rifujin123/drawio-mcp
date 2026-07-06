import { zodToJsonSchema } from 'zod-to-json-schema';
import { ActivityDiagramInputSchema } from '../types/activity-diagram.js';
import { ActivityDiagramBuilder } from '../builders/activity-builder.js';
import { writeDrawioFile } from '../utils/diagram-writer.js';

export const drawActivityDiagramTool = {
  name: 'draw_activity_diagram',
  description: `Create a UML activity diagram as a .drawio file.
Accepts action nodes, decisions, forks/joins, start/end nodes, flows, and swimlanes.
Output is a .drawio file that opens in draw.io (diagrams.net).`,
  inputSchema: zodToJsonSchema(ActivityDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = ActivityDiagramInputSchema.parse(args);
    const builder = new ActivityDiagramBuilder(parsed);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    const filePath = await writeDrawioFile(xml, {
      diagramName: parsed.title ?? 'Activity Diagram',
      prefix: 'activity-diagram',
    });
    return {
      content: [
        {
          type: 'text',
          text: `Activity diagram created successfully: ${filePath}\n\n` +
            `Nodes: ${parsed.nodes.length}\n` +
            `Flows: ${parsed.flows.length}\n` +
            `Swimlanes: ${parsed.swimlanes?.length ?? 0}\n` +
            `File: ${filePath}`,
        },
        {
          type: 'resource',
          resource: {
            uri: `file://${filePath}`,
            mimeType: 'application/x-drawio',
            name: parsed.title ?? 'Activity Diagram',
            text: xml,
          },
        },
      ],
    };
  },
};
