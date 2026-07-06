import { describe, it, expect } from 'vitest';
import {
  CLASS_STYLE,
  ABSTRACT_CLASS_STYLE,
  INTERFACE_STYLE,
  ENUM_STYLE,
  INHERITANCE_STYLE,
  ASSOCIATION_STYLE,
  COMPOSITION_STYLE,
  AGGREGATION_STYLE,
  DEPENDENCY_STYLE,
  REALIZATION_STYLE,
  START_NODE_STYLE,
  END_NODE_STYLE,
  ACTION_STYLE,
  DECISION_STYLE,
  USECASE_STYLE,
  ACTOR_STYLE,
  SYSTEM_BOUNDARY_STYLE,
  PARTICIPANT_STYLE,
  ACTOR_PARTICIPANT_STYLE,
  SYNC_MESSAGE_STYLE,
  ASYNC_MESSAGE_STYLE,
  RETURN_MESSAGE_STYLE,
} from '../../src/utils/styles.js';

describe('styles', () => {
  it('CLASS_STYLE should contain required properties', () => {
    expect(CLASS_STYLE).toContain('html=1');
    expect(CLASS_STYLE).toContain('rounded=0');
    expect(CLASS_STYLE).toContain('whiteSpace=wrap');
  });

  it('ABSTRACT_CLASS_STYLE should be italic', () => {
    expect(ABSTRACT_CLASS_STYLE).toContain('fontStyle=2');
  });

  it('INTERFACE_STYLE should be ellipse', () => {
    expect(INTERFACE_STYLE).toContain('ellipse');
  });

  it('ENUM_STYLE should have green colors', () => {
    expect(ENUM_STYLE).toContain('fillColor=#e6ffe6');
  });

  it('INHERITANCE_STYLE should have hollow block arrow', () => {
    expect(INHERITANCE_STYLE).toContain('endArrow=block');
    expect(INHERITANCE_STYLE).toContain('endFill=0');
  });

  it('COMPOSITION_STYLE should have filled diamond start', () => {
    expect(COMPOSITION_STYLE).toContain('startArrow=diamond');
    expect(COMPOSITION_STYLE).toContain('startFill=1');
  });

  it('AGGREGATION_STYLE should have hollow diamond start', () => {
    expect(AGGREGATION_STYLE).toContain('startArrow=diamond');
    expect(AGGREGATION_STYLE).toContain('startFill=0');
  });

  it('DEPENDENCY_STYLE and REALIZATION_STYLE should be dashed', () => {
    expect(DEPENDENCY_STYLE).toContain('dashed=1');
    expect(REALIZATION_STYLE).toContain('dashed=1');
  });

  it('START_NODE_STYLE should be filled ellipse', () => {
    expect(START_NODE_STYLE).toContain('ellipse');
    expect(START_NODE_STYLE).toContain('fillColor=#333333');
  });

  it('END_NODE_STYLE should have thick border', () => {
    expect(END_NODE_STYLE).toContain('strokeWidth=3');
  });

  it('ACTION_STYLE should be rounded rectangle', () => {
    expect(ACTION_STYLE).toContain('rounded=1');
  });

  it('DECISION_STYLE should be rhombus', () => {
    expect(DECISION_STYLE).toContain('rhombus');
  });

  it('USECASE_STYLE should be ellipse with no fill', () => {
    expect(USECASE_STYLE).toContain('ellipse');
    expect(USECASE_STYLE).toContain('fillColor=none');
  });

  it('ACTOR_STYLE should be stick figure shape', () => {
    expect(ACTOR_STYLE).toContain('shape=umlActor');
  });

  it('SYSTEM_BOUNDARY_STYLE should be dashed', () => {
    expect(SYSTEM_BOUNDARY_STYLE).toContain('dashed=1');
  });

  it('SYNC_MESSAGE_STYLE should have filled arrowhead', () => {
    expect(SYNC_MESSAGE_STYLE).toContain('endArrow=block');
    expect(SYNC_MESSAGE_STYLE).toContain('endFill=1');
  });

  it('RETURN_MESSAGE_STYLE should be dashed with gray', () => {
    expect(RETURN_MESSAGE_STYLE).toContain('dashed=1');
    expect(RETURN_MESSAGE_STYLE).toContain('strokeColor=#666666');
  });
});
