#!/usr/bin/env node
/**
 * draw.io MCP Server — UML Diagram Generator
 *
 * Exposes MCP tools for creating:
 * - UML Class Diagrams
 * - UML Use Case Diagrams
 * - UML Activity Diagrams
 * - UML Sequence Diagrams
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { drawClassDiagramTool } from './tools/class-diagram.js';
import { drawUseCaseDiagramTool } from './tools/usecase-diagram.js';
import { generateUseCaseSpecTool } from './tools/usecase-spec.js';
import { drawActivityDiagramTool } from './tools/activity-diagram.js';
import { drawSequenceDiagramTool } from './tools/sequence-diagram.js';
import { readDiagramFileTool } from './tools/read-diagram.js';
import { updateDiagramFileTool } from './tools/update-diagram.js';

const tools = [
  drawClassDiagramTool,
  drawUseCaseDiagramTool,
  generateUseCaseSpecTool,
  drawActivityDiagramTool,
  drawSequenceDiagramTool,
  readDiagramFileTool,
  updateDiagramFileTool,
];

const server = new Server(
  {
    name: 'drawio-mcp-uml',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    return await tool.handler(request.params.arguments);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('draw.io MCP UML Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
