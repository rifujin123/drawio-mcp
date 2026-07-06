import * as fs from 'node:fs';
import * as path from 'node:path';
import { wrapInMxfile } from './compression.js';

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

export interface WriteDiagramOptions {
  /** Diagram name (used as page name in draw.io) */
  diagramName?: string;
  /** Whether to compress the diagram (default: true) */
  compressed?: boolean;
  /** Custom file name prefix (default: diagram type) */
  prefix?: string;
}

/**
 * Write a draw.io diagram file to disk.
 * @returns The absolute path to the created file.
 */
export async function writeDrawioFile(
  mxGraphModelXml: string,
  options: WriteDiagramOptions = {},
): Promise<string> {
  const { diagramName = 'Diagram', compressed = true, prefix = 'diagram' } = options;

  // Ensure output directory exists
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${prefix}-${timestamp}.drawio`;
  const filePath = path.join(OUTPUT_DIR, filename);

  // Wrap in mxfile envelope
  const drawioContent = wrapInMxfile(mxGraphModelXml, diagramName, compressed);

  // Write to disk
  await fs.promises.writeFile(filePath, drawioContent, 'utf-8');

  return filePath;
}
