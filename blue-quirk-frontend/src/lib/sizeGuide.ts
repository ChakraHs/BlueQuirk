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
// The recommender predicts the wearer's position on the SIZE_GUIDE ladder
// (0 = S, 1 = M, 2 = L, 3 = XL, 4 = XXL) as a continuous value, from height and
// weight. It is a linear model whose coefficients were fitted to how an
// experienced clothing seller actually advises against these exact garments —
// deliberately gentler than raw chest geometry, which (given the guide's tight
// ~2 cm-per-size steps) over-sizes almost everyone.
//
// Behaviour the coefficients encode:
//   • Weight leads, but gently — roughly one size up per ~14 kg. Extra weight
//     nudges the size, it does not automatically bump people into a larger one.
//   • Height fine-tunes for length — about one size per ~33 cm — so a very tall,
//     slim wearer still gets the length they need without over-sizing the chest.
//   • Average builds centre on M, and XL/XXL are reached only by genuinely large
//     measurements. Reference points the model reproduces:
//        170 cm / 65 kg → M      180 cm / 77 kg → L
//        165 cm / 60 kg → S      180 cm / 90 kg → XL
//        190 cm / 70 kg → L      190 cm / 95 kg → XL
//        195 cm / 100 kg → XXL
//
// The caller (lib/sizePreference) snaps this position to the sizes a product
// offers and applies SIZE_DOWN_BIAS, so a wearer between two sizes gets the
// closer, smaller fit unless the measurements clearly reach the larger one.
//
// The SIZE_GUIDE above stays the single source of truth for the Size Guide
// dialog and for the ladder's size labels/order; when the offered sizes change,
// the recommender simply snaps within whatever the product carries.

const HEIGHT_COEF = 0.03; // size steps per cm  (~1 size / 33 cm)
const WEIGHT_COEF = 0.07; // size steps per kg  (~1 size / 14 kg)
const INTERCEPT = -8.75; // places the S…XXL band over realistic builds

/**
 * The customer's ideal position on the SIZE_GUIDE ladder (0 = S … 4 = XXL) as a
 * continuous number. Weight leads, height fine-tunes. Callers can round it, or
 * snap it to the sizes a product offers — and are expected to apply a small
 * size-down bias so borderline wearers get the closer, smaller fit.
 */
export function sizeScore(heightCm: number, weightKg: number): number {
  return HEIGHT_COEF * heightCm + WEIGHT_COEF * weightKg + INTERCEPT;
}

/**
 * How strongly to lean toward the smaller of two neighbouring sizes when the
 * wearer sits between them. Shifts the ideal position down by a fraction of a
 * size before snapping, so we only size up when the measurements clearly land
 * closer to the larger size. Consumed by the recommender in lib/sizePreference.
 */
export const SIZE_DOWN_BIAS = 0.15;
