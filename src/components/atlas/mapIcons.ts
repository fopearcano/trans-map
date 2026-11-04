/**
 * Signed-distance-field marker icons generated at runtime (no sprite files).
 * SDF lets MapLibre recolour icons per family and draw a surface-coloured
 * halo ring that separates overlapping markers.
 */
import type { MarkerShape } from "@/domain/categories";

export const ICON_PIXEL_RATIO = 2;
const SIZE = 64; // image pixels
const SDF_RADIUS = 8; // distance range encoded, in image pixels
/** Shape diameter in CSS pixels at icon-size 1. */
export const ICON_BASE_DIAMETER = 20;

type SdfFn = (x: number, y: number) => number; // signed distance, negative inside

const circle = (r: number): SdfFn => (x, y) => Math.hypot(x, y) - r;

const roundedBox = (half: number, radius: number): SdfFn => (x, y) => {
  const qx = Math.abs(x) - (half - radius);
  const qy = Math.abs(y) - (half - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
};

// Inigo Quilez's equilateral triangle SDF (y axis pointing up).
const triangle = (r: number): SdfFn => (x, yDown) => {
  const k = Math.sqrt(3);
  let px = Math.abs(x) - r;
  let py = -yDown + r / k;
  if (px + k * py > 0) {
    const nx = (px - k * py) / 2;
    const ny = (-k * px - py) / 2;
    px = nx;
    py = ny;
  }
  px -= Math.min(Math.max(px, -2 * r), 0);
  return -Math.hypot(px, py) * Math.sign(py);
};

const SHAPES: Record<MarkerShape, SdfFn> = {
  circle: circle(20),
  square: roundedBox(18, 3),
  triangle: triangle(22),
};

export function iconName(shape: MarkerShape, hollow: boolean): string {
  return `tm-${shape}-${hollow ? "ring" : "fill"}`;
}

export function buildSdfIcon(shape: MarkerShape, hollow: boolean): { width: number; height: number; data: Uint8Array } {
  const fn = SHAPES[shape];
  const data = new Uint8Array(SIZE * SIZE * 4);
  const c = SIZE / 2;
  // Triangles look smaller than circles of equal "radius": shift down slightly to centre visually.
  const yShift = shape === "triangle" ? 3 : 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let d = fn(x + 0.5 - c, y + 0.5 - c - yShift);
      if (hollow) d = Math.abs(d) - 3; // ring of ~6 image px (3 CSS px)
      const a = Math.round(255 * (0.75 - d / SDF_RADIUS));
      const i = (y * SIZE + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = Math.max(0, Math.min(255, a));
    }
  }
  return { width: SIZE, height: SIZE, data };
}
