/**
 * Display / risk metrics use a single quote currency (INR).
 * Finnhub US quotes are USD; multiply by this rate for portfolio totals and P&L.
 */
export const USD_TO_INR_RATE = (() => {
  const n = Number(process.env.NEXT_PUBLIC_USD_TO_INR ?? 86)
  return Number.isFinite(n) && n > 0 ? n : 86
})()

/** Convert a nominal amount in `currency` to INR for display and aggregation. */
export function toINR(amount: number, currency: 'USD' | 'INR' | null | undefined): number {
  if (!Number.isFinite(amount)) return 0
  return currency === 'USD' ? amount * USD_TO_INR_RATE : amount
}
