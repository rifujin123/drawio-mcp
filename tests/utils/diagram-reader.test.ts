import { describe, it, expect } from 'vitest';
import {
  parseMxGraphXml,
  serializeMxGraphXml,
  parseDrawioContent,
  getNextCellId,
  resolveFilePath,
  ParsedCell,
} from '../../src/utils/diagram-reader.js';
import { wrapInMxfile, compressDiagram } from '../../src/utils/compression.js';

describe('DiagramReader', () => {
  describe('parseMxGraphXml', () => {
    it('should parse simple vertex cells', () => {
      const xml = `<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <mxCell id="2" value="Login" style="ellipse" parent="1" vertex="1">
      <mxGeometry x="60" y="60" width="140" height="50" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      expect(cells.length).toBe(3);

      const cell = cells[2];
      expect(cell.id).toBe('2');
      expect(cell.value).toBe('Login');
      expect(cell.style).toBe('ellipse');
      expect(cell.vertex).toBe(true);
      expect(cell.parent).toBe('1');
      expect(cell.geometry?.x).toBe(60);
      expect(cell.geometry?.y).toBe(60);
      expect(cell.geometry?.width).toBe(140);
      expect(cell.geometry?.height).toBe(50);
    });

    it('should parse edge cells', () => {
      const xml = `<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <mxCell id="3" value="request()" style="endArrow=block" parent="1" edge="1" source="2" target="4">
      <mxGeometry as="geometry" relative="1" />
    </mxCell>
  </root>
</mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      const cell = cells[2];
      expect(cell.id).toBe('3');
      expect(cell.value).toBe('request()');
      expect(cell.edge).toBe(true);
      expect(cell.source).toBe('2');
      expect(cell.target).toBe('4');
      expect(cell.geometry?.relative).toBe(true);
    });

    it('should parse waypoints (mxPoint array)', () => {
      const xml = `<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <mxCell id="5" parent="1" edge="1" source="2" target="3">
      <mxGeometry as="geometry" relative="1">
        <Array as="points">
          <mxPoint x="395" y="210" />
          <mxPoint x="445" y="210" />
        </Array>
      </mxGeometry>
    </mxCell>
  </root>
</mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      const cell = cells[2];
      expect(cell.geometry?.points).toBeDefined();
      expect(cell.geometry?.points?.length).toBe(2);
      expect(cell.geometry?.points?.[0]).toEqual({ x: 395, y: 210 });
      expect(cell.geometry?.points?.[1]).toEqual({ x: 445, y: 210 });
    });

    it('should handle self-closing mxCell elements', () => {
      const xml = `<mxGraphModel><root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root></mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      expect(cells.length).toBe(2);
    });

    it('should unescape XML entities in values', () => {
      const xml = `<mxGraphModel><root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;" parent="1" vertex="1">
          <mxGeometry x="0" y="0" width="10" height="10" as="geometry" />
        </mxCell>
      </root></mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      expect(cells[2].value).toBe('A & B < C > D "E" \'F\'');
    });

    it('should parse root cells (no geometry)', () => {
      const xml = `<mxGraphModel><root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root></mxGraphModel>`;

      const cells = parseMxGraphXml(xml);
      expect(cells[0].id).toBe('0');
      expect(cells[0].parent).toBeUndefined();
      expect(cells[1].id).toBe('1');
      expect(cells[1].parent).toBe('0');
    });
  });

  describe('serializeMxGraphXml', () => {
    it('should round-trip parse → serialize → parse', () => {
      const originalXml = `<mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <mxCell id="2" value="Login" style="ellipse" parent="1" vertex="1">
      <mxGeometry x="60" y="60" width="140" height="50" as="geometry" />
    </mxCell>
    <mxCell id="3" value="response()" style="endArrow=open;dashed=1" parent="1" edge="1" source="2" target="4">
      <mxGeometry as="geometry" relative="1" />
    </mxCell>
  </root>
</mxGraphModel>`;

      const cells = parseMxGraphXml(originalXml);
      expect(cells.length).toBe(4);

      const serialized = serializeMxGraphXml(cells);
      expect(serialized).toContain('<mxGraphModel');
      expect(serialized).toContain('value="Login"');
      expect(serialized).toContain('value="response()"');
      expect(serialized).toContain('edge="1"');
      expect(serialized).toContain('vertex="1"');

      // Re-parse to verify round-trip
      const reparsed = parseMxGraphXml(serialized);
      expect(reparsed.length).toBe(4);
      expect(reparsed[2].value).toBe('Login');
      expect(reparsed[3].value).toBe('response()');
    });

    it('should serialize waypoints correctly', () => {
      const cells: ParsedCell[] = [
        { id: '0', parent: '' },
        { id: '1', parent: '0' },
        {
          id: '5',
          parent: '1',
          edge: true,
          source: '2',
          target: '3',
          geometry: {
            x: 0, y: 0, width: 0, height: 0,
            relative: true,
            points: [
              { x: 395, y: 210 },
              { x: 445, y: 210 },
            ],
          },
        },
      ];

      const xml = serializeMxGraphXml(cells);
      expect(xml).toContain('<Array as="points">');
      expect(xml).toContain('<mxPoint x="395" y="210" />');
      expect(xml).toContain('<mxPoint x="445" y="210" />');

      // Parse back
      const reparsed = parseMxGraphXml(xml);
      expect(reparsed[2].geometry?.points?.length).toBe(2);
    });
  });

  describe('parseDrawioContent', () => {
    it('should parse compressed .drawio content', () => {
      // Build minimal compressed content
      const xml = `<mxGraphModel><root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Test" parent="1" vertex="1">
          <mxGeometry x="10" y="20" width="100" height="30" as="geometry" />
        </mxCell>
      </root></mxGraphModel>`;

      const drawioContent = wrapInMxfile(xml, 'Test Diagram', true);

      const parsed = parseDrawioContent(drawioContent);
      expect(parsed.diagramName).toBe('Test Diagram');
      expect(parsed.cells.length).toBe(3);
      expect(parsed.cells[2].value).toBe('Test');
    });

    it('should extract diagram name', () => {
      const xml = `<mxGraphModel><root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root></mxGraphModel>`;
      const content = wrapInMxfile(xml, 'My Diagram', true);

      const parsed = parseDrawioContent(content);
      expect(parsed.diagramName).toBe('My Diagram');
    });
  });

  describe('getNextCellId', () => {
    it('should return max+1', () => {
      const cells: ParsedCell[] = [
        { id: '0' },
        { id: '1' },
        { id: '5' },
        { id: '12' },
      ];
      expect(getNextCellId(cells)).toBe('13');
    });

    it('should handle string IDs', () => {
      const cells: ParsedCell[] = [
        { id: '0' },
        { id: '1' },
        { id: 'cell-abc' },
      ];
      expect(getNextCellId(cells)).toBe('2');
    });
  });

  describe('resolveFilePath', () => {
    it('should return absolute paths unchanged', () => {
      const result = resolveFilePath('C:\\absolute\\path.drawio');
      expect(result).toBe('C:\\absolute\\path.drawio');
    });

    it('should resolve relative paths against output/', () => {
      const result = resolveFilePath('test.drawio');
      expect(result).toContain('output');
      expect(result).toContain('test.drawio');
    });

    it('should strip output/ prefix from relative paths', () => {
      const result = resolveFilePath('output/test.drawio');
      expect(result).toContain('output');
      expect(result).not.toContain('output\\output');
    });
  });
});
