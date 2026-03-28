import { auth } from '@clerk/nextjs/server';
import { calculatePortfolioMetrics } from '@/lib/risk/calculations';
import { checkAndGenerateAlerts } from '@/lib/alerts/checker';
import { applyClerkRls, getSupabaseAdminClient } from '@/lib/supabase/client';
import { createHash } from 'crypto';

type IncomingHolding = {
  symbol: string;
  weight: number;
  priceHistory: number[];
};

type HoldingsPayload = {
  holdings: IncomingHolding[];
  portfolioValue?: number;
  portfolioId?: string;
};

type CacheEntry = {
  expiresAtMs: number;
  value: unknown;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const inMemoryCache = new Map<string, CacheEntry>();

type CalculatedMetrics = {
  var95: number;
  var99: number;
  sharpe: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  volatility: number;
  dailyPnL: number;
};

async function insertRiskMetricsRow(portfolioId: string, metrics: CalculatedMetrics) {
  const supabase = getSupabaseAdminClient();
  const { error: upsertErr } = await supabase.from('risk_metrics').insert({
    portfolio_id: portfolioId,
    calculated_at: new Date().toISOString(),
    var95: metrics.var95,
    var99: metrics.var99,
    sharpe: metrics.sharpe,
    beta: metrics.beta,
    alpha: metrics.alpha,
    max_drawdown: metrics.maxDrawdown,
    volatility: metrics.volatility,
    daily_pnl: metrics.dailyPnL,
  });
  if (upsertErr) {
    // eslint-disable-next-line no-console
    console.error('[risk/calculate] risk_metrics insert failed:', upsertErr.message);
  }
}

async function insertAlertsAfterRiskMetrics(
  portfolioId: string,
  userId: string,
  portfolioValue: number,
  metrics: CalculatedMetrics,
  holdings: IncomingHolding[]
) {
  const generated = await checkAndGenerateAlerts(
    portfolioId,
    userId,
    {
      portfolioValue,
      var95: metrics.var95,
      maxDrawdown: metrics.maxDrawdown / 100,
      beta: metrics.beta,
      volatility: metrics.volatility,
      sharpe: metrics.sharpe,
    },
    holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }))
  );
  if (generated.length === 0) return;

  const supabase = getSupabaseAdminClient();
  const rows = generated.map((a) => ({
    portfolio_id: portfolioId,
    user_id: userId,
    alert_type: a.alert_type,
    severity: a.severity,
    message: a.message,
  }));
  const { error } = await supabase.from('alerts').insert(rows);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[risk/calculate] alerts insert failed:', error.message);
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function normalizeAndValidateHoldings(holdings: unknown): IncomingHolding[] | null {
  if (!Array.isArray(holdings)) return null;
  if (holdings.length < 2) return null;

  const normalized: IncomingHolding[] = [];
  for (const h of holdings) {
    if (!h || typeof h !== 'object') return null;
    const maybe = h as Partial<IncomingHolding>;

    if (typeof maybe.symbol !== 'string' || maybe.symbol.trim().length === 0) return null;
    if (!isFiniteNumber(maybe.weight)) return null;
    if (!Array.isArray(maybe.priceHistory) || maybe.priceHistory.length < 30) return null;
    if (!maybe.priceHistory.every((x) => isFiniteNumber(x))) return null;

    normalized.push({
      symbol: maybe.symbol.trim(),
      weight: maybe.weight,
      priceHistory: maybe.priceHistory as number[],
    });
  }

  return normalized.length >= 2 ? normalized : null;
}

function stableHoldingsHash(userId: string, holdings: IncomingHolding[]): string {
  // Make the hash independent of input order by sorting by symbol.
  const sorted = [...holdings].sort((a, b) => a.symbol.localeCompare(b.symbol));

  // Build a deterministic string.
  const payload = sorted
    .map((h) => {
      const prices = h.priceHistory.join(',');
      return `${h.symbol}:${h.weight}:${prices}`;
    })
    .join('|');

  const digest = createHash('sha256').update(`${userId}|${payload}`).digest('hex');
  return digest;
}

export async function POST(req: Request) {
  const { userId } = auth();

  if (!userId) {
    return new Response(JSON.stringify({ message: 'Unauthorized: missing Clerk user.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: HoldingsPayload;
  try {
    body = (await req.json()) as HoldingsPayload;
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const holdings = normalizeAndValidateHoldings(body?.holdings);
  if (!holdings) {
    return new Response(
      JSON.stringify({
        message:
          'Invalid input: provide `holdings` with at least 2 items; each holding must include `symbol` (string), `weight` (number), and `priceHistory` (number[] with minimum 30 points).',
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  await applyClerkRls(userId);

  const portfolioValueRaw = body?.portfolioValue;
  const portfolioValue =
    portfolioValueRaw === undefined
      ? 1
      : typeof portfolioValueRaw === 'number' && Number.isFinite(portfolioValueRaw)
        ? portfolioValueRaw
        : 1;
  const portfolioId = typeof body?.portfolioId === 'string' ? body.portfolioId.trim() : '';

  const cacheKey = `${userId}:${stableHoldingsHash(userId, holdings)}`;
  const now = Date.now();
  const cached = inMemoryCache.get(cacheKey);
  if (cached && cached.expiresAtMs > now) {
    if (portfolioId) {
      try {
        await insertRiskMetricsRow(portfolioId, cached.value as CalculatedMetrics);
        await insertAlertsAfterRiskMetrics(
          portfolioId,
          userId,
          portfolioValue,
          cached.value as CalculatedMetrics,
          holdings
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[risk/calculate] risk_metrics insert (cache hit) exception:', e);
      }
    }
    return new Response(JSON.stringify(cached.value), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const metrics = calculatePortfolioMetrics(
      holdings.map((h) => ({
        weight: h.weight,
        prices: h.priceHistory,
      })),
      portfolioValue
    );

    inMemoryCache.set(cacheKey, { expiresAtMs: now + CACHE_TTL_MS, value: metrics });

    if (portfolioId) {
      try {
        await insertRiskMetricsRow(portfolioId, metrics);
        await insertAlertsAfterRiskMetrics(portfolioId, userId, portfolioValue, metrics, holdings);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[risk/calculate] risk_metrics insert exception:', e);
      }
    }

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        message: 'Failed to calculate portfolio risk metrics.',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

