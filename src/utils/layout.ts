/**
 * Grid-based auto-layout helpers for UML diagrams.
 * Each builder places its elements on a virtual grid.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Point, Size {}

/** Default grid spacing */
export const GRID_SPACING_X = 60;
export const GRID_SPACING_Y = 60;

/** Standard element dimensions */
export const CLASS_WIDTH = 220;
export const CLASS_MIN_HEIGHT = 80;

export const USECASE_WIDTH = 180;
export const USECASE_HEIGHT = 60;

export const ACTOR_WIDTH = 70;
export const ACTOR_HEIGHT = 75;

export const ACTIVITY_WIDTH = 180;
export const ACTIVITY_HEIGHT = 60;

export const DECISION_WIDTH = 120;
export const DECISION_HEIGHT = 120;

export const PARTICIPANT_WIDTH = 140;
export const PARTICIPANT_HEIGHT = 50;

export const SEQUENCE_DIAGRAM_Y_GAP = 60;
export const ACTIVATION_BAR_WIDTH = 16;

/**
 * Arrange elements in a vertical column layout (top-to-bottom).
 */
export function verticalLayout(
  count: number,
  elementHeight: number,
  startX: number,
  startY: number,
  gap: number = GRID_SPACING_Y,
): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: startX,
    y: startY + i * (elementHeight + gap),
  }));
}

/**
 * Arrange elements in a horizontal row layout (left-to-right).
 */
export function horizontalLayout(
  count: number,
  elementWidth: number,
  startX: number,
  startY: number,
  gap: number = GRID_SPACING_X,
): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * (elementWidth + gap),
    y: startY,
  }));
}

/**
 * Arrange elements in a grid (row-major).
 */
export function gridLayout(
  count: number,
  cols: number,
  elementWidth: number,
  elementHeight: number,
  startX: number,
  startY: number,
  gapX: number = GRID_SPACING_X,
  gapY: number = GRID_SPACING_Y,
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      x: startX + col * (elementWidth + gapX),
      y: startY + row * (elementHeight + gapY),
    };
  });
}

/**
 * Center a point horizontally within a given bounds.
 */
export function centerX(bounds: Bounds, width: number): number {
  return bounds.x + (bounds.width - width) / 2;
}
