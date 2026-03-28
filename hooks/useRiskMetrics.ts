'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { calculatePortfolioMetrics } from '@/lib/risk/calculations'
import { toINR } from '@/lib/market/currency'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { isConnected as isFinnhubSocketConnected } from '@/lib/market/finnhubSocket'

export type RiskMetrics = {
  var95: number
  var99: number
  sharpe: number
  beta: number
  alpha: number
  maxDrawdown: number
  volatility: number
  dailyPnL: number
  correlationMatrix: number[][]
}

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

export type RiskHoldingInput = {
  symbol: string
  quantity?: number
  purchase_price?: number
  weight?: number
  /** Asset quote currency; purchase_price and live prices are in this currency. */
  currency?: 'USD' | 'INR'
}

export type UseRiskMetricsOptions = {
  portfolioId?: string | null
  onPersisted?: () => void
  /** After local risk calc + optional new alerts POST, tell the feed to refetch (bell + list). */
  onAlertsSync?: () => void
}

const MOCK_METRICS: RiskMetrics = {
  var95: 0,
  var99: 952339,
  sharpe: 1.12,
  beta: 1.0,
  alpha: 0,
  maxDrawdown: -0.12,
  volatility: 0,
  dailyPnL: 0,
  correlationMatrix: Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: 8 }, (_, j) => (i === j ? 1 : 0)),
  ),
}

function toNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function getLatestPrices(symbols: string[]) {
  if (symbols.length === 0) return []
  const qs = encodeURIComponent(symbols.join(','))
  const res = await fetch(`/api/prices?symbols=${qs}`)
  if (!res.ok) throw new Error(`Failed to fetch prices (${res.status})`)
  const json = (await res.json()) as PriceData[]
  return Array.isArray(json) ? json : []
}

