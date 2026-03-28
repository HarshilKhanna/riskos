'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';

export type PortfolioAsset = {
  portfolio_id: string;
  asset_id: string;
  symbol?: string;
  asset_name?: string;
  asset_type?: string | null;
  quantity?: number | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  current_value?: number | null;
  weight?: number | null;
  // Nested "assets" join fields (from Supabase)
  assets?: {
    asset_id: string;
    symbol?: string;
    asset_name?: string;
    asset_type?: string | null;
    current_price?: number | null;
    currency?: string | null;
    last_price_update?: string | null;
  } | null;
  // Attached by GET /api/portfolios/[id] for client-side time series calculations.
  priceHistory?: number[];
};

export type LatestRiskMetrics = Record<string, unknown> | null;

export type Portfolio = {
  portfolio_id: string;
  user_id?: string;
  name: string;
  status: string;
  total_value: number | null;
  last_updated?: string | null;
  created_date?: string | null;
  latest_risk_metrics?: LatestRiskMetrics;
  portfolio_assets?: PortfolioAsset[];
};

export type AddAssetPayload = {
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string; // ISO string preferred
  /** User-confirmed market price used to seed `assets.current_price`, `price_history`, and `portfolio_assets.current_value`. */
  confirmed_current_price: number;
  /** Full directory snapshot (or live-quote synthetic) so the API can INSERT `assets` when missing. */
  asset?: {
    symbol: string;
    name: string;
    type: string;
    exchange: string;
    finnhubSymbol: string;
    fallbackPrice: number;
    currency: 'USD' | 'INR';
    isFallback?: boolean;
  };
};

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizePortfolio(portfolio: Portfolio): Portfolio {
  return {
    ...portfolio,
    total_value: toNumberOrNull((portfolio as any).total_value),
    portfolio_assets: Array.isArray(portfolio.portfolio_assets)
      ? portfolio.portfolio_assets.map((row: any) => ({
          ...row,
          quantity: toNumberOrNull(row.quantity),
          purchase_price: toNumberOrNull(row.purchase_price),
          current_value: toNumberOrNull(row.current_value),
          weight: toNumberOrNull(row.weight),
          assets: row.assets
            ? {
                ...row.assets,
                current_price: toNumberOrNull(row.assets.current_price),
              }
            : row.assets,
        }))
      : portfolio.portfolio_assets,
  }
}

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolioState] = useState<Portfolio | null>(
    null
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activePortfolioIdRef = useRef<string | null>(null);

  useEffect(() => {
    activePortfolioIdRef.current = activePortfolio?.portfolio_id ?? null;
  }, [activePortfolio]);

  const fetchPortfolioDetail = useCallback(async (portfolioId: string, signal?: AbortSignal) => {
    const res = await fetch(`/api/portfolios/${portfolioId}`, { method: 'GET', signal });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.message ?? `Failed to load portfolio (${res.status}).`);
    }

    return normalizePortfolio(json as Portfolio);
  }, []);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setIsRefreshing(true);
      setError(null);

      try {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[usePortfolios] refresh: GET /api/portfolios');
        }
        const res = await fetch('/api/portfolios', { method: 'GET', signal });
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[usePortfolios] refresh: GET /api/portfolios ->', res.status);
        }
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[usePortfolios] refresh failed:', res.status, json);
          }
          throw new Error(json?.message ?? `Failed to load portfolios (${res.status}).`);
        }

        const nextPortfolios = ((json ?? []) as Portfolio[]).map(normalizePortfolio);

        const preferredId = activePortfolioIdRef.current;
        const nextActiveId =
          preferredId && nextPortfolios.some((p) => p.portfolio_id === preferredId)
            ? preferredId
            : nextPortfolios[0]?.portfolio_id ?? null;

        setPortfolios(nextPortfolios);

        if (!nextActiveId) {
          setActivePortfolioState(null);
          return;
        }

        const detail = await fetchPortfolioDetail(nextActiveId, signal);
        setActivePortfolioState(detail);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    },
    [fetchPortfolioDetail]
  );

  useEffect(() => {
    const ac = new AbortController();
    void refresh(ac.signal);
    return () => ac.abort();
  }, [refresh]);

  const activePortfolioId = useMemo(() => activePortfolio?.portfolio_id ?? null, [activePortfolio]);

  const createPortfolio = useCallback(
    async (name: string) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[usePortfolios] createPortfolio: POST /api/portfolios', { name });
      }
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[usePortfolios] createPortfolio failed:', res.status, json);
        }
        throw new Error(json?.message ?? `Failed to create portfolio (${res.status}).`);
      }

      const newPortfolio = normalizePortfolio((await res.json()) as Portfolio);
      setPortfolios((prev) => [newPortfolio, ...prev]);
      setActivePortfolioState(newPortfolio);
      activePortfolioIdRef.current = newPortfolio.portfolio_id;

      // Keep UI snappy with immediate local state; revalidate in background.
      void refresh();
      return newPortfolio;
    },
    [refresh]
  );

  const addAsset = useCallback(
    async (portfolioId: string, payload: AddAssetPayload) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[usePortfolios] addAsset: POST', `/api/portfolios/${portfolioId}/assets`, payload);
      }
      const res = await fetch(`/api/portfolios/${portfolioId}/assets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          '[usePortfolios] addAsset: POST /api/portfolios/[id]/assets ->',
          res.status
        );
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[usePortfolios] addAsset failed:', res.status, json);
        }
        throw new Error(json?.message ?? `Failed to add asset (${res.status}).`);
      }

      await refresh();
    },
    [refresh]
  );

  const removeAsset = useCallback(
    async (portfolioId: string, symbol: string) => {
      const res = await fetch(`/api/portfolios/${portfolioId}/assets`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? `Failed to remove asset (${res.status}).`);
      }

      await refresh();
    },
    [refresh]
  );

  const deletePortfolio = useCallback(
    async (portfolioId: string) => {
      const res = await fetch(`/api/portfolios/${portfolioId}`, { method: 'DELETE' });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? `Failed to delete portfolio (${res.status}).`);
      }

      await refresh();
    },
    [refresh]
  );

  const setActivePortfolio = useCallback(
    async (portfolio: Portfolio | null) => {
      if (!portfolio?.portfolio_id) {
        setActivePortfolioState(null);
        return;
      }
      const detail = await fetchPortfolioDetail(portfolio.portfolio_id);
      setActivePortfolioState(detail);
    },
    [fetchPortfolioDetail]
  );

  return {
    portfolios,
    activePortfolio,
    isLoading: isInitialLoading || isRefreshing,
    isInitialLoading,
    isRefreshing,
    error,

    activePortfolioId,

    createPortfolio,
    addAsset,
    removeAsset,
    deletePortfolio,
    setActivePortfolio,
    refresh,
  };
}

