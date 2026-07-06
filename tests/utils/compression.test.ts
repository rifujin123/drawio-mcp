import { describe, it, expect } from 'vitest';
import { compressDiagram, decompressDiagram, wrapInMxfile } from '../../src/utils/compression.js';

describe('compression', () => {
  const sampleXml = '<mxGraphModel><root><mxCell id="0" /></root></mxGraphModel>';

  it('should compress and decompress round-trip', () => {
    const compressed = compressDiagram(sampleXml);
    expect(compressed).toBeTruthy();
    expect(typeof compressed).toBe('string');

    const decompressed = decompressDiagram(compressed);
    expect(decompressed).toBe(sampleXml);
  });

  it('should wrap in mxfile with compressed diagram', () => {
    const result = wrapInMxfile(sampleXml, 'Test Diagram', true);
    expect(result).toContain('<mxfile');
    expect(result).toContain('<diagram name="Test Diagram"');
    expect(result).toContain('<compressed>');
  });

  it('should wrap in mxfile with uncompressed diagram', () => {
    const result = wrapInMxfile(sampleXml, 'Test Diagram', false);
    expect(result).toContain('<mxfile');
    expect(result).toContain('<xml>');
    expect(result).toContain(sampleXml);
  });
});
