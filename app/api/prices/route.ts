import { auth } from '@clerk/nextjs/server'
import { checkAndGenerateAlerts } from '@/lib/alerts/checker'
import {
  applyClerkRls,
  getSupabaseAdminClient,
} from '@/lib/supabase/client'
import { fetchAllPrices, type PriceData } from '@/lib/market/prices'

const ONE_MINUTE_MS = 60_000

/**
 * Cron hook route (placeholder for price ingestion).
 * After prices are updated, this route re-checks alert thresholds
 * for active portfolios and creates new unacknowledged alerts.
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: portfolios, error: pErr } = await supabase
      .from('portfolios')
      .select('portfolio_id,user_id,status,total_value')
      .eq('status', 'active');

    if (pErr) {
      return new Response(
        JSON.stringify({ message: 'Failed to fetch portfolios.', details: pErr.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    let created = 0;

    for (const p of portfolios ?? []) {
      const portfolioId = p.portfolio_id as string;
      const userId = p.user_id as string;

      const { data: latestMetrics } = await supabase
        .from('risk_metrics')
        .select('var95,beta,max_drawdown,volatility,sharpe')
        .eq('portfolio_id', portfolioId)
        .order('calculated_at', { ascending: false })
        .limit(1);

      const metricsRow = latestMetrics?.[0];
      if (!metricsRow) continue;

      const { data: holdingRows } = await supabase
        .from('portfolio_assets')
        .select(
          `
          weight,
          assets (
            symbol
          )
        `
        )
        .eq('portfolio_id', portfolioId);

      const generated = await checkAndGenerateAlerts(
        portfolioId,
        userId,
        {
          portfolioValue: Number((p as any).total_value) || 0,
          var95: Number(metricsRow.var95) || 0,
          // risk_metrics.max_drawdown is assumed decimal in DB; fallback works for either scale.
          maxDrawdown:
            Math.abs(Number(metricsRow.max_drawdown) || 0) > 1
              ? (Number(metricsRow.max_drawdown) || 0) / 100
              : (Number(metricsRow.max_drawdown) || 0),
          beta: Number(metricsRow.beta) || 0,
          volatility: Number((metricsRow as any).volatility) || 0,
          sharpe: Number((metricsRow as any).sharpe) || 0,
        },
        (holdingRows ?? []).map((r: any) => ({
          symbol: String(r?.assets?.symbol ?? ''),
          weight: Number(r?.weight) || 0,
        }))
      );

      for (const a of generated) {
        const { error } = await supabase.from('alerts').insert({
          portfolio_id: portfolioId,
          user_id: userId,
          alert_type: a.alert_type,
          severity: a.severity,
          message: a.message,
        });
        if (!error) created += 1;
      }
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        message: 'Price cron post-processing failed.',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 403 })

  const url = new URL(req.url)
  const symbolsParam = url.searchParams.get('symbols') ?? ''
  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) {
    return Response.json(
      { message: '`symbols` query param is required.' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const now = Date.now()

  const cachedBySymbol = new Map<string, PriceData>()
  const staleSymbols: string[] = []

  await Promise.all(
    symbols.map(async (symbol) => {
      // Check last row for freshness.
      const { data, error } = await supabase
        .from('price_history')
        .select('price,recorded_at')
        .eq('symbol', symbol)
        .order('recorded_at', { ascending: false })
        .limit(1)

      if (error || !Array.isArray(data) || data.length === 0) {
        staleSymbols.push(symbol)
        return
      }

      const row = data[0] as any
      const recordedAt = row?.recorded_at ? new Date(row.recorded_at).getTime() : 0
      const price = Number(row?.price)

      if (Number.isFinite(price) && recordedAt > 0 && now - recordedAt < ONE_MINUTE_MS) {
        cachedBySymbol.set(symbol, {
          symbol,
          current: price,
          open: price,
          high: price,
          low: price,
          prevClose: price,
          change: 0,
          changePercent: 0,
        })
      } else {
        staleSymbols.push(symbol)
      }
    })
  )

  // Fetch & persist stale symbols.
  const fetchedStale = staleSymbols.length
    ? await fetchAllPrices(staleSymbols)
    : []

  const staleBySymbol = new Map(
    fetchedStale.map((p) => [p.symbol.toUpperCase(), p] as const)
  )

  const result: PriceData[] = symbols.map((symbol) => {
    return cachedBySymbol.get(symbol) ?? staleBySymbol.get(symbol) ?? {
      symbol,
      current: 0,
      open: 0,
      high: 0,
      low: 0,
      prevClose: 0,
      change: 0,
      changePercent: 0,
    }
  })

  return Response.json(result, { status: 200 })
}

