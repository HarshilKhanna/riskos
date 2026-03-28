import { DefaultApi } from 'finnhub'

import { getSupabaseAdminClient } from '@/lib/supabase/client'
import { getAssetBySymbol } from './assetDirectory'
import { getSymbolMapEntry } from './symbolMap'

export type PriceData = {
  symbol: string
  current: number
  open: number
  high: number
  low: number
  prevClose: number
  change: number
  changePercent: number
}

function assertFinitePositive(n: unknown): number | null {
  if (n === null || n === undefined) return null
  const num = Number(n)
  if (!Number.isFinite(num)) return null
  if (num <= 0) return null
  return num
}

function toUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000)
}

function downsampleToUtcDailyClosingPrices(
  rows: Array<{ price: unknown; recorded_at: string }>
): number[] {
  // Keep the last price per UTC day.
  // This lets `/api/prices/history` keep a ~252-point daily series
  // even if `price_history` stores frequent (e.g. minute) snapshots.
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const ts = new Date(r.recorded_at)
    if (!Number.isFinite(ts.getTime())) continue
    const dayKey = ts.toISOString().slice(0, 10) // YYYY-MM-DD
    const price = Number(r.price)
    if (!Number.isFinite(price)) continue
    byDay.set(dayKey, price) // rows are expected ascending; last wins
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, price]) => price)
}

function finnhubClient() {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) throw new Error('Missing FINNHUB_API_KEY in environment.')
  return new DefaultApi(apiKey)
}

function finnhubQuote(
  client: ReturnType<typeof finnhubClient>,
  finnhubSymbol: string
): Promise<{ c?: number; o?: number; h?: number; l?: number; pc?: number } | null> {
  return new Promise((resolve, reject) => {
    client.quote(finnhubSymbol, (err: any, data: any) => {
      if (err) return reject(err)
      resolve(data ?? null)
    })
  })
}

function finnhubStockCandles(
  client: ReturnType<typeof finnhubClient>,
  finnhubSymbol: string,
  from: number,
  to: number
): Promise<{ c?: number[]; t?: number[] } | null> {
  return new Promise((resolve, reject) => {
    // resolution='D' for daily candles
    client.stockCandles(finnhubSymbol, 'D', from, to, (err: any, data: any) => {
      if (err) return reject(err)
      resolve(data ?? null)
    })
  })
}

async function getLastKnownFallbackPrice(symbol: string): Promise<number | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('price_history')
    .select('price')
    .eq('symbol', symbol)
    .order('recorded_at', { ascending: false })
    .limit(1)

  if (error) return null
  const price = Array.isArray(data) && data[0] ? (data[0] as any).price : null
  if (price === null || price === undefined) return null
  const num = Number(price)
  return Number.isFinite(num) ? num : null
}

export async function fetchLivePrice(symbol: string): Promise<PriceData> {
  const riskosSymbol = symbol.toUpperCase()
  const mapEntry = getSymbolMapEntry(riskosSymbol)

  // Legacy map: fallback instruments use last known DB price.
  if (mapEntry?.isFallback) {
    const last = await getLastKnownFallbackPrice(riskosSymbol)
    const base = last ?? 0
    return {
      symbol: riskosSymbol,
      current: base,
      open: base,
      high: base,
      low: base,
      prevClose: base,
      change: 0,
      changePercent: 0,
    }
  }

  let finnhubSym: string | null = null
  if (mapEntry && !mapEntry.isFallback) {
    finnhubSym = mapEntry.finnhubSymbol
  } else {
    const dir = getAssetBySymbol(riskosSymbol)
    if (dir?.isFallback) {
      // Signal to UI: use directory reference price (Finnhub unsupported).
      return {
        symbol: riskosSymbol,
        current: 0,
        open: 0,
        high: 0,
        low: 0,
        prevClose: 0,
        change: 0,
        changePercent: 0,
      }
    }
    if (dir && !dir.isFallback) {
      finnhubSym = dir.finnhubSymbol
    }
  }

  if (!finnhubSym) {
    const last = await getLastKnownFallbackPrice(riskosSymbol)
    const base = last ?? 0
    return {
      symbol: riskosSymbol,
      current: base,
      open: base,
      high: base,
      low: base,
      prevClose: base,
      change: 0,
      changePercent: 0,
    }
  }

  const client = finnhubClient()
  const quote = await finnhubQuote(client, finnhubSym)

  const c = assertFinitePositive((quote as any)?.c)
  const o = assertFinitePositive((quote as any)?.o) ?? c
  const h = assertFinitePositive((quote as any)?.h) ?? c
  const l = assertFinitePositive((quote as any)?.l) ?? c
  const pc = assertFinitePositive((quote as any)?.pc) ?? o

  // Finnhub returns c=0 occasionally; fall back to cached last known.
  if (!c || c === 0) {
    const last = await getLastKnownFallbackPrice(riskosSymbol)
    const base = last ?? 0
    return {
      symbol: riskosSymbol,
      current: base,
      open: base,
      high: base,
      low: base,
      prevClose: base,
      change: 0,
      changePercent: 0,
    }
  }

  const prevClose = pc ?? c
  const change = c - prevClose
  const changePercent = prevClose ? (change / prevClose) * 100 : 0

  return {
    symbol: riskosSymbol,
    current: c,
    open: o ?? c,
    high: h ?? c,
    low: l ?? c,
    prevClose,
    change,
    changePercent,
  }
}

