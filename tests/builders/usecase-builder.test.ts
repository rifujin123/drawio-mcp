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

  it('should create actor generalization', () => {
    const input: UseCaseDiagramInput = {
      actors: [
        { name: 'Customer' },
        { name: 'PremiumCustomer' },
      ],
      useCases: [
        { name: 'Order', id: 'uc1' },
        { name: 'Payment', id: 'uc2' },
      ],
      associations: [
        { actor: 'Customer', useCase: 'uc1' },
        { actor: 'PremiumCustomer', useCase: 'uc1' },
      ],
      actorRelationships: [
        { from: 'PremiumCustomer', to: 'Customer', type: 'generalization' },
      ],
    };
    const builder = new UseCaseDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    // Should create a generalization edge between actors
    expect(xml).toContain('source="4"');
    expect(xml).toContain('target="3"');
    // Should use hollow triangle (block arrow, no fill)
    expect(xml).toContain('endArrow=block');
  });

  it('should render actor as stick figure', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    // Actor should use umlActor shape (stick figure), not a rectangle
    expect(xml).toContain('shape=umlActor');
  });

  it('should render use case with no fill', () => {
    const builder = new UseCaseDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    // Use case should be white/no fill ellipse
    expect(xml).toContain('fillColor=none');
  });

  it('should layout in 2-column grid for many use cases', () => {
    const input: UseCaseDiagramInput = {
      actors: [{ name: 'User' }],
      useCases: [
        { name: 'UC1', id: 'uc1' },
        { name: 'UC2', id: 'uc2' },
        { name: 'UC3', id: 'uc3' },
        { name: 'UC4', id: 'uc4' },
        { name: 'UC5', id: 'uc5' },
        { name: 'UC6', id: 'uc6' },
        { name: 'UC7', id: 'uc7' },
      ],
      associations: [
        { actor: 'User', useCase: 'uc1' },
        { actor: 'User', useCase: 'uc2' },
        { actor: 'User', useCase: 'uc3' },
        { actor: 'User', useCase: 'uc4' },
        { actor: 'User', useCase: 'uc5' },
        { actor: 'User', useCase: 'uc6' },
        { actor: 'User', useCase: 'uc7' },
      ],
    };
    const builder = new UseCaseDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    // Find all mxGeometry x positions (use cases are in 2+ columns)
    const xMatches = xml.matchAll(/mxGeometry[^>]*x="([\d.]+)"/g);
    const xPositions: number[] = [];
    for (const m of xMatches) {
      xPositions.push(parseFloat(m[1]));
    }
    // Actor is at x=60, use cases should have 2 distinct x values
    const nonActorX = [...new Set(xPositions)].filter(x => x > 100);
    expect(nonActorX.length).toBeGreaterThanOrEqual(2);
  });
});
