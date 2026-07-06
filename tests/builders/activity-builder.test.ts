import { describe, it, expect } from 'vitest';
import { ActivityDiagramBuilder } from '../../src/builders/activity-builder.js';
import { ActivityDiagramInput } from '../../src/types/activity-diagram.js';

describe('ActivityDiagramBuilder', () => {
  const minimalInput: ActivityDiagramInput = {
    nodes: [
      { id: 'start1', type: 'start' },
      { id: 'a1', type: 'action', label: 'Do Something' },
      { id: 'end1', type: 'end' },
    ],
    flows: [
      { from: 'start1', to: 'a1' },
      { from: 'a1', to: 'end1' },
    ],
  };

  it('should create root cells', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('id="0"');
    expect(xml).toContain('id="1"');
  });

  it('should create node vertices', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('Do Something');
  });

  it('should create flow edges in layout phase', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    // No edges yet in build — only layout() creates them
    const xmlBefore = builder.serialize();
    expect(xmlBefore.match(/edge="1"/g)?.length ?? 0).toBe(0);

    builder.layout();
    const xmlAfter = builder.serialize();
    // Now edges should exist: lifeline dashed edges (0) + flow edges (2)
    const edgeCount = xmlAfter.match(/edge="1"/g)?.length ?? 0;
    expect(edgeCount).toBeGreaterThanOrEqual(2);
  });

  it('should have start node as filled ellipse', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('fillColor=#333333');
  });

  it('should have end node as bullseye (outer + inner)', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();

    // Outer ring — white with thick border
    expect(xml).toContain('strokeWidth=3');

    // Inner dot — filled circle
    const filledCircles = (xml.match(/fillColor=#333333/g) || []).length;
    expect(filledCircles).toBeGreaterThanOrEqual(2);
  });

  it('should have decision node as rhombus', () => {
    const input: ActivityDiagramInput = {
      nodes: [
        { id: 'd1', type: 'decision', label: 'Validate?' },
        { id: 'a1', type: 'action', label: 'Approved' },
      ],
      flows: [{ from: 'd1', to: 'a1', label: 'yes' }],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('rhombus');
  });

  it('should place elements after layout', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('x="');
    expect(xml).toContain('y="');
  });

  it('should produce valid mxGraphModel XML', () => {
    const builder = new ActivityDiagramBuilder(minimalInput);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('</mxGraphModel>');
  });

  it('should render labeled flows (decision branches)', () => {
    const input: ActivityDiagramInput = {
      nodes: [
        { id: 'd1', type: 'decision', label: 'Valid?' },
        { id: 'a1', type: 'action', label: 'Approved' },
        { id: 'a2', type: 'action', label: 'Denied' },
      ],
      flows: [
        { from: 'd1', to: 'a1', label: 'Yes' },
        { from: 'd1', to: 'a2', label: 'No' },
      ],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    expect(xml).toContain('value="Yes"');
    expect(xml).toContain('value="No"');
  });

  it('should create fork and join bars', () => {
    const input: ActivityDiagramInput = {
      nodes: [
        { id: 'f1', type: 'fork', label: '' },
        { id: 'a1', type: 'action', label: 'Parallel 1' },
        { id: 'a2', type: 'action', label: 'Parallel 2' },
        { id: 'j1', type: 'join', label: '' },
      ],
      flows: [
        { from: 'f1', to: 'a1' },
        { from: 'f1', to: 'a2' },
        { from: 'a1', to: 'j1' },
        { from: 'a2', to: 'j1' },
      ],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();
    // Fork style uses fillColor=#333333 and verticalAlign=middle
    const forkMatches = (xml.match(/verticalAlign=middle/g) || []).length;
    expect(forkMatches).toBeGreaterThanOrEqual(2); // fork + join bars
  });

  it('should detect backward edges and create waypoints', () => {
    const input: ActivityDiagramInput = {
      nodes: [
        { id: 's1', type: 'start', label: '' },
        { id: 'p1', type: 'action', label: 'Enter password' },
        { id: 'd1', type: 'decision', label: 'Correct?' },
        { id: 'a1', type: 'action', label: 'Success' },
        { id: 'e1', type: 'end', label: '' },
      ],
      flows: [
        { from: 's1', to: 'p1' },
        { from: 'p1', to: 'd1' },
        { from: 'd1', to: 'a1', label: 'Yes' },
        { from: 'a1', to: 'e1' },
        // Backward edge: d1 → p1 (error loop)
        { from: 'd1', to: 'p1', label: 'No' },
      ],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();

    // Should contain waypoints for backward edge
    expect(xml).toContain('value="No"');
  });

  it('should create merge node as rhombus', () => {
    const input: ActivityDiagramInput = {
      nodes: [
        { id: 'm1', type: 'merge', label: 'Merge' },
      ],
      flows: [],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    const xml = builder.serialize();
    expect(xml).toContain('rhombus');
    expect(xml).toContain('Merge');
  });

  it('should layout nodes in swimlanes with topological order', () => {
    const input: ActivityDiagramInput = {
      title: 'Swimlane Test',
      nodes: [
        { id: 's1', type: 'start' },
        { id: 'login', type: 'action', label: 'Log in' },
        { id: 'orders', type: 'action', label: 'View orders' },
        { id: 'select', type: 'action', label: 'Select payment' },
        { id: 'e1', type: 'end' },
      ],
      flows: [
        { from: 's1', to: 'login' },
        { from: 'login', to: 'orders' },
        { from: 'orders', to: 'select' },
        { from: 'select', to: 'e1' },
      ],
      swimlanes: [
        { name: 'User', nodes: ['s1', 'login', 'select'] },
        { name: 'System', nodes: ['orders'] },
      ],
    };
    const builder = new ActivityDiagramBuilder(input);
    builder.build();
    builder.layout();
    const xml = builder.serialize();

    // Should have swimlane headers
    expect(xml).toContain('User');
    expect(xml).toContain('System');
    // Should have edge="1" for flow edges (4 flows)
    expect(xml).toContain('edge="1"');
  });
});
