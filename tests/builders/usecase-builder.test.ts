import { describe, it, expect } from 'vitest';
import { UseCaseDiagramBuilder } from '../../src/builders/usecase-builder.js';
import { UseCaseDiagramInput } from '../../src/types/usecase-diagram.js';

describe('UseCaseDiagramBuilder', () => {
  const minimalInput: UseCaseDiagramInput = {
    actors: [{ name: 'Customer' }],
    useCases: [{ name: 'Place Order', id: 'uc1' }],
    associations: [{ actor: 'Customer', useCase: 'uc1' }],
  };

  it('should create root cells', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('id="0"');
    expect(xml).toContain('id="1"');
  });

  it('should create actor and use case vertices', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('Customer');
    expect(xml).toContain('Place Order');
  });

  it('should create association edges', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('edge="1"');
  });

  it('should create include relationships', () => {
    const input: UseCaseDiagramInput = {
      actors: [{ name: 'Admin' }],
      useCases: [
        { name: 'Login', id: 'uc1' },
        { name: 'Authenticate', id: 'uc2' },
      ],
      associations: [{ actor: 'Admin', useCase: 'uc1' }],
      relationships: [{ from: 'uc1', to: 'uc2', type: 'include' }],
    };
    const builder = new UseCaseDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('«include»');
  });

  it('should create extend relationships', () => {
    const input: UseCaseDiagramInput = {
      actors: [{ name: 'User' }],
      useCases: [
        { name: 'Pay', id: 'uc1' },
        { name: 'Discount', id: 'uc2' },
      ],
      associations: [{ actor: 'User', useCase: 'uc1' }],
      relationships: [{ from: 'uc2', to: 'uc1', type: 'extend' }],
    };
    const builder = new UseCaseDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('«extend»');
  });

  it('should place elements after layout', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('x="');
    expect(xml).toContain('y="');
  });

  it('should produce valid mxGraphModel XML', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('</mxGraphModel>');
  });
});