export async function fetchAllPrices(symbols: string[]): Promise<PriceData[]> {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())))

  const settled = await Promise.allSettled(
    unique.map(async (symbol) => {
      try {
        return await fetchLivePrice(symbol)
      } catch {
        const last = await getLastKnownFallbackPrice(symbol)
        const base = last ?? 0
        return {
          symbol,
          current: base,
          open: base,
          high: base,
          low: base,
          prevClose: base,
          change: 0,
          changePercent: 0,
        } satisfies PriceData
      }
    })
  )

  const results: PriceData[] = settled.map((s) =>
    s.status === 'fulfilled' ? s.value : (s.reason as PriceData)
  )

  const supabase = getSupabaseAdminClient()
  // Cache snapshot resolution:
  // we bucket by minute so `/api/prices` can treat the last row as "fresh"
  // for the next ~60s.
  const now = new Date()
  const bucketMs = Math.floor(now.getTime() / 60_000) * 60_000
  const recordedAt = new Date(bucketMs).toISOString()

  // Upsert a "snapshot" row for each symbol for today (skip zero: reference-only / unsupported quotes).
  const snapshotRows = results
    .filter((p) => p.current > 0)
    .map((p) => ({
      symbol: p.symbol,
      price: p.current,
      recorded_at: recordedAt,
    }))

  if (snapshotRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from('price_history')
      .upsert(snapshotRows, { onConflict: 'symbol,recorded_at' })

    if (upsertErr) {
      // Snapshot failures shouldn't block the rest.
      // eslint-disable-next-line no-console
      console.error('price_history upsert error:', upsertErr)
    }
  }

  // Update current_price on assets table (skip zero quotes: reference-only / unsupported).
  const updates = results
    .filter((p) => p.current > 0)
    .map(async (p) => {
      const { error } = await supabase
        .from('assets')
        .update({
          current_price: p.current,
          last_price_update: now.toISOString(),
        })
        .eq('symbol', p.symbol)
      return error
    })

  await Promise.all(updates)

  return results
}

