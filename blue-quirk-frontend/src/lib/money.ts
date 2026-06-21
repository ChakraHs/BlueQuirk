// Single place for price formatting. BlueQuirk is a Morocco-based, cash-on-
// delivery store, so prices are shown in Moroccan dirham (DH / MAD).
export function formatPrice(value: number): string {
  return `${value.toFixed(2)} DH`;
}
