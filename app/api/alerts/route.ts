import { auth } from '@clerk/nextjs/server'
import {
  applyClerkRls,
  getSupabaseAdminClient,
} from '@/lib/supabase/client'
import {
  checkAndGenerateAlerts,
  type Alert,
  type PortfolioAsset,
  type PortfolioMetrics,
} from '@/lib/alerts/checker'

export type AlertRow = {
  alert_id: string
  portfolio_id: string
  user_id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  triggered_at: string
  acknowledged: boolean
  acknowledged_at: string | null
  portfolio_name: string | null
}

function mapAlertRows(
  rows: unknown[],
): AlertRow[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>
    const portfolios = r.portfolios as { name?: string } | null | undefined
    const portfolio_name =
      portfolios && typeof portfolios.name === 'string' ? portfolios.name : null
    const { portfolios: _p, ...rest } = r
    return {
      ...(rest as Omit<AlertRow, 'portfolio_name'>),
      portfolio_name,
    } as AlertRow
  })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdminClient()
    await applyClerkRls(userId)

    const { data, error } = await supabase
      .from('alerts')
      .select(
        `
        alert_id,
        portfolio_id,
        user_id,
        alert_type,
        severity,
        message,
        triggered_at,
        acknowledged,
        acknowledged_at,
        portfolios (
          name
        )
      `
      )
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })

    if (error) {
      return Response.json(
        { message: 'Failed to fetch alerts.', details: error.message },
        { status: 500 }
      )
    }

    const mapped = mapAlertRows(data ?? [])
    const active = mapped.filter((a) => !a.acknowledged)
    const history = mapped.filter((a) => a.acknowledged)

    return Response.json({ active, history }, { status: 200 })
  } catch (err) {
    return Response.json(
      {
        message: 'Failed to fetch alerts.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

type PostBody = {
  portfolioId?: string
  userId?: string
  metrics?: PortfolioMetrics
  holdings?: PortfolioAsset[]
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ message: 'Unauthorized' }, { status: 403 })
  }

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return Response.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const portfolioId = (body.portfolioId ?? '').trim()
  const bodyUserId = (body.userId ?? '').trim()
  const metrics = body.metrics
  const holdings = Array.isArray(body.holdings) ? body.holdings : []

  if (!portfolioId) {
    return Response.json({ message: '`portfolioId` is required.' }, { status: 400 })
  }
  if (!bodyUserId || bodyUserId !== userId) {
    return Response.json(
      { message: 'Forbidden: `userId` must match the authenticated user.' },
      { status: 403 }
    )
  }
  if (!metrics || typeof metrics !== 'object') {
    return Response.json({ message: '`metrics` is required.' }, { status: 400 })
  }

  const portfolioValue = Number(metrics.portfolioValue)
  const var95 = Number(metrics.var95)
  const maxDrawdown = Number(metrics.maxDrawdown)
  const beta = Number(metrics.beta)
  const volatility = Number(metrics.volatility)
  const sharpe = Number(metrics.sharpe)

  if (
    !Number.isFinite(portfolioValue) ||
    !Number.isFinite(var95) ||
    !Number.isFinite(maxDrawdown) ||
    !Number.isFinite(beta) ||
    !Number.isFinite(volatility) ||
    !Number.isFinite(sharpe)
  ) {
    return Response.json(
      { message: '`metrics` must include finite numeric portfolioValue, var95, maxDrawdown, beta, volatility, sharpe.' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdminClient()
  await applyClerkRls(userId)

  const { data: owned, error: ownErr } = await supabase
    .from('portfolios')
    .select('portfolio_id')
    .eq('portfolio_id', portfolioId)
    .eq('user_id', userId)
    .maybeSingle()

  if (ownErr || !owned) {
    return Response.json(
      { message: 'Portfolio not found or not owned by this user.' },
      { status: 403 }
    )
  }

  const normalizedMetrics: PortfolioMetrics = {
    portfolioValue,
    var95,
    maxDrawdown,
    beta,
    volatility,
    sharpe,
  }

  const generated = await checkAndGenerateAlerts(
    portfolioId,
    userId,
    normalizedMetrics,
    holdings
  )

  if (generated.length === 0) {
    return Response.json({ inserted: 0, alerts: [] as Alert[] }, { status: 200 })
  }

  const insertRows = generated.map((a) => ({
    portfolio_id: portfolioId,
    user_id: userId,
    alert_type: a.alert_type,
    severity: a.severity,
    message: a.message,
  }))

  const { data: inserted, error: insErr } = await supabase
    .from('alerts')
    .insert(insertRows)
    .select('*')

  if (insErr) {
    return Response.json(
      { message: 'Failed to insert alerts.', details: insErr.message },
      { status: 500 }
    )
  }

  return Response.json(
    {
      inserted: Array.isArray(inserted) ? inserted.length : 0,
      alerts: generated,
    },
    { status: 201 }
  )
}
