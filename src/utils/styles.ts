/**
 * Draw.io cell styles for UML diagrams.
 * Each style is a semicolon-delimited string matching draw.io mxGraph format.
 */

// ─── Base Styles ──────────────────────────────────────────────

/** Default font family used across all diagram elements */
export const DEFAULT_FONT = 'Helvetica';

/** Default font size */
export const DEFAULT_FONT_SIZE = 12;

// ─── Class Diagram Styles ─────────────────────────────────────

/** Regular class (concrete) — white fill, dark border */
export const CLASS_STYLE = 'rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Abstract class — italic fontStyle=2 */
export const ABSTRACT_CLASS_STYLE = 'rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;fontStyle=2;';

/** Interface — light blue ellipse with <<interface>> stereotype */
export const INTERFACE_STYLE = 'ellipse;whiteSpace=wrap;html=1;fillColor=#e8f0fe;strokeColor=#1a73e8;fontFamily=Helvetica;fontSize=12;fontStyle=2;';

/** Enum — light green */
export const ENUM_STYLE = 'rounded=0;whiteSpace=wrap;html=1;fillColor=#e6ffe6;strokeColor=#2e7d32;fontFamily=Helvetica;fontSize=12;';

// ─── Class Diagram Edge Styles ────────────────────────────────

/** Association — open arrow, solid line */
export const ASSOCIATION_STYLE = 'endArrow=open;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Inheritance / Generalization — hollow triangle (block), solid line */
export const INHERITANCE_STYLE = 'endArrow=block;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Composition — filled diamond on source, solid line */
export const COMPOSITION_STYLE = 'startArrow=diamond;startFill=1;endArrow=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Aggregation — hollow diamond on source, solid line */
export const AGGREGATION_STYLE = 'startArrow=diamond;startFill=0;endArrow=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Dependency — open arrow, dashed line */
export const DEPENDENCY_STYLE = 'endArrow=open;endFill=0;dashed=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Realization — hollow triangle, dashed line */
export const REALIZATION_STYLE = 'endArrow=block;endFill=0;dashed=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

// ─── Use Case Diagram Styles ──────────────────────────────────

/** Actor (stick figure) — UML-correct shape */
export const ACTOR_STYLE = 'shape=umlActor;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;verticalLabelPosition=bottom;verticalAlign=top;align=center;';

/** Use case — white ellipse (UML-correct, no fill) */
export const USECASE_STYLE = 'ellipse;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;align=center;';

/** System boundary — large dashed rectangle */
export const SYSTEM_BOUNDARY_STYLE = 'rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#666666;fontFamily=Helvetica;fontSize=14;fontStyle=1;';

/** Use case association — solid line, no arrow */
export const USECASE_ASSOCIATION_STYLE = 'endArrow=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Include — dashed arrow with «include» label */
export const INCLUDE_STYLE = 'endArrow=open;endFill=0;dashed=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Extend — dashed arrow with «extend» label */
export const EXTEND_STYLE = 'endArrow=open;endFill=0;dashed=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Use case generalization — hollow triangle */
export const USECASE_GENERALIZATION_STYLE = 'endArrow=block;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Actor generalization — hollow triangle (same visual as use case gen) */
export const ACTOR_GENERALIZATION_STYLE = 'endArrow=block;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

// ─── Activity Diagram Styles ──────────────────────────────────

/** Start node — small filled circle */
export const START_NODE_STYLE = 'ellipse;fillColor=#333333;strokeColor=#333333;html=1;';

/** End node — circle with hollow center, thick border (bullseye outer ring) */
export const END_NODE_STYLE = 'ellipse;fillColor=#ffffff;strokeColor=#333333;strokeWidth=3;html=1;';

/** End node inner dot — filled circle for bullseye center */
export const END_INNER_STYLE = 'ellipse;fillColor=#333333;strokeColor=#333333;html=1;';

/** Action node — rounded rectangle, transparent */
export const ACTION_STYLE = 'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;arcSize=10;';

/** Decision node — diamond, transparent */
export const DECISION_STYLE = 'rhombus;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;';

/** Fork/Join bar — thin rectangle, horizontal, solid */
export const FORK_STYLE = 'verticalAlign=middle;whiteSpace=wrap;html=1;fillColor=#333333;strokeColor=#333333;';

/** Activity edge — arrow, orthogonal (gấp khúc) */
export const ACTIVITY_FLOW_STYLE = 'endArrow=open;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;curved=0;edgeStyle=orthogonalEdgeStyle;';

/** Swimlane — tall rectangle with header, transparent */
export const SWIMLANE_STYLE = 'swimlane;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=14;fontStyle=1;';

// ─── Sequence Diagram Styles ──────────────────────────────────

/** Generic participant (fallback) — ellipse, transparent */
export const PARTICIPANT_STYLE = 'ellipse;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;fontFamily=Helvetica;fontSize=12;align=center;verticalAlign=middle;';

/** Actor participant — stick figure (UML-correct) with label below, transparent */
export const ACTOR_PARTICIPANT_STYLE = 'shape=umlActor;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;fillColor=none;strokeColor=#333333;verticalLabelPosition=bottom;verticalAlign=top;align=center;';

/** Boundary participant — UML boundary symbol, transparent */
export const BOUNDARY_STYLE = 'shape=umlBoundary;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;align=center;verticalAlign=middle;fillColor=none;strokeColor=#333333;';

/** Control participant — UML control symbol, transparent */
export const CONTROL_STYLE = 'shape=umlControl;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;align=center;verticalAlign=middle;fillColor=none;strokeColor=#333333;';

/** Entity participant — UML entity symbol, transparent */
export const ENTITY_STYLE = 'shape=umlEntity;whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;align=center;verticalAlign=middle;fillColor=none;strokeColor=#333333;';

/** Lifeline — dashed vertical line */
export const LIFELINE_STYLE = 'endArrow=none;dashed=1;strokeColor=#999999;';

/** Activation bar — hollow with dark border */
export const ACTIVATION_STYLE = 'verticalAlign=top;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#333333;strokeWidth=2;';

/** Synchronous message — filled arrowhead (UML-correct), straight line */
export const SYNC_MESSAGE_STYLE = 'endArrow=block;endFill=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=11;curved=0;edgeStyle=none;';

/** Asynchronous message — open arrowhead, solid line (UML-correct), straight line */
export const ASYNC_MESSAGE_STYLE = 'endArrow=open;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=11;curved=0;edgeStyle=none;';

/** Return message — dashed line, open arrowhead, straight line */
export const RETURN_MESSAGE_STYLE = 'endArrow=open;endFill=0;dashed=1;strokeColor=#666666;fontFamily=Helvetica;fontSize=11;curved=0;edgeStyle=none;';

/** Create message — dashed, open arrow, straight line */
export const CREATE_MESSAGE_STYLE = 'endArrow=open;endFill=0;dashed=1;strokeColor=#333333;fontFamily=Helvetica;fontSize=11;curved=0;edgeStyle=none;';

/** Destroy message — X at target, straight line */
export const DESTROY_MESSAGE_STYLE = 'endArrow=open;endFill=0;strokeColor=#333333;fontFamily=Helvetica;fontSize=11;curved=0;edgeStyle=none;';

/** Combined fragment — large dashed rectangle */
export const FRAGMENT_STYLE = 'rounded=1;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#444444;fontFamily=Helvetica;fontSize=12;fontStyle=1;';
