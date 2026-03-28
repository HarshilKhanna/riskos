import { fetchAllPrices } from '@/lib/market/prices'
import { getSupabaseAdminClient } from '@/lib/supabase/client'

// Vercel cron endpoint: protected via a shared secret in `Authorization` header.
const RISKOS_SYMBOLS = [
  'NIFTY50',
  'SENSEX',
  'NIFTYIT',
  'GSEC',
  'GOLDBEES',
  'BTCINR',
  'INDIAVIX',
  'USDINR',
  'VGIT',
  'DBC',
]

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? ''
  const provided = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length).trim()
    : authHeader.trim()

  if (!secret || provided !== secret) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()

  // 1) Fetch & persist latest snapshot rows + update `assets.current_price`.
  const priceData = await fetchAllPrices(RISKOS_SYMBOLS)
  const priceBySymbol = new Map(priceData.map((p) => [p.symbol, p.current]))

  // 2) Recalculate `portfolio_assets.current_value = quantity * new current_price`
  //    for every affected portfolio.
  const { data: assetsRows, error: assetsErr } = await supabase
    .from('assets')
    .select('asset_id,symbol')
    .in('symbol', RISKOS_SYMBOLS)

  if (assetsErr) {
    return Response.json(
      { message: 'Failed to fetch assets.', details: assetsErr.message },
      { status: 500 }
    )
  }

  const assetIdToSymbol = new Map<string, string>()
  for (const a of assetsRows ?? []) {
    assetIdToSymbol.set(
      String(a.asset_id),
      String(a.symbol).toUpperCase()
    )
  }

  const assetIds = Array.from(assetIdToSymbol.keys())
  if (assetIds.length === 0) {
    return Response.json({
      updated: 0,
      timestamp: new Date().toISOString(),
    })
  }

  const { data: portfolioAssetRows, error: paErr } = await supabase
    .from('portfolio_assets')
    .select('portfolio_id,asset_id,quantity')
    .in('asset_id', assetIds)

  if (paErr) {
    return Response.json(
      { message: 'Failed to fetch portfolio assets.', details: paErr.message },
      { status: 500 }
    )
  }

  const nowISO = new Date().toISOString()
  const affectedPortfolioIds = new Set<string>()
  let updatedAssetCount = 0

  if (Array.isArray(portfolioAssetRows) && portfolioAssetRows.length > 0) {
    await Promise.all(
      portfolioAssetRows.map(async (row: any) => {
        const portfolioId = String(row.portfolio_id)
        const assetId = String(row.asset_id)
        const symbol = assetIdToSymbol.get(assetId)
        const price = symbol ? priceBySymbol.get(symbol) : undefined
        const quantity = Number(row.quantity)

        const currentPrice = Number(price)
        const computedCurrentValue =
          Number.isFinite(currentPrice) ? quantity * currentPrice : 0

        const { error } = await supabase
          .from('portfolio_assets')
          .update({ current_value: computedCurrentValue })
          .eq('portfolio_id', portfolioId)
          .eq('asset_id', assetId)

        if (error) return
        affectedPortfolioIds.add(portfolioId)
        updatedAssetCount += 1
      })
    )
  }

  // 3) Recalculate weights + portfolio total_value for each affected portfolio.
  await Promise.all(
    Array.from(affectedPortfolioIds).map(async (portfolioId) => {
      const { data: rows, error } = await supabase
        .from('portfolio_assets')
        .select('asset_id,quantity,current_value')
        .eq('portfolio_id', portfolioId)

      if (error || !Array.isArray(rows)) return

      const totalValue = rows.reduce((sum, r: any) => {
        const v = Number(r.current_value)
        return sum + (Number.isFinite(v) ? v : 0)
      }, 0)

      if (totalValue <= 0) {
        // Keep weights deterministic even if the portfolio is empty/zeroed.
        await Promise.all(
          rows.map((r: any) =>
            supabase
              .from('portfolio_assets')
              .update({ weight: 0 })
              .eq('portfolio_id', portfolioId)
              .eq('asset_id', r.asset_id)
          )
        )
        await supabase
          .from('portfolios')
          .update({ total_value: 0, last_updated: nowISO })
          .eq('portfolio_id', portfolioId)
        return
      }

      await Promise.all(
        rows.map(async (r: any) => {
          const cv = Number(r.current_value)
          const weight =
            totalValue > 0 && Number.isFinite(cv) ? cv / totalValue : 0

          await supabase
            .from('portfolio_assets')
            .update({ weight })
            .eq('portfolio_id', portfolioId)
            .eq('asset_id', r.asset_id)
        })
      )

      await supabase
        .from('portfolios')
        .update({ total_value: totalValue, last_updated: nowISO })
        .eq('portfolio_id', portfolioId)
    })
  )

  return Response.json({
    updated: updatedAssetCount,
    timestamp: new Date().toISOString(),
  })
}

