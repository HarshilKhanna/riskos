/** Display percentages in the UI — never raw floating noise (max 2 decimals). */
export function formatPct(value: number, decimals: 1 | 2 = 1): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v.toFixed(decimals)}%`;
}

/** Round a numeric percentage for storage / chart math (1 decimal). */
export function roundPct1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
}
