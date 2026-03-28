import { auth } from '@clerk/nextjs/server'
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client'

const PRICE_HISTORY_TTL_MS = 5 * 60 * 1000
const priceHistoryCache = new Map<
  string,
  { prices: number[]; expiresAt: number }
>()

async function getOwnedPortfolio(
  portfolioId: string,
  userId: string,
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('portfolio_id,user_id')
    .eq('portfolio_id', portfolioId)
    .single()

  if (error || !data) return { ok: false as const, status: 404 as const }
  if (data.user_id !== userId) return { ok: false as const, status: 403 as const }
  return { ok: true as const }
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await getOwnedPortfolio(id, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .select(
      `
      portfolio_id,
      user_id,
      name,
      status,
      total_value,
      last_updated,
      created_date,
      portfolio_assets (
        portfolio_id,
        asset_id,
        quantity,
        purchase_price,
        purchase_date,
        current_value,
        weight,
        assets (
          asset_id,
          asset_name,
          symbol,
          asset_type,
          current_price,
          currency,
          last_price_update
        )
      )
    `
    )
    .eq('portfolio_id', id)
    .single()

  if (error || !portfolio) {
    return Response.json({ message: 'Portfolio not found.' }, { status: 404 })
  }

  // Attach 252-point price history per asset symbol so the dashboard can compute
  // daily returns, time series, and per-asset risk metrics.
  if (Array.isArray((portfolio as any).portfolio_assets)) {
    const portfolioAssets = (portfolio as any).portfolio_assets as any[]
    const symbols = Array.from(
      new Set(
        portfolioAssets
          .map((pa) => pa?.assets?.symbol ?? pa?.symbol)
          .filter((s) => typeof s === 'string' && s.length > 0)
      )
    ) as string[]

    const now = Date.now()
    const symbolsToFetch = symbols.filter((symbol) => {
      const cached = priceHistoryCache.get(symbol)
      return !cached || cached.expiresAt <= now
    })

    // One round-trip for all symbols: bounded lookback, then latest 252 per symbol in memory.
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 2)

    const { data: batchRows, error: batchErr } = await supabase
      .from('price_history')
      .select('symbol, price, recorded_at')
      .in('symbol', symbolsToFetch)
      .gte('recorded_at', cutoff.toISOString())
      .limit(15000)

    const bySymbol = new Map<string, number[]>()
    if (!batchErr && Array.isArray(batchRows) && batchRows.length > 0) {
      const grouped = new Map<string, { price: number; t: number }[]>()
      for (const row of batchRows as {
        symbol?: string
        price?: number
        recorded_at?: string
      }[]) {
        const sym = row.symbol
        if (!sym) continue
        const t = new Date(String(row.recorded_at ?? '')).getTime()
        if (!Number.isFinite(t)) continue
        const arr = grouped.get(sym) ?? []
        arr.push({ price: Number(row.price), t })
        grouped.set(sym, arr)
      }
      for (const sym of symbolsToFetch) {
        const rows = grouped.get(sym) ?? []
        rows.sort((a, b) => b.t - a.t)
        const prices = rows
          .slice(0, 252)
          .reverse()
          .map((r) => r.price)
          .filter((n) => Number.isFinite(n))
        bySymbol.set(sym, prices)
      }
    }

    const fetched = await Promise.all(
      symbolsToFetch.map(async (symbol) => {
        let prices = bySymbol.get(symbol) ?? []
        if (prices.length > 0) {
          return { symbol, prices }
        }
        const { data: priceRows, error: priceErr } = await supabase
          .from('price_history')
          .select('price')
          .eq('symbol', symbol)
          .order('recorded_at', { ascending: false })
          .limit(252)

        prices =
          priceErr || !Array.isArray(priceRows)
            ? []
            : [...priceRows]
                .reverse()
                .map((r: any) => Number(r.price))
                .filter((n: number) => Number.isFinite(n))

        return { symbol, prices }
      })
    )

    for (const item of fetched) {
      priceHistoryCache.set(item.symbol, {
        prices: item.prices,
        expiresAt: now + PRICE_HISTORY_TTL_MS,
      })
    }

    // Assign from cache to each portfolio_asset row.
    for (const pa of portfolioAssets) {
      const symbol: string | undefined = pa?.assets?.symbol ?? pa?.symbol
      if (!symbol) {
        pa.priceHistory = []
        continue
      }
      const cached = priceHistoryCache.get(symbol)
      pa.priceHistory = cached?.prices ?? []
    }
  }

  const { data: latestRiskMetrics } = await supabase
    .from('risk_metrics')
    .select('*')
    .eq('portfolio_id', id)
    .order('calculated_at', { ascending: false })
    .limit(1)

  return Response.json(
    {
      ...portfolio,
      latest_risk_metrics: Array.isArray(latestRiskMetrics)
        ? latestRiskMetrics[0] ?? null
        : null,
    },
    { status: 200 }
  )
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await getOwnedPortfolio(id, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  let body: { name?: string }
  try {
    body = (await req.json()) as { name?: string }
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  if (!name) {
    return Response.json({ message: '`name` is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('portfolios')
    .update({ name, last_updated: new Date().toISOString() })
    .eq('portfolio_id', id)
    .select('portfolio_id,user_id,name,status,total_value,last_updated,created_date')
    .single()

  if (error) {
    return Response.json(
      { message: 'Failed to update portfolio.', details: error.message },
      { status: 500 }
    )
  }

  return Response.json(data, { status: 200 })
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await getOwnedPortfolio(id, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  const { error } = await supabase
    .from('portfolios')
    .update({ status: 'inactive', last_updated: new Date().toISOString() })
    .eq('portfolio_id', id)

  if (error) {
    return Response.json(
      { message: 'Failed to deactivate portfolio.', details: error.message },
      { status: 500 }
    )
  }

  return Response.json({ ok: true }, { status: 200 })
}

