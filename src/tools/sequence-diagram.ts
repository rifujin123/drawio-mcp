import { zodToJsonSchema } from 'zod-to-json-schema';
import { SequenceDiagramInputSchema } from '../types/sequence-diagram.js';
import { SequenceDiagramBuilder } from '../builders/sequence-builder.js';
import { writeDrawioFile } from '../utils/diagram-writer.js';

export const drawSequenceDiagramTool = {
  name: 'draw_sequence_diagram',
  description: `Create a UML sequence diagram as a .drawio file.
Accepts participants (actor, boundary, control, entity, lifeline) and messages (synchronous, asynchronous, return, create, destroy) ordered chronologically.
Output is a .drawio file that opens in draw.io (diagrams.net).`,
  inputSchema: zodToJsonSchema(SequenceDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = SequenceDiagramInputSchema.parse(args);
    const builder = new SequenceDiagramBuilder(parsed);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    const filePath = await writeDrawioFile(xml, {
      diagramName: parsed.title ?? 'Sequence Diagram',
      prefix: 'sequence-diagram',
    });
    return {
      content: [
        {
          type: 'text',
          text: `Sequence diagram created successfully: ${filePath}\n\n` +
            `Participants: ${parsed.participants.length}\n` +
            `Messages: ${parsed.messages.length}\n` +
            `File: ${filePath}`,
        },
        {
          type: 'resource',
          resource: {
            uri: `file://${filePath}`,
            mimeType: 'application/x-drawio',
            name: parsed.title ?? 'Sequence Diagram',
            text: xml,
          },
        },
      ],
    };
  },
};
