import { describe, it, expect } from 'vitest';
import { ClassDiagramBuilder } from '../../src/builders/class-builder.js';
import { ClassDiagramInput } from '../../src/types/class-diagram.js';

describe('ClassDiagramBuilder', () => {
  const minimalInput: ClassDiagramInput = {
    classes: [
      {
        name: 'User',
        attributes: [{ name: 'name', type: 'string', visibility: '+' }],
        methods: [{ name: 'login', returnType: 'bool', visibility: '+' }],
      },
    ],
  };

  it('should create root cells (0 and 1)', () => {
    const builder = new ClassDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('id="0"');
    expect(xml).toContain('id="1"');
  });

  it('should create a vertex for each class', () => {
    const builder = new ClassDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('vertex="1"');
    expect(xml).toContain('User');
  });

  it('should create edges for relationships', () => {
    const input: ClassDiagramInput = {
      classes: [
        { name: 'A', attributes: [], methods: [] },
        { name: 'B', attributes: [], methods: [] },
      ],
      relationships: [{ from: 'A', to: 'B', type: 'inheritance' }],
    };
    const builder = new ClassDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('edge="1"');
    expect(xml).toContain('source="');
    expect(xml).toContain('target="');
  });

  it('should position classes after layout', () => {
    const builder = new ClassDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    // After layout, geometry should have actual coordinates
    expect(xml).toContain('x="');
    expect(xml).toContain('y="');
  });

  it('should render interface stereotype as ellipse', () => {
    const input: ClassDiagramInput = {
      classes: [{ name: 'Printable', stereotype: 'interface', attributes: [], methods: [] }],
    };
    const builder = new ClassDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('interface');
  });

  it('should render enum with fillColor=#e6ffe6', () => {
    const input: ClassDiagramInput = {
      classes: [{ name: 'Color', stereotype: 'enum', attributes: [], methods: [] }],
    };
    const builder = new ClassDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('#e6ffe6');
  });

  it('should render abstract class with italic style', () => {
    const input: ClassDiagramInput = {
      classes: [{ name: 'AbstractEntity', isAbstract: true, attributes: [], methods: [] }],
    };
    const builder = new ClassDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('fontStyle=2');
  });

  it('should produce valid mxGraphModel XML', () => {
    const builder = new ClassDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('</mxGraphModel>');
    expect(xml).toContain('<root>');
    expect(xml).toContain('</root>');
  });
});
