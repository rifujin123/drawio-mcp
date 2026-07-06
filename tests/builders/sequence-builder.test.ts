import { describe, it, expect } from 'vitest';
import { SequenceDiagramBuilder } from '../../src/builders/sequence-builder.js';
import { SequenceDiagramInput } from '../../src/types/sequence-diagram.js';

describe('SequenceDiagramBuilder', () => {
  const minimalInput: SequenceDiagramInput = {
    participants: [
      { name: 'Client', type: 'actor' },
      { name: 'Server', type: 'lifeline' },
    ],
    messages: [
      { from: 'Client', to: 'Server', label: 'request()', type: 'synchronous', order: 1 },
      { from: 'Server', to: 'Client', label: 'response()', type: 'return', order: 2 },
    ],
  };

  it('should create root cells', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('id="0"');
    expect(xml).toContain('id="1"');
  });

  it('should create participant vertices', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('Client');
    expect(xml).toContain('Server');
  });

  it('should create lifeline edges', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('dashed=1');
  });

  it('should create message edges', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('request()');
    expect(xml).toContain('response()');
  });

  it('should place elements after layout', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('x="');
    expect(xml).toContain('y="');
  });

  it('should produce valid mxGraphModel XML', () => {
    const builder = new SequenceDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('</mxGraphModel>');
  });
});
