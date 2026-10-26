export type SignaturePoint = [number, number];
export type SignatureStrokes = SignaturePoint[][];

const SIGNATURE_PREFIX = "gksig:v1:";
const MAX_SIGNATURE_POINTS = 800;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function encodeReportSignature(strokes: SignatureStrokes) {
  const normalized: SignatureStrokes = [];
  let pointCount = 0;

  for (const stroke of strokes) {
    const cleanStroke: SignaturePoint[] = [];
    for (const point of stroke) {
      if (pointCount >= MAX_SIGNATURE_POINTS) break;
      if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
      cleanStroke.push([
        Number(clamp(point[0]).toFixed(4)),
        Number(clamp(point[1]).toFixed(4)),
      ]);
      pointCount += 1;
    }
    if (cleanStroke.length > 0) normalized.push(cleanStroke);
    if (pointCount >= MAX_SIGNATURE_POINTS) break;
  }

  return normalized.length ? `${SIGNATURE_PREFIX}${JSON.stringify(normalized)}` : "";
}

export function parseReportSignature(value?: string | null): SignatureStrokes | null {
  if (!value?.startsWith(SIGNATURE_PREFIX)) return null;

  try {
    const parsed = JSON.parse(value.slice(SIGNATURE_PREFIX.length));
    if (!Array.isArray(parsed)) return null;

    const strokes: SignatureStrokes = [];
    let pointCount = 0;
    for (const stroke of parsed) {
      if (!Array.isArray(stroke)) continue;
      const cleanStroke: SignaturePoint[] = [];
      for (const point of stroke) {
        if (pointCount >= MAX_SIGNATURE_POINTS) break;
        if (
          !Array.isArray(point) ||
          point.length < 2 ||
          !Number.isFinite(point[0]) ||
          !Number.isFinite(point[1])
        ) continue;
        cleanStroke.push([clamp(point[0]), clamp(point[1])]);
        pointCount += 1;
      }
      if (cleanStroke.length > 0) strokes.push(cleanStroke);
      if (pointCount >= MAX_SIGNATURE_POINTS) break;
    }
    return strokes.length ? strokes : null;
  } catch {
    return null;
  }
}

export function isDrawnReportSignature(value?: string | null) {
  return parseReportSignature(value) !== null;
}
