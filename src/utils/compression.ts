import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

/**
 * Compress mxGraph XML for .drawio format.
 * Draw.io stores diagram content as deflate(base64(data)).
 */
export function compressDiagram(xmlContent: string): string {
  const compressed = deflateSync(strToU8(xmlContent));
  return Buffer.from(compressed).toString('base64');
}

/**
 * Decompress a .drawio compressed diagram back to XML.
 */
export function decompressDiagram(compressedContent: string): string {
  const buffer = Buffer.from(compressedContent, 'base64');
  const decompressed = inflateSync(new Uint8Array(buffer));
  return strFromU8(decompressed);
}

/**
 * Wrap mxGraphModel XML in the draw.io mxfile envelope.
 * @param mxGraphModelXml - The <mxGraphModel>...</mxGraphModel> XML string
 * @param diagramName - Name for the diagram page
 * @param compressed - Whether to compress the diagram content (default: true)
 */
export function wrapInMxfile(
  mxGraphModelXml: string,
  diagramName: string = 'Diagram',
  compressed: boolean = true,
): string {
  const diagramId = generateId();
  const content = compressed ? compressDiagram(mxGraphModelXml) : mxGraphModelXml;
  const host = compressed ? '' : ' host="app.diagrams.net"';
  const tag = compressed ? 'compressed' : 'xml';

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile${host}>
  <diagram name="${escapeXml(diagramName)}" id="${diagramId}">
    <${tag}>${compressed ? escapeXml(content) : content}</${tag}>
  </diagram>
</mxfile>`;
}

/**
 * Generate a pseudo-unique ID for draw.io elements.
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
