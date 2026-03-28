import { createClient } from '@supabase/supabase-js'

let cachedAdmin: ReturnType<typeof createClient> | null = null
let cachedBrowser: ReturnType<typeof createClient> | null = null

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getAdminKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
}

function getPublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

function createAdmin() {
  const url = getSupabaseUrl()
  const key = getAdminKey()
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!key) {
    throw new Error(
      'Missing admin Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.'
    )
  }
  return createClient(url, key)
}

function createBrowser() {
  const url = getSupabaseUrl()
  const key = getPublicKey()
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!key) {
    throw new Error(
      'Missing public Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }
  return createClient(url, key)
}

// Server-side client (full access, use only in API routes)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop, receiver) {
    if (!cachedAdmin) cachedAdmin = createAdmin()
    return Reflect.get(cachedAdmin as object, prop, receiver)
  },
})

// Client-side client (respects RLS, use in components/hooks)
export const supabaseClient = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop, receiver) {
    if (!cachedBrowser) cachedBrowser = createBrowser()
    return Reflect.get(cachedBrowser as object, prop, receiver)
  },
})

// Backwards-compatible wrappers for existing code.
export function getSupabaseAdminClient() {
  return supabaseAdmin
}

export function getSupabaseBrowserClient() {
  return supabaseClient
}

// Per-request client with Clerk user header for RLS context.
export function supabaseWithUser(clerkUserId: string) {
  const url = getSupabaseUrl()
  const key = getAdminKey()
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!key) {
    throw new Error(
      'Missing admin Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.'
    )
  }

  return createClient(url, key, {
    global: {
      headers: {
        'x-clerk-user-id': clerkUserId,
      },
    },
    db: {
      schema: 'public',
    },
  })
}

/**
 * Optional per-request Postgres session context for RLS.
 * The admin client uses the service role, which **bypasses RLS** in Supabase, so
 * every API route already scopes by `user_id` / ownership checks in code.
 * Calling `set_clerk_user_id` adds an extra round-trip on every request and can
 * dominate latency (or fail with 500) if the RPC is missing or slow.
 */
export async function applyClerkRls(clerkUserId: string) {
  const supabase = getSupabaseAdminClient()
  if (process.env.SUPABASE_APPLY_CLERK_RLS_RPC === '1') {
    await supabase.rpc('set_clerk_user_id', { clerk_id: clerkUserId })
  }
  return supabase
}

export async function getUserPortfolios(clerkUserId: string) {
  const { data, error } = await supabaseAdmin
    .from('portfolios')
    .select(
      'portfolio_id,name,status,total_value,last_updated,created_date,user_id'
    )
    .eq('user_id', clerkUserId)
    .order('created_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPortfolioWithMetrics(portfolioId: string) {
  // Portfolio core
  const { data: portfolio, error: portfolioError } = await supabaseAdmin
    .from('portfolios')
    .select(
      'portfolio_id,user_id,name,status,total_value,last_updated,created_date'
    )
    .eq('portfolio_id', portfolioId)
    .single();

  if (portfolioError) {
    return { portfolio: null, assets: [], latestRiskMetrics: null };
  }

  const normalizedPortfolio =
    portfolio && 'total_value' in portfolio
      ? {
          ...portfolio,
          total_value:
            portfolio.total_value === null ? null : Number(portfolio.total_value),
        }
      : portfolio;

  // Latest risk metrics
  const { data: latestRiskMetrics } = await supabaseAdmin
    .from('risk_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('calculated_at', { ascending: false })
    .limit(1);

  const latest = Array.isArray(latestRiskMetrics) ? latestRiskMetrics[0] : null;

  // Portfolio assets + weights
  const { data: portfolioAssets, error: paError } = await supabaseAdmin
    .from('portfolio_assets')
    .select(
      `
        quantity,
        purchase_price,
        purchase_date,
        current_value,
        weight,
        asset_id,
        assets (
          asset_name,
          symbol,
          asset_type,
          current_price,
          currency,
          last_price_update
        )
      `
    )
    .eq('portfolio_id', portfolioId);

  if (paError) throw new Error(paError.message);

  const assets: any[] = [];

  // Attach recent price history per symbol (up to 252 points).
  for (const pa of portfolioAssets ?? []) {
    const asset = (pa as any).assets;
    const symbol = asset?.symbol as string | undefined;

    let priceHistory: number[] = [];
    if (symbol) {
      const { data: priceRows } = await supabaseAdmin
        .from('price_history')
        .select('price, recorded_at')
        .eq('symbol', symbol)
        .order('recorded_at', { ascending: false })
        .limit(252);

      if (Array.isArray(priceRows)) {
        priceHistory = [...priceRows]
          .reverse()
          .map((r: any) => Number(r.price))
          .filter((n: number) => Number.isFinite(n));
      }
    }

    assets.push({
      asset_id: pa.asset_id,
      symbol,
      asset_name: asset?.asset_name ?? symbol,
      asset_type: asset?.asset_type,
      quantity:
        pa.quantity === null || pa.quantity === undefined ? null : Number(pa.quantity),
      purchase_price:
        pa.purchase_price === null || pa.purchase_price === undefined
          ? null
          : Number(pa.purchase_price),
      purchase_date: pa.purchase_date,
      current_value:
        pa.current_value === null || pa.current_value === undefined
          ? null
          : Number(pa.current_value),
      weight: pa.weight === null || pa.weight === undefined ? 0 : Number(pa.weight),
      current_price: asset?.current_price,
      currency: asset?.currency,
      last_price_update: asset?.last_price_update,
      priceHistory,
    });
  }

  return { portfolio: normalizedPortfolio, assets, latestRiskMetrics: latest };
}

