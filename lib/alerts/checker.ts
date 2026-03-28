import { getSupabaseAdminClient } from '@/lib/supabase/client'

export type AlertThresholds = {
  var95_limit: number
  concentration_max: number
  drawdown_limit: number
  beta_max: number
  volatility_max: number
  sharpe_min: number
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  var95_limit: 0.05, // VaR > 5% of portfolio value
  concentration_max: 0.4, // single asset > 40%
  drawdown_limit: -0.05, // worse than -5%
  beta_max: 1.8,
  volatility_max: 0.25, // annualized vol > 25%
  sharpe_min: 0.5, // below 0.5
}

export type PortfolioMetrics = {
  portfolioValue: number
  var95: number
  maxDrawdown: number // decimal, e.g. -0.12
  beta: number
  volatility: number // annualized decimal, e.g. 0.22
  sharpe: number
}

export type PortfolioAsset = {
  symbol: string
  weight: number // decimal, e.g. 0.37
}

export type Alert = {
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export async function checkAndGenerateAlerts(
  portfolioId: string,
  userId: string,
  metrics: PortfolioMetrics,
  holdings: PortfolioAsset[]
): Promise<Alert[]> {
  const alerts: Alert[] = []
  if (!portfolioId || !userId) return alerts

  // 1) VaR Breach
  const varAbs = Math.abs(Number(metrics.var95) || 0)
  const varLimitAbs = Math.max(0, Number(metrics.portfolioValue) || 0) * DEFAULT_ALERT_THRESHOLDS.var95_limit
  if (varAbs > varLimitAbs && varLimitAbs > 0) {
    alerts.push({
      alert_type: 'var_breach',
      severity: 'critical',
      message: `Portfolio VaR (95%) of ₹${Math.round(varAbs).toLocaleString('en-IN')} exceeds limit of ₹${Math.round(varLimitAbs).toLocaleString('en-IN')}. Consider reducing exposure.`,
    })
  }

  // 2) Concentration Risk
  for (const h of holdings ?? []) {
    const w = Number(h.weight) || 0
    if (w > DEFAULT_ALERT_THRESHOLDS.concentration_max) {
      alerts.push({
        alert_type: 'concentration_risk',
        severity: 'warning',
        message: `${String(h.symbol || '').toUpperCase()} concentration at ${(w * 100).toFixed(1)}%. Recommended max: 40%`,
      })
    }
  }

  // 3) Max Drawdown Warning
  if ((Number(metrics.maxDrawdown) || 0) < DEFAULT_ALERT_THRESHOLDS.drawdown_limit) {
    alerts.push({
      alert_type: 'drawdown_warning',
      severity: 'critical',
      message: `Portfolio drawdown of ${(Number(metrics.maxDrawdown) * 100).toFixed(2)}% exceeds historical threshold of -5%`,
    })
  }

  // 4) High Beta Warning
  if ((Number(metrics.beta) || 0) > DEFAULT_ALERT_THRESHOLDS.beta_max) {
    alerts.push({
      alert_type: 'high_beta',
      severity: 'warning',
      message: `Portfolio beta of ${Number(metrics.beta).toFixed(2)} indicates high market sensitivity. Consider adding defensive assets.`,
    })
  }

  // 5) Low Sharpe Warning
  if ((Number(metrics.sharpe) || 0) < DEFAULT_ALERT_THRESHOLDS.sharpe_min) {
    alerts.push({
      alert_type: 'low_sharpe',
      severity: 'info',
      message: `Sharpe ratio of ${Number(metrics.sharpe).toFixed(2)} suggests poor risk-adjusted returns. Review asset allocation.`,
    })
  }

  // 6) High Volatility
  if ((Number(metrics.volatility) || 0) > DEFAULT_ALERT_THRESHOLDS.volatility_max) {
    alerts.push({
      alert_type: 'high_volatility',
      severity: 'warning',
      message: `Portfolio volatility of ${(Number(metrics.volatility) * 100).toFixed(2)}% is above the 25% threshold.`,
    })
  }

  if (alerts.length === 0) return alerts

  // De-duplicate:
  // - collapse duplicate types generated in this pass
  // - skip types that already have an unacknowledged active alert in Supabase
  const firstByType = new Map<string, Alert>()
  for (const a of alerts) {
    if (!firstByType.has(a.alert_type)) firstByType.set(a.alert_type, a)
  }
  const unique = Array.from(firstByType.values())

  const supabase = getSupabaseAdminClient()
  const { data: existing } = await supabase
    .from('alerts')
    .select('alert_type')
    .eq('portfolio_id', portfolioId)
    .eq('user_id', userId)
    .eq('acknowledged', false)
    .in(
      'alert_type',
      unique.map((a) => a.alert_type)
    )

  const blocked = new Set((existing ?? []).map((r: any) => String(r.alert_type)))
  return unique.filter((a) => !blocked.has(a.alert_type))
}