async function getPriceHistory(symbol: string, days = 252) {
  const res = await fetch(
    `/api/prices/history?symbol=${encodeURIComponent(symbol)}&days=${days}`,
  )
  if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}`)
  const json = (await res.json()) as number[]
  return Array.isArray(json) ? json.map((x) => toNumber(x, 0)).filter((n) => n > 0) : []
}

function makeNeutralMatrix(size: number): number[][] {
  if (size <= 0) return []
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)),
  )
}

const BENCHMARK = 'NIFTY50'

export function useRiskMetrics(
  holdings: RiskHoldingInput[],
  options: UseRiskMetricsOptions = {},
) {
  const { userId: clerkUserId } = useAuth()
  const portfolioIdRef = useRef(options.portfolioId)
  portfolioIdRef.current = options.portfolioId
  const onPersistedRef = useRef(options.onPersisted)
  onPersistedRef.current = options.onPersisted
  const onAlertsSyncRef = useRef(options.onAlertsSync)
  onAlertsSyncRef.current = options.onAlertsSync

  const [metrics, setMetrics] = useState<RiskMetrics>(MOCK_METRICS)
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [histories, setHistories] = useState<Record<string, number[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [riskDataReady, setRiskDataReady] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  /** Portfolio symbols + benchmark for history/prices (benchmark not in holdings). */
  const fetchSymbols = useMemo(() => {
    const base = (holdings ?? [])
      .map((h) => String(h.symbol || '').trim().toUpperCase())
      .filter(Boolean)
    const set = new Set(base)
    if (set.size > 0) set.add(BENCHMARK)
    return Array.from(set)
  }, [holdings])

  const portfolioSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          (holdings ?? [])
            .map((h) => String(h.symbol || '').trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    [holdings],
  )

  const holdingsBySymbolRef = useRef<Record<string, RiskHoldingInput>>({})
  const historyBySymbolRef = useRef<Record<string, number[]>>({})
  const pricesRef = useRef<Record<string, PriceData>>({})

  useEffect(() => {
    const bySymbol: Record<string, RiskHoldingInput> = {}
    for (const h of holdings ?? []) {
      const symbol = String(h.symbol || '').trim().toUpperCase()
      if (!symbol) continue
      bySymbol[symbol] = h
    }
    holdingsBySymbolRef.current = bySymbol
  }, [holdings])

  const syncAlertsAfterPortfolioMetrics = useCallback(
    async (
      next: RiskMetrics,
      portfolioValue: number,
      holdingsForAlert: { symbol: string; weight: number }[],
    ) => {
      const pid = portfolioIdRef.current?.trim()
      const uid = clerkUserId?.trim()
      const sync = onAlertsSyncRef.current
      if (!pid || !uid || !sync) return

      try {
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            portfolioId: pid,
            userId: uid,
            metrics: {
              portfolioValue,
              var95: next.var95,
              maxDrawdown: next.maxDrawdown / 100,
              beta: next.beta,
              volatility: next.volatility,
              sharpe: next.sharpe,
            },
            holdings: holdingsForAlert,
          }),
        })
        if (!res.ok) return
        const data = (await res.json()) as { inserted?: number }
        if (!data.inserted || data.inserted <= 0) return
        sync()
      } catch {
        // non-fatal
      }
    },
    [clerkUserId],
  )

  const recalcFromLocalState = useCallback(() => {
    const holdingSymbols = Object.keys(holdingsBySymbolRef.current)
    if (holdingSymbols.length === 0) {
      setMetrics((prev) => ({
        ...prev,
        dailyPnL: 0,
        correlationMatrix: [],
      }))
      return
    }

    const currentPrices = pricesRef.current
    const historyMap = historyBySymbolRef.current

    const values = holdingSymbols.map((symbol) => {
      const h = holdingsBySymbolRef.current[symbol]
      const qty = toNumber(h.quantity, 0)
      const ccy = h.currency === 'USD' ? 'USD' : 'INR'
      const current = toINR(toNumber(currentPrices[symbol]?.current, 0), ccy)
      return {
        symbol,
        qty,
        current,
        currentValue: qty * current,
      }
    })

    const currentTotal = values.reduce((sum, v) => sum + v.currentValue, 0)

    const rows = holdingSymbols
      .map((symbol) => {
        const baseSeries = Array.isArray(historyMap[symbol]) ? historyMap[symbol] : []
        const lastPrice = toNumber(currentPrices[symbol]?.current, 0)
        const series =
          baseSeries.length === 0
            ? lastPrice > 0
              ? Array.from({ length: 252 }, () => lastPrice)
              : []
            : (() => {
                const next = [...baseSeries]
                if (lastPrice > 0) {
                  if (next.length >= 1) next[next.length - 1] = lastPrice
                  else next.push(lastPrice)
                }
                return next
              })()

        const weight =
          currentTotal > 0
            ? (values.find((v) => v.symbol === symbol)?.currentValue ?? 0) / currentTotal
            : toNumber(holdingsBySymbolRef.current[symbol]?.weight, 0)

        return { symbol, weight, prices: series }
      })
      .filter((h) => Array.isArray(h.prices) && h.prices.length >= 30)

    if (rows.length < 1) {
      setMetrics((prev) => ({
        ...prev,
        dailyPnL: 0,
        correlationMatrix: makeNeutralMatrix(Math.max(holdingSymbols.length, 1)),
      }))
      return
    }

    const calcHoldings = rows.map((r) => ({ weight: r.weight, prices: r.prices }))
    const next = calculatePortfolioMetrics(calcHoldings, currentTotal || 1)
    // dailyPnL: last-day log-return × portfolio value (INR). Do not use (current − cost);
    // that is lifetime unrealized P&L and was mixed with daily label.
    setMetrics(next)
    void syncAlertsAfterPortfolioMetrics(
      next,
      currentTotal || 1,
      rows.map((r) => ({ symbol: r.symbol, weight: r.weight })),
    )
  }, [syncAlertsAfterPortfolioMetrics])

  const persistRiskToApi = useCallback(async () => {
    const pid =
      typeof portfolioIdRef.current === 'string' ? portfolioIdRef.current.trim() : ''
    if (!pid) return

    const holdingSymbols = Object.keys(holdingsBySymbolRef.current)
    if (holdingSymbols.length < 2) return

    const currentPrices = pricesRef.current
    const historyMap = historyBySymbolRef.current

    const values = holdingSymbols.map((symbol) => {
      const h = holdingsBySymbolRef.current[symbol]
      const qty = toNumber(h.quantity, 0)
      const ccy = h.currency === 'USD' ? 'USD' : 'INR'
      const current = toINR(toNumber(currentPrices[symbol]?.current, 0), ccy)
      return {
        symbol,
        qty,
        current,
        currentValue: qty * current,
      }
    })

    const currentTotal = values.reduce((sum, v) => sum + v.currentValue, 0)

    const rows = holdingSymbols
      .map((symbol) => {
        const baseSeries = Array.isArray(historyMap[symbol]) ? historyMap[symbol] : []
        // Price series stays in native quote currency; log returns are scale-invariant.
        const lastPrice = toNumber(currentPrices[symbol]?.current, 0)
        const series =
          baseSeries.length === 0
            ? lastPrice > 0
              ? Array.from({ length: 252 }, () => lastPrice)
              : []
            : (() => {
                const next = [...baseSeries]
                if (lastPrice > 0) {
                  if (next.length >= 1) next[next.length - 1] = lastPrice
                  else next.push(lastPrice)
                }
                return next
              })()

        const weight =
          currentTotal > 0
            ? (values.find((v) => v.symbol === symbol)?.currentValue ?? 0) / currentTotal
            : toNumber(holdingsBySymbolRef.current[symbol]?.weight, 0)

        return { symbol, weight, prices: series }
      })
      .filter((h) => Array.isArray(h.prices) && h.prices.length >= 30)

    if (rows.length < 2) return

    const payload = {
      holdings: rows.map((r) => ({
        symbol: r.symbol,
        weight: r.weight,
        priceHistory: r.prices,
      })),
      portfolioValue: currentTotal || 1,
      portfolioId: pid,
    }

    try {
      const res = await fetch('/api/risk/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) onPersistedRef.current?.()
    } catch {
      // non-fatal
    }
  }, [])

  const refresh = useCallback(async () => {
    if (fetchSymbols.length === 0) {
      setMetrics(MOCK_METRICS)
      setPrices({})
      setHistories({})
      pricesRef.current = {}
      historyBySymbolRef.current = {}
      setRiskDataReady(true)
      return
    }

    setIsLoading(true)
    setRiskDataReady(false)
    try {
      const livePrices = await getLatestPrices(fetchSymbols)
      const nextPrices: Record<string, PriceData> = {}
      for (const p of livePrices) {
        const symbol = String(p.symbol || '').toUpperCase()
        if (!symbol) continue
        nextPrices[symbol] = {
          ...p,
          symbol,
          current: toNumber(p.current, 0),
          changePercent: toNumber(p.changePercent, 0),
        }
      }

      const historyResults = await Promise.all(
        fetchSymbols.map(async (symbol) => {
          try {
            const history = await getPriceHistory(symbol, 252)
            return [symbol, history] as const
          } catch {
            return [symbol, []] as const
          }
        }),
      )

      const nextHistory: Record<string, number[]> = {}
      for (const [symbol, history] of historyResults) {
        nextHistory[symbol] = history
      }

      pricesRef.current = nextPrices
      historyBySymbolRef.current = nextHistory
      setPrices(nextPrices)
      setHistories(nextHistory)
      setLastUpdated(Date.now())
      recalcFromLocalState()
      await persistRiskToApi()
    } catch {
      // Keep last known state
    } finally {
      setIsLoading(false)
      setRiskDataReady(true)
    }
  }, [fetchSymbols, persistRiskToApi, recalcFromLocalState])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (portfolioSymbols.length === 0) return

    const supabase = getSupabaseBrowserClient()
    const symbolSet = new Set(portfolioSymbols)
    const channel = supabase
      .channel('price_updates')
      .on('broadcast', { event: 'price_update' }, (payload) => {
        const data = (payload?.payload ?? {}) as {
          symbol?: string
          price?: number
          timestamp?: string
        }
        const symbol = String(data.symbol || '').toUpperCase()
        if (!symbolSet.has(symbol)) return

        const next = toNumber(data.price, 0)
        if (!Number.isFinite(next) || next <= 0) return

        const prev = pricesRef.current[symbol]
        pricesRef.current = {
          ...pricesRef.current,
          [symbol]: {
            symbol,
            current: next,
            open: prev?.open ?? next,
            high: prev ? Math.max(prev.high, next) : next,
            low: prev ? Math.min(prev.low, next) : next,
            prevClose: prev?.prevClose ?? prev?.current ?? next,
            change: prev ? next - (prev.prevClose || prev.current || next) : 0,
            changePercent: prev
              ? ((next - (prev.prevClose || prev.current || next)) /
                  (prev.prevClose || prev.current || next || 1)) *
                100
              : 0,
          },
        }
        setPrices(pricesRef.current)
        setLastUpdated(data.timestamp ? new Date(data.timestamp).getTime() : Date.now())
        recalcFromLocalState()
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED' && isFinnhubSocketConnected())
      })

    return () => {
      setIsLive(false)
      void supabase.removeChannel(channel)
    }
  }, [portfolioSymbols, recalcFromLocalState])

  useEffect(() => {
    if (fetchSymbols.length === 0) return
    const id = setInterval(() => {
      void refresh()
    }, 60_000)
    return () => clearInterval(id)
  }, [fetchSymbols.length, refresh])

  return {
    metrics,
    prices,
    histories,
    isLoading,
    riskDataReady,
    isLive,
    lastUpdated,
    refresh,
  }
}
