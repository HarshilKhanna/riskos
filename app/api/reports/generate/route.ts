import { auth } from '@clerk/nextjs/server';
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client';
import {
  PortfolioReportDocument,
  type PortfolioReportData,
} from '@/lib/reports/PortfolioReportDocument';

export const runtime = 'nodejs';

type GenerateReportPayload = {
  portfolioId: string;
  format: 'pdf' | 'json';
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: GenerateReportPayload;
  try {
    body = (await req.json()) as GenerateReportPayload;
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const portfolioId = (body?.portfolioId ?? '').trim();
  const format = body?.format ?? 'pdf';
  if (!portfolioId) {
    return new Response(JSON.stringify({ message: '`portfolioId` is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (format !== 'pdf' && format !== 'json') {
    return new Response(JSON.stringify({ message: '`format` must be "pdf" or "json".' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getSupabaseAdminClient();
  await applyClerkRls(userId);

  // Fetch portfolio and check ownership
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('portfolio_id,user_id,name,total_value,status,last_updated')
    .eq('portfolio_id', portfolioId)
    .single();

  if (pErr || !portfolio) {
    return new Response(JSON.stringify({ message: 'Portfolio not found.' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (portfolio.user_id !== userId) {
    return new Response(JSON.stringify({ message: 'Forbidden.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data: metricsRows } = await supabase
    .from('risk_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('calculated_at', { ascending: false })
    .limit(1);
  const latest = metricsRows?.[0] ?? null;

  const { data: assetRows } = await supabase
    .from('portfolio_assets')
    .select(`
      quantity,purchase_price,current_value,weight,
      assets(symbol,asset_name)
    `)
    .eq('portfolio_id', portfolioId);

  const { data: alertsRows } = await supabase
    .from('alerts')
    .select('severity,message,triggered_at,acknowledged')
    .eq('portfolio_id', portfolioId)
    .order('triggered_at', { ascending: false })
    .limit(20);

  const totalValue = Number(portfolio.total_value ?? 0);
  const var99 = Number(latest?.var99 ?? 0);
  const monteMean = totalValue + Number(latest?.daily_pnl ?? 0) * 30;
  const monteLower = Math.max(0, monteMean - var99);
  const monteUpper = monteMean + var99;

  const reportData: PortfolioReportData = {
    generatedAt: new Date().toISOString(),
    portfolio: {
      id: portfolio.portfolio_id,
      name: portfolio.name,
      totalValue,
    },
    metrics: {
      var95: Number(latest?.var95 ?? 0),
      var99,
      sharpe: Number(latest?.sharpe ?? 0),
      beta: Number(latest?.beta ?? 0),
      alpha: Number(latest?.alpha ?? 0),
      maxDrawdown: Number(latest?.max_drawdown ?? 0),
      volatility: Number(latest?.volatility ?? 0),
      dailyPnl: Number(latest?.daily_pnl ?? 0),
    },
    assets: (assetRows ?? []).map((r: any) => ({
      symbol: r.assets?.symbol ?? 'N/A',
      name: r.assets?.asset_name ?? r.assets?.symbol ?? 'Unknown',
      weightPct: Number(r.weight ?? 0) * 100,
      currentValue: Number(r.current_value ?? 0),
    })),
    alerts: (alertsRows ?? []).map((a: any) => ({
      severity: String(a.severity ?? 'info'),
      message: String(a.message ?? ''),
      triggeredAt: String(a.triggered_at ?? new Date().toISOString()),
      acknowledged: Boolean(a.acknowledged),
    })),
    monteCarlo: {
      mean: monteMean,
      lower95: monteLower,
      upper95: monteUpper,
      range: monteUpper - monteLower,
    },
  };

  // Store report metadata (best-effort; do not fail PDF generation if table shape differs).
  const fileName = `risk-report-${portfolio.portfolio_id}-${Date.now()}.pdf`;
  try {
    await supabase.from('reports').insert({
      portfolio_id: portfolio.portfolio_id,
      user_id: userId,
      format,
      file_name: fileName,
      generated_at: new Date().toISOString(),
      status: 'generated',
    });
  } catch {
    // ignore metadata insert failures
  }

  if (format === 'json') {
    return new Response(JSON.stringify(reportData), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const doc = createElement(PortfolioReportDocument, { data: reportData });
  const buffer = await pdf(doc).toBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store',
    },
  });
}