export async function fetchPriceHistory(
  symbol: string,
  days: number = 252
): Promise<number[]> {
  const riskosSymbol = symbol.toUpperCase()
  const mapEntry = getSymbolMapEntry(riskosSymbol)
  const dirAsset = getAssetBySymbol(riskosSymbol)
  const supabase = getSupabaseAdminClient()

  const now = new Date()
  const fromTs = toUnixSeconds(new Date(now.getTime() - days * 24 * 60 * 60 * 1000))
  const toTs = toUnixSeconds(now)

  const useDbOnly =
    (mapEntry?.isFallback ?? false) ||
    (!mapEntry && (!dirAsset || dirAsset.isFallback))

  // For fallback instruments: read from Supabase directly.
  if (useDbOnly) {
    const fromISO = new Date(fromTs * 1000).toISOString()
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('symbol', riskosSymbol)
      .gte('recorded_at', fromISO)
      .order('recorded_at', { ascending: true })

    if (error) return []
    return downsampleToUtcDailyClosingPrices((data ?? []) as any)
  }

  const finnhubSym =
    mapEntry && !mapEntry.isFallback
      ? mapEntry.finnhubSymbol
      : dirAsset && !dirAsset.isFallback
        ? dirAsset.finnhubSymbol
        : null

  if (!finnhubSym) {
    const fromISO = new Date(fromTs * 1000).toISOString()
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('symbol', riskosSymbol)
      .gte('recorded_at', fromISO)
      .order('recorded_at', { ascending: true })

    if (error) return []
    return downsampleToUtcDailyClosingPrices((data ?? []) as any)
  }

  // Try cache first.
  const fromISO = new Date(fromTs * 1000).toISOString()
  const { data: cachedData, error: cachedErr } = await supabase
    .from('price_history')
    .select('price, recorded_at')
    .eq('symbol', riskosSymbol)
    .gte('recorded_at', fromISO)
    .order('recorded_at', { ascending: true })

  if (
    !cachedErr &&
    Array.isArray(cachedData) &&
    cachedData.length >= 2
  ) {
    const dailyPrices = downsampleToUtcDailyClosingPrices(cachedData as any)
    if (dailyPrices.length >= 2) return dailyPrices
  }

  const client = finnhubClient()
  const candles = await finnhubStockCandles(client, finnhubSym, fromTs, toTs)

  const c = Array.isArray((candles as any)?.c) ? ((candles as any).c as number[]) : []
  const t = Array.isArray((candles as any)?.t) ? ((candles as any).t as number[]) : []

  // If Finnhub returns no candles, return last known prices from Supabase.
  if (!c.length || !t.length) {
    const { data: lastRows } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('symbol', riskosSymbol)
      .order('recorded_at', { ascending: false })
      .limit(days)

    const sortedAsc = (lastRows ?? []).slice().reverse() as any[]
    return downsampleToUtcDailyClosingPrices(sortedAsc)
  }

  // Upsert candle points into price_history.
  const rows = c.map((price, i) => ({
    symbol: riskosSymbol,
    price,
    recorded_at: new Date(t[i] * 1000).toISOString(),
  }))

  const { error: upsertErr } = await supabase
    .from('price_history')
    .upsert(rows, { onConflict: 'symbol,recorded_at' })

  if (upsertErr) {
    // eslint-disable-next-line no-console
    console.error('price_history candles upsert error:', upsertErr)
  }

  // Return closing prices oldest -> newest.
  const pairs = rows
    .map((r) => ({ recorded_at: r.recorded_at, price: r.price }))
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

  return downsampleToUtcDailyClosingPrices(pairs as any)
}

function randn(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/** ~252 trading days of synthetic closes ending at `anchorPrice` (GBM, drift 0). */
function generateGBMPath(anchorPrice: number, n: number, annualVol: number): number[] {
  const sigma = annualVol / Math.sqrt(252)
  const prices: number[] = new Array(n)
  prices[n - 1] = anchorPrice
  for (let i = n - 2; i >= 0; i--) {
    const dt = 1
    const z = randn()
    prices[i] =
      prices[i + 1] * Math.exp(0.5 * sigma * sigma * dt - sigma * Math.sqrt(dt) * z)
  }
  return prices
}

const MIN_HISTORY_POINTS = 30

/**
 * After an asset is added: try Finnhub-backed history via `fetchPriceHistory`.
 * If fewer than {@link MIN_HISTORY_POINTS} daily points exist, seed synthetic GBM
 * (15% annualized vol by default) so risk code always has enough samples.
 */
export async function ensurePriceHistorySeries(
  symbol: string,
  anchorPrice: number,
  days = 252,
  annualVol = 0.15
): Promise<void> {
  const riskosSymbol = symbol.toUpperCase()
  if (!Number.isFinite(anchorPrice) || anchorPrice <= 0) return

  let series: number[] = []
  try {
    series = await fetchPriceHistory(riskosSymbol, days)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ensurePriceHistorySeries fetchPriceHistory', e)
  }
  if (series.length >= MIN_HISTORY_POINTS) return

  const prices = generateGBMPath(anchorPrice, days, annualVol)
  const supabase = getSupabaseAdminClient()
  const now = new Date()
  const rows = prices.map((price, i) => {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - (days - 1 - i))
    d.setUTCHours(12, 0, 0, 0)
    return {
      symbol: riskosSymbol,
      price,
      recorded_at: d.toISOString(),
    }
  })

  const { error: upsertErr } = await supabase
    .from('price_history')
    .upsert(rows, { onConflict: 'symbol,recorded_at' })

  if (upsertErr) {
    // eslint-disable-next-line no-console
    console.error('ensurePriceHistorySeries upsert error:', upsertErr)
  }
}

