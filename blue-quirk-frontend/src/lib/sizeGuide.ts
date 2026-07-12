// Size guide (single source of truth) + the body → size recommender.
//
// The garment measurements below are authoritative: both the Size Guide dialog
// and the "Find My Size" recommender read from them, so the two can never drift
// apart. The recommender is a continuous scoring model (no coarse height/weight
// buckets): every centimeter and kilogram nudges the result proportionally, the
// way an experienced seller would size a customer — and it deliberately favours
// the closer, smaller fit instead of defaulting people into oversized shirts.

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

// --- Fit model -------------------------------------------------------------
//
// A t-shirt is chosen mainly by how its CHEST fits the wearer's build, with the
// LENGTH (driven by height) as a lighter, secondary check. We reason directly
// from the garment dimensions above rather than from invented height/weight
// buckets:
//
//   1. Estimate the wearer's body chest circumference from height & weight.
//   2. Add a moderate regular-fit ease to get the garment chest they want.
//   3. Read that off the guide's own chest ladder to get a continuous size
//      position, then blend in a height/length position.
//
// Because the ease is moderate (not generous) and the caller biases toward the
// smaller neighbour, weight raises the size smoothly with real build instead of
// automatically bumping people up, and XL/XXL only appear when the measurements
// genuinely reach them.

/**
 * Estimated body chest circumference (cm) for a wearer. Weight is the dominant
 * driver of chest girth; height contributes a small frame adjustment. Calibrated
 * so typical builds land where a tailor would expect (e.g. 180 cm / 77 kg ≈ 99 cm,
 * 170 cm / 65 kg ≈ 90 cm, 185 cm / 95 kg ≈ 111 cm).
 */
function estimateBodyChestCm(heightCm: number, weightKg: number): number {
  return 0.62 * weightKg + 0.15 * (heightCm - 170) + 50;
}

/** Regular-fit chest ease (cm): how much roomier than the body the garment
 *  chest should sit. Kept moderate so the fit is comfortable, not oversized. */
const CHEST_EASE_CM = 9;

/** A t-shirt's length runs roughly 40% of the wearer's height, so a garment
 *  length maps to the wearer height it suits via height ≈ length / 0.40. */
const HEIGHT_PER_LENGTH = 2.5;

// Chest weighs more than length: for a tee, build decides the fit and height
// only nudges it (mostly matters for very tall or very short wearers).
const CHEST_WEIGHT = 0.65;
const LENGTH_WEIGHT = 0.35;

/** Garment chest circumference per size (flat A → body round). */
const CHEST_ROUNDS = SIZE_GUIDE.map((r) => r.chest * 2);

/** Wearer height (cm) each size's length suits best — derived from its length (B). */
const HEIGHT_CENTERS = SIZE_GUIDE.map((r) => r.length * HEIGHT_PER_LENGTH);

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
 * continuous number. Chest (build) leads; height (length) fine-tunes. Callers
 * can round it, or snap it to the sizes a product offers — and are expected to
 * apply a small size-down bias so borderline wearers get the closer, smaller fit.
 */
export function sizeScore(heightCm: number, weightKg: number): number {
  const desiredGarmentChest = estimateBodyChestCm(heightCm, weightKg) + CHEST_EASE_CM;
  const chestIdx = fractionalIndex(desiredGarmentChest, CHEST_ROUNDS);
  const lengthIdx = fractionalIndex(heightCm, HEIGHT_CENTERS);
  return CHEST_WEIGHT * chestIdx + LENGTH_WEIGHT * lengthIdx;
}

/**
 * How strongly to lean toward the smaller of two neighbouring sizes when the
 * wearer sits between them. Shifts the ideal position down by a fraction of a
 * size before snapping, so we only size up when the measurements clearly land
 * closer to the larger size. Consumed by the recommender in lib/sizePreference.
 */
export const SIZE_DOWN_BIAS = 0.2;
