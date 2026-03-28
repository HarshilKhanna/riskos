import { auth } from '@clerk/nextjs/server'
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client'
import { getAssetBySymbol } from '@/lib/market/assetDirectory'
import { ensurePriceHistorySeries } from '@/lib/market/prices'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function verifyPortfolioOwnership(
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
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 403 })

  const { id: portfolioId } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await verifyPortfolioOwnership(portfolioId, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  const { data, error } = await supabase
    .from('portfolio_assets')
    .select(
      `
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
    `
    )
    .eq('portfolio_id', portfolioId)

  if (error) {
    return Response.json(
      { message: 'Failed to fetch portfolio assets.', details: error.message },
      { status: 500 }
    )
  }

  return Response.json({ portfolio_id: portfolioId, assets: data ?? [] }, { status: 200 })
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 403 })

  const { id: portfolioId } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await verifyPortfolioOwnership(portfolioId, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  let body: {
    symbol?: string
    quantity?: number
    purchase_price?: number
    purchase_date?: string
    confirmed_current_price?: number
    asset?: {
      symbol: string
      name: string
      type: string
      exchange: string
      finnhubSymbol: string
      fallbackPrice: number
      currency: 'USD' | 'INR'
      isFallback?: boolean
    }
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const symbol = (body.symbol ?? '').trim().toUpperCase()
  const quantity = body.quantity
  const purchasePrice = body.purchase_price
  const purchaseDate = body.purchase_date ? new Date(body.purchase_date) : null
  const confirmedCurrent = body.confirmed_current_price

  if (!symbol) return Response.json({ message: '`symbol` is required.' }, { status: 400 })
  if (!isFiniteNumber(quantity) || quantity <= 0) {
    return Response.json({ message: '`quantity` must be a positive number.' }, { status: 400 })
  }
  if (!isFiniteNumber(purchasePrice) || purchasePrice <= 0) {
    return Response.json(
      { message: '`purchase_price` must be a positive number.' },
      { status: 400 }
    )
  }
  if (!isFiniteNumber(confirmedCurrent) || confirmedCurrent <= 0) {
    return Response.json(
      { message: '`confirmed_current_price` must be a positive number.' },
      { status: 400 }
    )
  }
  if (purchaseDate && Number.isNaN(purchaseDate.getTime())) {
    return Response.json({ message: '`purchase_date` is invalid.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  const { data: existingAsset, error: findErr } = await supabase
    .from('assets')
    .select('asset_id,current_price')
    .eq('symbol', symbol)
    .maybeSingle()

  if (findErr) {
    return Response.json(
      { message: 'Failed to look up asset.', details: findErr.message },
      { status: 500 }
    )
  }

  let assetId: string

  if (existingAsset && (existingAsset as { asset_id?: string }).asset_id) {
    assetId = String((existingAsset as { asset_id: string }).asset_id)
    const { error: upErr } = await supabase
      .from('assets')
      .update({
        current_price: confirmedCurrent,
        last_price_update: nowIso,
      })
      .eq('asset_id', assetId)

    if (upErr) {
      return Response.json(
        { message: 'Failed to update asset price.', details: upErr.message },
        { status: 500 }
      )
    }
  } else {
    const meta = body.asset ?? getAssetBySymbol(symbol)
    if (!meta) {
      return Response.json(
        {
          message:
            'Unknown symbol: not in directory. Select an asset from the search list (or use Search anyway with a valid quote).',
        },
        { status: 400 }
      )
    }

    const { data: inserted, error: insErr } = await supabase
      .from('assets')
      .insert({
        symbol: meta.symbol.toUpperCase(),
        asset_name: meta.name,
        asset_type: meta.type,
        current_price: confirmedCurrent,
        currency: meta.currency,
        last_price_update: nowIso,
      })
      .select('asset_id')
      .single()

    if (insErr || !inserted) {
      return Response.json(
        { message: 'Failed to create asset row.', details: insErr?.message ?? 'no row' },
        { status: 500 }
      )
    }

    assetId = String((inserted as { asset_id: string }).asset_id)
  }

  const { error: phErr } = await supabase.from('price_history').insert({
    symbol,
    price: confirmedCurrent,
    recorded_at: nowIso,
  })

  if (phErr) {
    return Response.json(
      { message: 'Failed to record price history.', details: phErr.message },
      { status: 500 }
    )
  }

  const currentValue = quantity * confirmedCurrent

  console.log('POST /portfolios/:id/assets', {
    symbol,
    purchasePrice,
    confirmedCurrent,
    quantity,
    currentValue,
  })

  const { data: upsertData, error: upsertError } = await supabase
    .from('portfolio_assets')
    .upsert(
      {
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate ? purchaseDate.toISOString() : new Date().toISOString(),
        current_value: currentValue,
        weight: 0,
      },
      { onConflict: 'portfolio_id,asset_id' }
    )
    .select('portfolio_id,asset_id,quantity,purchase_price,purchase_date,current_value,weight')

  const insertedRow = Array.isArray(upsertData) ? upsertData[0] : upsertData

  if (upsertError) {
    console.error('Upsert error (portfolio_assets)', {
      portfolioId,
      assetId,
      upsertError,
    })
    return Response.json(
      { message: 'Failed to add asset to portfolio.', details: upsertError.message },
      { status: 500 }
    )
  }

  if (!insertedRow) {
    console.error('Upsert succeeded but no row returned', {
      portfolioId,
      assetId,
      upsertData,
    })
    return Response.json({ message: 'Failed to confirm portfolio_asset upsert.' }, { status: 500 })
  }

  const recalcWeightsResult = await recalculateWeights(portfolioId)
  const updatePortfolioValueResult = await updatePortfolioValue(portfolioId)

  console.log('POST add asset verification', {
    insertedPortfolioAsset: insertedRow,
    recalculateWeightsResult: recalcWeightsResult,
    updatePortfolioValueResult,
  })

  try {
    await ensurePriceHistorySeries(symbol, confirmedCurrent, 252, 0.15)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ensurePriceHistorySeries after add asset', e)
  }

  return Response.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 403 })

  const { id: portfolioId } = await context.params
  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const ownership = await verifyPortfolioOwnership(portfolioId, userId, supabase)
  if (!ownership.ok) {
    return Response.json(
      { message: ownership.status === 403 ? 'Forbidden.' : 'Portfolio not found.' },
      { status: ownership.status }
    )
  }

  let body: { symbol?: string }
  try {
    body = (await req.json()) as { symbol?: string }
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const symbol = (body.symbol ?? '').trim()
  if (!symbol) return Response.json({ message: '`symbol` is required.' }, { status: 400 })

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('asset_id')
    .eq('symbol', symbol)
    .single()

  if (assetError || !asset) {
    return Response.json({ message: 'Asset not found.' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('portfolio_assets')
    .delete()
    .eq('portfolio_id', portfolioId)
    .eq('asset_id', asset.asset_id)

  if (deleteError) {
    return Response.json(
      { message: 'Failed to remove asset from portfolio.', details: deleteError.message },
      { status: 500 }
    )
  }

  await recalculateWeights(portfolioId)
  await updatePortfolioValue(portfolioId)

  return Response.json({ ok: true }, { status: 200 })
}

async function recalculateWeights(portfolioId: string) {
  const supabase = getSupabaseAdminClient()
  const { data: rows, error } = await supabase
    .from('portfolio_assets')
    .select('asset_id,current_value,quantity,purchase_price')
    .eq('portfolio_id', portfolioId)

  if (error) throw new Error(`Failed to load portfolio assets: ${error.message}`)

  const normalized = (rows ?? []).map((row: any) => {
    const value = Number(row.current_value ?? row.quantity * row.purchase_price ?? 0)
    return {
      asset_id: row.asset_id as string,
      current_value: Number.isFinite(value) ? value : 0,
    }
  })

  const totalValue = normalized.reduce((sum, row) => sum + row.current_value, 0)

  console.log('recalculateWeights', {
    portfolioId,
    totalValue,
    assets: normalized.map((r) => ({
      asset_id: r.asset_id,
      current_value: r.current_value,
    })),
  })

  for (const row of normalized) {
    const weight = totalValue > 0 ? row.current_value / totalValue : 0
    const { error: updateError } = await supabase
      .from('portfolio_assets')
      .update({ weight })
      .eq('portfolio_id', portfolioId)
      .eq('asset_id', row.asset_id)

    if (updateError) {
      throw new Error(`Failed to update asset weight: ${updateError.message}`)
    }
  }

  return {
    portfolioId,
    totalValue,
    assetsCount: normalized.length,
  }
}

async function updatePortfolioValue(portfolioId: string) {
  const supabase = getSupabaseAdminClient()
  const { data: rows, error } = await supabase
    .from('portfolio_assets')
    .select('current_value,quantity,purchase_price')
    .eq('portfolio_id', portfolioId)

  if (error) throw new Error(`Failed to load portfolio values: ${error.message}`)

  const total = (rows ?? []).reduce((sum: number, row: any) => {
    const value = Number(row.current_value ?? row.quantity * row.purchase_price ?? 0)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  const { error: updateError } = await supabase
    .from('portfolios')
    .update({ total_value: total, last_updated: new Date().toISOString() })
    .eq('portfolio_id', portfolioId)

  if (updateError) {
    throw new Error(`Failed to update portfolio total value: ${updateError.message}`)
  }

  return {
    portfolioId,
    totalValue: total,
  }
}

