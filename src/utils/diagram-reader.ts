/**
 * Diagram Reader — parse, serialize, read, write .drawio files
 *
 * Provides 2-way conversion between mxGraph XML and structured cell data.
 * Used by read_diagram_file and update_diagram_file tools.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { compressDiagram, decompressDiagram, wrapInMxfile } from './compression.js';

// ─── Types ──────────────────────────────────────────────────────

export interface ParsedCell {
  id: string;
  value?: string;
  style?: string;
  vertex?: boolean;
  edge?: boolean;
  parent?: string;
  source?: string;
  target?: string;
  connectable?: boolean;
  geometry?: ParsedGeometry;
}

export interface ParsedGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  relative?: boolean;
  points?: { x: number; y: number }[];
  offset?: { x: number; y: number };
}

export interface DrawioFileData {
  diagramName: string;
  xml: string;
  cells: ParsedCell[];
}

// ─── Constants ──────────────────────────────────────────────────

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

// ─── Public API ─────────────────────────────────────────────────

/**
 * Read and parse a .drawio file.
 * Accepts absolute path or filename relative to ./output/.
 */
export async function readDrawioFile(filePath: string): Promise<DrawioFileData> {
  const resolved = resolveFilePath(filePath);
  const content = await fs.promises.readFile(resolved, 'utf-8');
  return parseDrawioContent(content);
}

/**
 * Write cells back to a .drawio file (overwrites).
 */
export async function writeDrawioFile(
  filePath: string,
  xml: string,
  diagramName?: string,
): Promise<string> {
  const resolved = resolveFilePath(filePath);
  const name = diagramName ?? 'Diagram';
  const drawioContent = wrapInMxfile(xml, name, true);
  await fs.promises.writeFile(resolved, drawioContent, 'utf-8');
  return resolved;
}

/**
 * Parse draw.io mxfile content → structured data.
 */
export function parseDrawioContent(content: string): DrawioFileData {
  // Extract diagram name
  const nameMatch = content.match(/<diagram\s+name="([^"]*)"/);
  const diagramName = nameMatch ? unescapeXml(nameMatch[1]) : 'Diagram';

  // Extract compressed or uncompressed XML
  let xml: string;
  const compressedMatch = content.match(/<compressed>([\s\S]*?)<\/compressed>/);
  const xmlMatch = content.match(/<xml>([\s\S]*?)<\/xml>/);

  if (compressedMatch) {
    xml = decompressDiagram(compressedMatch[1]);
  } else if (xmlMatch) {
    xml = xmlMatch[1];
  } else {
    throw new Error('Cannot find diagram content (expected <compressed> or <xml> tag)');
  }

  const cells = parseMxGraphXml(xml);
  return { diagramName, xml, cells };
}

/**
 * Parse mxGraphModel XML → array of ParsedCell.
 */
export function parseMxGraphXml(xml: string): ParsedCell[] {
  const cells: ParsedCell[] = [];

  // Match each <mxCell ...>...</mxCell> or <mxCell ... />
  const cellRegex = /<mxCell\s+([\s\S]*?)(\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(xml)) !== null) {
    const attrsStr = match[1];
    const body = match[2]; // either '/>' or the content with closing tag
    const cell = parseCellAttrs(attrsStr);

    // Extract geometry from body if present
    if (body.startsWith('>')) {
      const geom = parseGeometry(body);
      if (geom) cell.geometry = geom;
    }

    cells.push(cell);
  }

  return cells;
}

/**
 * Serialize cells array → mxGraphModel XML string.
 */
export function serializeMxGraphXml(
  cells: ParsedCell[],
  graphAttrs?: Record<string, string>,
): string {
  const attrs = graphAttrs ?? {
    dx: '0', dy: '0', grid: '1', gridSize: '10',
    guides: '1', tooltips: '1', connect: '1', arrows: '1',
    fold: '1', page: '1', pageScale: '1',
    pageWidth: '827', pageHeight: '1169', math: '0', shadow: '0',
  };

  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const cellsXml = cells
    .map((c) => serializeCellXml(c))
    .join('\n    ');

  return `<mxGraphModel ${attrStr}>
  <root>
    ${cellsXml}
  </root>
</mxGraphModel>`;
}

// ─── Internal: Cell XML parsing ─────────────────────────────────

function parseCellAttrs(attrStr: string): ParsedCell {
  const cell: ParsedCell = { id: '' };

  // Extract all key="value" or key='value'
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(attrStr)) !== null) {
    const key = m[1];
    let val: string | boolean = m[2];

    switch (key) {
      case 'id':
        cell.id = val as string;
        break;
      case 'value':
        cell.value = unescapeXml(val as string);
        break;
      case 'style':
        cell.style = val as string;
        break;
      case 'parent':
        cell.parent = val as string;
        break;
      case 'source':
        cell.source = val as string;
        break;
      case 'target':
        cell.target = val as string;
        break;
      case 'vertex':
        cell.vertex = val === '1';
        break;
      case 'edge':
        cell.edge = val === '1';
        break;
    }
  }

  return cell;
}

