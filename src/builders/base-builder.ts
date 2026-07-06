/**
 * Base Builder — mxGraph XML generation core.
 *
 * Manages mxCell creation, ID generation, and serialization to mxGraphModel XML.
 * All diagram-specific builders extend this class.
 */

export interface mxCell {
  id: string;
  value: string;
  style: string;
  vertex: boolean;
  edge: boolean;
  parent: string;
  source?: string;
  target?: string;
  geometry?: mxGeometry;
}

export interface mxGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative: boolean;
  points?: { x: number; y: number }[];
}

export abstract class BaseBuilder {
  protected idCounter: number = 2;
  protected cells: mxCell[] = [];

  constructor() {
    // Root cells required by mxGraph
    this.cells.push({ id: '0', value: '', style: '', vertex: false, edge: false, parent: '' });
    this.cells.push({ id: '1', value: '', style: '', vertex: false, edge: false, parent: '0' });
  }

  /** Generate next unique cell ID */
  protected nextId(): string {
    return String(++this.idCounter);
  }

  /** Add a vertex (shape) cell */
  protected addVertex(
    value: string,
    style: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): string {
    const id = this.nextId();
    this.cells.push({
      id,
      value,
      style,
      vertex: true,
      edge: false,
      parent: '1',
      geometry: { x, y, width, height, relative: false },
    });
    return id;
  }

  /** Add an edge (connector) cell */
  protected addEdge(
    value: string,
    style: string,
    source: string,
    target: string,
  ): string {
    const id = this.nextId();
    this.cells.push({
      id,
      value,
      style,
      vertex: false,
      edge: true,
      parent: '1',
      source,
      target,
      geometry: { x: 0, y: 0, width: 0, height: 0, relative: true },
    });
    return id;
  }

  /** Add an edge with waypoints (for self-calls, loop-backs) */
  protected addEdgeWithPoints(
    value: string,
    style: string,
    source: string,
    target: string,
    points: { x: number; y: number }[],
  ): string {
    const id = this.nextId();
    this.cells.push({
      id,
      value,
      style,
      vertex: false,
      edge: true,
      parent: '1',
      source,
      target,
      geometry: { x: 0, y: 0, width: 0, height: 0, relative: true, points },
    });
    return id;
  }

  /** Serialize all cells to mxGraphModel XML */
  serialize(): string {
    const cellsXml = this.cells
      .map((cell) => this.cellToXml(cell))
      .join('\n    ');

    return `<mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
  <root>
    ${cellsXml}
  </root>
</mxGraphModel>`;
  }

  /** Convert a single mxCell to XML element string */
  private cellToXml(cell: mxCell): string {
    const attrs: string[] = [`id="${cell.id}"`];

    if (cell.value) attrs.push(`value="${this.escapeXml(cell.value)}"`);
    if (cell.style) attrs.push(`style="${cell.style}"`);
    if (cell.parent != null) attrs.push(`parent="${cell.parent}"`);
    if (cell.vertex) attrs.push('vertex="1"');
    if (cell.edge) attrs.push('edge="1"');
    if (cell.source) attrs.push(`source="${cell.source}"`);
    if (cell.target) attrs.push(`target="${cell.target}"`);

    const geom = cell.geometry;
    if (!geom) {
      return `<mxCell ${attrs.join(' ')} />`;
    }

    const geomAttrs: string[] = [];
    if (!geom.relative) {
      geomAttrs.push(`x="${geom.x}"`, `y="${geom.y}"`, `width="${geom.width}"`, `height="${geom.height}"`);
    }
    geomAttrs.push(`as="geometry"`);
    if (geom.relative) geomAttrs.push('relative="1"');

    // Serialize waypoints if present
    let pointsXml = '';
    if (geom.points && geom.points.length > 0) {
      pointsXml = '\n        <Array as="points">' +
        geom.points.map((p) => `\n          <mxPoint x="${p.x}" y="${p.y}" />`).join('') +
        '\n        </Array>';
    }

    return `<mxCell ${attrs.join(' ')}>
      <mxGeometry ${geomAttrs.join(' ')}>${pointsXml}
      </mxGeometry>
    </mxCell>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /** Subclasses implement diagram-specific cell generation */
  abstract build(): void;

  /** Subclasses implement auto-positioning */
  abstract layout(): void;
}
