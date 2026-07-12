// Size guide (single source of truth) + the body → size recommender.
//
// The garment measurements below are authoritative: both the Size Guide dialog
// and the "Find My Size" recommender read from them, so the two can never drift
// apart. The recommender is a continuous scoring model (no coarse height/weight
// buckets): every centimeter and kilogram nudges the result proportionally, the
// way an experienced seller would size a customer.

/** Flat-lay garment measurements, in centimeters. `chest` (A) is pit-to-pit
 *  (half chest); `length` (B) is highest shoulder point → bottom hem. */
export type SizeGuideRow = { size: string; chest: number; length: number };

export const SIZE_GUIDE: readonly SizeGuideRow[] = [
  { size: "S", chest: 50, length: 68 },
  { size: "M", chest: 52, length: 70 },
  { size: "L", chest: 54, length: 72 },
  { size: "XL", chest: 56, length: 74 },
  { size: "XXL", chest: 58, length: 78 },
] as const;

// --- Body model ------------------------------------------------------------
//
// We translate each size's guide measurement into the *wearer* body it fits
// best (a "center"), then score how close a customer is to each center.
//
//   • Height drives the shirt LENGTH (B), so it is the primary signal.
//   • Weight fine-tunes for build via the CHEST (A) — it adjusts, not dominates.
//
// The centers are derived straight from the guide by linearly mapping the
// smallest and largest sizes to real wearer anchors, so if the guide changes
// the model follows automatically:
//
//   size S   (length 68, chest 50 → 100 cm round) fits ≈ 164 cm / 56 kg
//   size XXL (length 78, chest 58 → 116 cm round) fits ≈ 193 cm / 90 kg

const WEARER_ANCHORS = {
  minHeightCm: 164,
  maxHeightCm: 193,
  minWeightKg: 56,
  maxWeightKg: 90,
} as const;

// Height slightly outweighs weight (length is height-led); together they still
// both move the result proportionally.
const HEIGHT_WEIGHT = 0.55;
const WEIGHT_WEIGHT = 0.45;

/** Linear map of `v` from the [inMin,inMax] range onto [outMin,outMax]. */
function lerp(inMin: number, inMax: number, v: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

const LENGTHS = SIZE_GUIDE.map((r) => r.length);
const CHEST_ROUNDS = SIZE_GUIDE.map((r) => r.chest * 2); // flat A → body circumference

const MIN_LENGTH = LENGTHS[0];
const MAX_LENGTH = LENGTHS[LENGTHS.length - 1];
const MIN_CHEST = CHEST_ROUNDS[0];
const MAX_CHEST = CHEST_ROUNDS[CHEST_ROUNDS.length - 1];

/** Wearer height (cm) each size fits best — derived from its length (B). */
const HEIGHT_CENTERS = LENGTHS.map((l) =>
  lerp(MIN_LENGTH, MAX_LENGTH, l, WEARER_ANCHORS.minHeightCm, WEARER_ANCHORS.maxHeightCm)
);

/** Wearer weight (kg) each size fits best — derived from its chest (A). */
const WEIGHT_CENTERS = CHEST_ROUNDS.map((c) =>
  lerp(MIN_CHEST, MAX_CHEST, c, WEARER_ANCHORS.minWeightKg, WEARER_ANCHORS.maxWeightKg)
);

/**
 * Continuous fractional position of `value` on a ladder of `centers`. Returns
 * the index (0-based) where the value sits, interpolating linearly between
 * neighbours and extrapolating with the edge slope beyond the ends — so the
 * output changes smoothly for every unit of input (no bucketing).
 */
function fractionalIndex(value: number, centers: number[]): number {
  const n = centers.length;
  if (value <= centers[0]) {
    const slope = 1 / (centers[1] - centers[0]);
    return (value - centers[0]) * slope; // < 0 below the smallest size
  }
  if (value >= centers[n - 1]) {
    const slope = 1 / (centers[n - 1] - centers[n - 2]);
    return n - 1 + (value - centers[n - 1]) * slope; // > n-1 above the largest
  }
  for (let i = 0; i < n - 1; i++) {
    if (value >= centers[i] && value <= centers[i + 1]) {
      return i + (value - centers[i]) / (centers[i + 1] - centers[i]);
    }
  }
  return 0;
}

/**
 * The customer's ideal position on the SIZE_GUIDE ladder (0 = S … 4 = XXL) as a
 * continuous number. Blends the height- and weight-derived positions, favouring
 * height. Callers can round it, or snap it to the sizes a product offers.
 */
export function sizeScore(heightCm: number, weightKg: number): number {
  const hIdx = fractionalIndex(heightCm, HEIGHT_CENTERS);
  const wIdx = fractionalIndex(weightKg, WEIGHT_CENTERS);
  return HEIGHT_WEIGHT * hIdx + WEIGHT_WEIGHT * wIdx;
}
