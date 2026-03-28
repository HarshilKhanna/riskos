import { auth } from '@clerk/nextjs/server'
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdminClient()
    await applyClerkRls(userId)

    const { data: portfolios, error } = await supabase
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
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_date', { ascending: false })

    if (error) {
      return Response.json(
        { message: 'Failed to fetch portfolios.', details: error.message },
        { status: 500 }
      )
    }

    // Keep this endpoint fast: the dashboard computes live metrics separately.
    // Returning `latest_risk_metrics: null` keeps the response shape stable.
    return Response.json(
      (portfolios ?? []).map((p) => ({
        ...p,
        latest_risk_metrics: null,
      })),
      { status: 200 }
    )
  } catch (err) {
    return Response.json(
      {
        message: 'Failed to fetch portfolios.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
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

  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: userId,
      name,
      status: 'active',
      total_value: 0,
      last_updated: new Date().toISOString(),
    })
    .select('portfolio_id,user_id,name,status,total_value,last_updated,created_date')
    .single()

  if (error) {
    return Response.json(
      { message: 'Failed to create portfolio.', details: error.message },
      { status: 500 }
    )
  }

  return Response.json(data, { status: 201 })
}