function parseGeometry(body: string): ParsedGeometry | undefined {
  // <mxGeometry x="..." y="..." width="..." height="..." as="geometry" relative="1">
  // or with waypoints: <mxGeometry as="geometry" relative="1"><Array as="points">...</Array></mxGeometry>
  const geomRegex = /<mxGeometry\s+([\s\S]*?)(\/>|>[\s\S]*?<\/mxGeometry>)/;
  const gMatch = geomRegex.exec(body);
  if (!gMatch) return undefined;

  const gAttrsStr = gMatch[1];
  const gBody = gMatch[2];

  const geom: ParsedGeometry = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(gAttrsStr)) !== null) {
    switch (m[1]) {
      case 'x': geom.x = parseFloat(m[2]); break;
      case 'y': geom.y = parseFloat(m[2]); break;
      case 'width': geom.width = parseFloat(m[2]); break;
      case 'height': geom.height = parseFloat(m[2]); break;
      case 'relative': geom.relative = m[2] === '1'; break;
    }
  }

  // Parse waypoints inside <Array as="points">
  if (gBody.startsWith('>') && gBody.includes('<Array')) {
    const pointRegex = /<mxPoint\s+x="([\d.-]+)"\s+y="([\d.-]+)"\s*\/>/g;
    const points: { x: number; y: number }[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pointRegex.exec(gBody)) !== null) {
      points.push({ x: parseFloat(pMatch[1]), y: parseFloat(pMatch[2]) });
    }
    if (points.length > 0) geom.points = points;
  }

  // Parse offset point for edge labels: <mxPoint x="0" y="-10" as="offset" />
  const offsetMatch = gBody.match(/<mxPoint\s+x="([\d.-]+)"\s+y="([\d.-]+)"\s+as="offset"\s*\/>/);
  if (offsetMatch) {
    geom.offset = { x: parseFloat(offsetMatch[1]), y: parseFloat(offsetMatch[2]) };
  }

  return geom;
}

// ─── Internal: Cell XML serialization ───────────────────────────

function serializeCellXml(cell: ParsedCell): string {
  const attrs: string[] = [`id="${cell.id}"`];

  if (cell.value) attrs.push(`value="${escapeXml(cell.value)}"`);
  if (cell.style) attrs.push(`style="${cell.style}"`);
  if (cell.parent != null) attrs.push(`parent="${cell.parent}"`);
  if (cell.vertex) attrs.push('vertex="1"');
  if (cell.edge) attrs.push('edge="1"');
  if (cell.source) attrs.push(`source="${cell.source}"`);
  if (cell.target) attrs.push(`target="${cell.target}"`);
  if (cell.connectable === false) attrs.push('connectable="0"');

  const geom = cell.geometry;
  if (!geom) {
    return `<mxCell ${attrs.join(' ')} />`;
  }

  const geomAttrs: string[] = [];
  if (!geom.relative) {
    if (geom.x != null) geomAttrs.push(`x="${geom.x}"`);
    if (geom.y != null) geomAttrs.push(`y="${geom.y}"`);
    if (geom.width != null) geomAttrs.push(`width="${geom.width}"`);
    if (geom.height != null) geomAttrs.push(`height="${geom.height}"`);
  } else {
    // For relative geometry (edge labels), emit x,y if non-zero
    if (geom.x != null && geom.x !== 0) geomAttrs.push(`x="${geom.x}"`);
    if (geom.y != null && geom.y !== 0) geomAttrs.push(`y="${geom.y}"`);
  }
  geomAttrs.push(`as="geometry"`);
  if (geom.relative) geomAttrs.push('relative="1"');

  let pointsXml = '';
  if (geom.points && geom.points.length > 0) {
    pointsXml = '\n        <Array as="points">' +
      geom.points.map((p) => `\n          <mxPoint x="${p.x}" y="${p.y}" />`).join('') +
      '\n        </Array>';
  }

  // Serialize offset point (for edge labels)
  let offsetXml = '';
  if (geom.offset) {
    offsetXml = `\n        <mxPoint x="${geom.offset.x}" y="${geom.offset.y}" as="offset" />`;
  }

  return `<mxCell ${attrs.join(' ')}>
      <mxGeometry ${geomAttrs.join(' ')}>${pointsXml}${offsetXml}
      </mxGeometry>
    </mxCell>`;
}

// ─── Utilities ──────────────────────────────────────────────────

/**
 * Resolve a file path: if absolute, use as-is.
 * If relative (or just a filename), resolve against ./output/.
 */
export function resolveFilePath(input: string): string {
  if (path.isAbsolute(input)) return input;

  // If it already starts with output\ or output/, strip it
  const normalized = input.replace(/^output[/\\]/, '');
  return path.join(OUTPUT_DIR, normalized);
}

/**
 * Get next available ID for new cells.
 */
export function getNextCellId(cells: ParsedCell[]): string {
  let max = 1;
  for (const c of cells) {
    const n = parseInt(c.id, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXml(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}
