import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClassDiagramInputSchema } from '../types/class-diagram.js';
import { ClassDiagramBuilder } from '../builders/class-builder.js';
import { writeDrawioFile } from '../utils/diagram-writer.js';

export const drawClassDiagramTool = {
  name: 'draw_class_diagram',
  description: `Create a UML class diagram as a .drawio file.
Accepts class elements with attributes, methods, stereotypes (interface, abstract, enum), and relationships (inheritance, association, aggregation, composition, dependency, realization).
Output is a .drawio file that opens in draw.io (diagrams.net).`,
  inputSchema: zodToJsonSchema(ClassDiagramInputSchema),
  handler: async (args: unknown) => {
    const parsed = ClassDiagramInputSchema.parse(args);
    const builder = new ClassDiagramBuilder(parsed);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    const filePath = await writeDrawioFile(xml, {
      diagramName: parsed.title ?? 'Class Diagram',
      prefix: 'class-diagram',
    });
    return {
      content: [
        {
          type: 'text',
          text: `Class diagram created successfully: ${filePath}\n\n` +
            `Classes: ${parsed.classes.length}\n` +
            `Relationships: ${parsed.relationships?.length ?? 0}\n` +
            `File: ${filePath}`,
        },
        {
          type: 'resource',
          resource: {
            uri: `file://${filePath}`,
            mimeType: 'application/x-drawio',
            name: parsed.title ?? 'Class Diagram',
            text: xml,
          },
        },
      ],
    };
  },
};
