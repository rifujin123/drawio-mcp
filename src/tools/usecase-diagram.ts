import { zodToJsonSchema } from 'zod-to-json-schema';
import { UseCaseDiagramInputSchema } from '../types/usecase-diagram.js';
import { UseCaseDiagramBuilder } from '../builders/usecase-builder.js';
import { writeDrawioFile } from '../utils/diagram-writer.js';

export const drawUseCaseDiagramTool = {
  name: 'draw_usecase_diagram',
  description: `Create a UML use case diagram as a .drawio file.
Uses proper UML notation: stick figure actors, white ellipses for use cases, dashed rectangle for system boundary.
Accepts actors, use cases, system boundaries, and relationships (association, include, extend, generalization).
Also supports actor generalization (actor inheritance).
Output is a .drawio file that opens in draw.io (diagrams.net).`,
  inputSchema: zodToJsonSchema(UseCaseDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = UseCaseDiagramInputSchema.parse(args);
    const builder = new UseCaseDiagramBuilder(parsed);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    const filePath = await writeDrawioFile(xml, {
      diagramName: parsed.title ?? 'Use Case Diagram',
      prefix: 'usecase-diagram',
    });
    return {
      content: [
        {
          type: 'text',
          text: `Use case diagram created successfully: ${filePath}\n\n` +
            `Actors: ${parsed.actors.length}\n` +
            `Use Cases: ${parsed.useCases.length}\n` +
            `Associations: ${parsed.associations?.length ?? 0}\n` +
            `Relationships: ${parsed.relationships?.length ?? 0}\n` +
            `Actor Generalizations: ${parsed.actorRelationships?.length ?? 0}\n` +
            `File: ${filePath}`,
        },
        {
          type: 'resource',
          resource: {
            uri: `file://${filePath}`,
            mimeType: 'application/x-drawio',
            name: parsed.title ?? 'Use Case Diagram',
            text: xml,
          },
        },
      ],
    };
  },
};
