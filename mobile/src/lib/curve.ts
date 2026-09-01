/** Catmull-Rom smoothed SVG path builder — ported from the design prototype's smooth()/series(). */
export interface Point {
  x: number;
  y: number;
}

export function smoothPath(pts: Point[]): string {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

export function series(vals: number[], w: number, h: number): Point[] {
  const step = w / Math.max(1, vals.length - 1);
  return vals.map((v, i) => ({
    x: +(i * step).toFixed(1),
    y: +(h - 12 - (v / 100) * (h - 28)).toFixed(1),
  }));
}

export function areaPath(pts: Point[], w: number, h: number): string {
  return `${smoothPath(pts)} L${w},${h} L0,${h} Z`;
}
