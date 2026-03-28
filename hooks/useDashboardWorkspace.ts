'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { getMarketStatus } from '@/lib/mockData';
import type { AssetAllocation, CorrelationMatrix, KPIMetrics, TimeSeriesPoint } from '@/lib/mockData';
import { roundPct1 } from '@/lib/format';
import {
  calculateDailyReturns,
  calculateVolatility,
  annualizedSimpleReturnPercent,
} from '@/lib/risk/calculations';
import { useRiskMetrics } from '@/hooks/useRiskMetrics';
import { usePortfolios } from '@/hooks/usePortfolios';
import { toINR as convertToINR } from '@/lib/market/currency';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Asset } from '@/lib/market/assetDirectory';
import type { AlertFeedItem } from '@/components/dashboard/RiskAlertFeed';

export type PortfolioResponse = {
  portfolio: {
    portfolio_id: string;
    user_id: string;
    name: string;
    status: string;
    total_value: number | null;
    last_updated?: string;
  };
  assets: Array<{
    symbol: string;
    asset_name?: string;
    weight: number;
    priceHistory: number[];
    quantity?: number;
    purchase_price?: number;
    current_value?: number;
    current_price?: number | null;
    currency?: 'USD' | 'INR';
  }>;
  latestRiskMetrics: null | {
    var95: number | null;
    var99: number | null;
    sharpe: number | null;
    beta: number | null;
    alpha: number | null;
    max_drawdown: number | null;
    volatility: number | null;
    daily_pnl: number | null;
  };
};

export type MarketStatusState = ReturnType<typeof getMarketStatus> & {
  regime: string;
  updatedAt: string;
};

export const DASHBOARD_COLORS = [
  '#00D4FF',
  '#8B5CF6',
  '#00FF88',
  '#FFB347',
  '#FF3B5C',
  '#38bdf8',
  '#22c55e',
  '#f59e0b',
];

export function useDashboardWorkspace() {
  const { userId } = useAuth();

  const placeholderMarketStatus: MarketStatusState = {
    isOpen: true,
    status: 'NSE/BSE Open · Closes 3:30 PM IST',
    nextEvent: 'NSE/BSE Open · Closes 3:30 PM IST',
    regime: 'Risk-on',
    updatedAt: 'Updated just now',
  };

  const [marketStatus, setMarketStatus] = useState<MarketStatusState>(placeholderMarketStatus);

  const {
    portfolios,
    activePortfolio,
    isInitialLoading,
    error: portfoliosError,
    createPortfolio,
    addAsset,
    removeAsset,
    refresh: refreshPortfolios,
  } = usePortfolios();

  const selectedPortfolioId = activePortfolio?.portfolio_id ?? null;
  const authRequired = portfoliosError === 'Unauthorized';

  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(null);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [alertSeverityCounts, setAlertSeverityCounts] = useState({
    critical: 0,
    warning: 0,
    info: 0,
  });
  const [alertsRefreshToken, setAlertsRefreshToken] = useState(0);

  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addSelectedAsset, setAddSelectedAsset] = useState<Asset | null>(null);
  const [addCurrentPrice, setAddCurrentPrice] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addPurchasePrice, setAddPurchasePrice] = useState('');
  const [addPurchaseDate, setAddPurchaseDate] = useState<string>('');
  const [addBusy, setAddBusy] = useState(false);
  const [addAssetModalKey, setAddAssetModalKey] = useState(0);
  const [addPriceHint, setAddPriceHint] = useState<
    'idle' | 'loading' | 'live' | 'reference' | 'error'
  >('idle');
  const [addPriceChangePct, setAddPriceChangePct] = useState<number | null>(null);

  useEffect(() => {
    if (!addSelectedAsset) {
      setAddPriceHint('idle');
      setAddPriceChangePct(null);
      return;
    }
    const sym = addSelectedAsset.symbol.trim().toUpperCase();
    const ac = new AbortController();
    setAddPriceHint('loading');
    setAddPriceChangePct(null);

    (async () => {
      try {
        const res = await fetch(`/api/prices?symbols=${encodeURIComponent(sym)}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error('price fetch failed');
        const data: unknown = await res.json();
        const row = Array.isArray(data)
          ? (data as Array<{ symbol?: string; current?: number; changePercent?: number }>).find(
              (p) => (p.symbol ?? '').toUpperCase() === sym
            )
          : null;
        if (ac.signal.aborted) return;
        const cur = Number(row?.current);
        if (Number.isFinite(cur) && cur > 0) {
          setAddCurrentPrice(String(cur));
          setAddPriceHint('live');
          const cp = row?.changePercent;
          setAddPriceChangePct(typeof cp === 'number' && Number.isFinite(cp) ? cp : null);
        } else {
          setAddCurrentPrice(String(addSelectedAsset.fallbackPrice));
          setAddPriceHint('reference');
          setAddPriceChangePct(null);
        }
      } catch {
        if (ac.signal.aborted) return;
        setAddCurrentPrice(String(addSelectedAsset.fallbackPrice));
        setAddPriceHint('reference');
        setAddPriceChangePct(null);
      }
    })();

    return () => ac.abort();
  }, [addSelectedAsset]);

  useEffect(() => {
    const raw = getMarketStatus();
    setMarketStatus({
      ...raw,
      regime: raw.isOpen ? 'Risk-on' : 'Risk-off',
      updatedAt: 'Updated just now',
    });
  }, []);

  useEffect(() => {
    setAddPurchaseDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!activePortfolio) {
      setPortfolioData(null);
      return;
    }

    const assets = (activePortfolio.portfolio_assets ?? []).map((pa: any) => ({
      symbol: pa?.assets?.symbol ?? '',
      asset_name: pa?.assets?.asset_name ?? pa?.assets?.symbol,
      weight: Number(pa?.weight ?? 0),
      priceHistory: Array.isArray(pa?.priceHistory) ? pa.priceHistory : [],
      quantity: pa?.quantity ?? undefined,
      purchase_price: pa?.purchase_price ?? undefined,
      current_value: pa?.current_value ?? undefined,
      current_price: pa?.assets?.current_price ?? null,
      currency: pa?.assets?.currency === 'USD' ? ('USD' as const) : ('INR' as const),
    }));

    setPortfolioData({
      portfolio: {
        portfolio_id: activePortfolio.portfolio_id,
        user_id: activePortfolio.user_id ?? '',
        name: activePortfolio.name,
        status: activePortfolio.status,
        total_value:
          activePortfolio.total_value === null || activePortfolio.total_value === undefined
            ? null
            : Number(activePortfolio.total_value),
        last_updated: activePortfolio.last_updated ?? '',
      },
      assets,
      latestRiskMetrics: (activePortfolio.latest_risk_metrics as any) ?? null,
    });
  }, [activePortfolio]);

  const riskHoldings = useMemo(
    () =>
      (portfolioData?.assets ?? [])
        .filter((a) => Boolean(a.symbol))
        .map((a) => ({
          symbol: a.symbol,
          quantity: Number(a.quantity ?? 0),
          purchase_price: Number(a.purchase_price ?? 0),
          weight: Number(a.weight ?? 0),
          currency: a.currency ?? 'INR',
        })),
    [portfolioData]
  );

  const portfolioValueInr = useMemo(() => {
    const pas = activePortfolio?.portfolio_assets ?? [];
    if (pas.length === 0) return Number(activePortfolio?.total_value ?? 0);
    let sum = 0;
    for (const pa of pas) {
      const v = Number(pa.current_value ?? 0);
      const ccy = pa.assets?.currency === 'USD' ? 'USD' : 'INR';
      sum += convertToINR(v, ccy);
    }
    return sum;
  }, [activePortfolio]);

  const onPersistedRisk = useCallback(() => {
    void refreshPortfolios();
  }, [refreshPortfolios]);

  const onAlertsSync = useCallback(() => {
    setAlertsRefreshToken((t) => t + 1);
  }, []);

  const {
    metrics,
    prices,
    histories: priceHistories,
    riskDataReady,
    isLoading: riskPricesLoading,
    isLive: isLivePricing,
  } = useRiskMetrics(riskHoldings, {
    portfolioId: selectedPortfolioId,
    onPersisted: onPersistedRisk,
    onAlertsSync,
  });

  const latestRiskRow = activePortfolio?.latest_risk_metrics as
    | Record<string, unknown>
    | null
    | undefined;
  const dbVar95 = Number(latestRiskRow?.var95 ?? latestRiskRow?.var_95);
  const effectiveVar95 =
    latestRiskRow != null && Number.isFinite(dbVar95)
      ? dbVar95
      : Number(metrics?.var95 ?? 0);

  const refreshAlertBell = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) return;
      const data = (await res.json()) as { active?: AlertFeedItem[] };
      const active = (data.active ?? []).filter((a) => !a.acknowledged);
      setUnreadAlertCount(active.length);
      const counts = { critical: 0, warning: 0, info: 0 };
      for (const a of active) {
        if (a.severity === 'critical') counts.critical += 1;
        else if (a.severity === 'warning') counts.warning += 1;
        else counts.info += 1;
      }
      setAlertSeverityCounts(counts);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshAlertBell();
  }, [refreshAlertBell, alertsRefreshToken]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null = null;
    let realtimeSupabase: ReturnType<typeof getSupabaseBrowserClient> | null = null;
    try {
      realtimeSupabase = getSupabaseBrowserClient();
      channel = realtimeSupabase
        .channel('alerts-bell')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            const row = payload.new as { acknowledged?: boolean; user_id?: string; alert_type?: string; message?: string };
            if (!row || row.acknowledged) return;
            if (userId && row.user_id && row.user_id !== userId) return;
            void refreshAlertBell();
            toast(row.alert_type ?? 'New alert', { description: row.message });
          }
        )
        .subscribe();
    } catch {
      // missing env
    }
    return () => {
      if (channel && realtimeSupabase) {
        void realtimeSupabase.removeChannel(channel);
      }
    };
  }, [userId, refreshAlertBell]);

  const allocation: AssetAllocation[] = useMemo(() => {
    const assets = portfolioData?.assets ?? [];
    return assets.map((a, i) => {
      const rawPct = Math.max(0, (a.weight ?? 0) * 100);
      const pct = roundPct1(rawPct);
      return {
        name: a.asset_name ?? a.symbol,
        symbol: a.symbol,
        value: pct,
        percentage: pct,
        color: DASHBOARD_COLORS[i % DASHBOARD_COLORS.length],
        risk: 0.2,
      };
    });
  }, [portfolioData]);

  const correlationMatrix: CorrelationMatrix = useMemo(() => {
    const assets = portfolioData?.assets ?? [];
    if (assets.length === 0) {
      const neutralAssets = assets.length > 0 ? assets.map((a) => a.symbol) : Array.from({ length: 8 }, (_, i) => `Asset-${i + 1}`);
      const size = neutralAssets.length;
      return {
        assets: neutralAssets,
        correlations: Array.from({ length: size }, (_, i) =>
          Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)),
        ),
      };
    }

    const labels = assets.map((a) => a.symbol);
    const expectedSize = labels.length;
    const raw = metrics?.correlationMatrix ?? [];
    const isSquareMatch =
      Array.isArray(raw) &&
      raw.length === expectedSize &&
      raw.every((row) => Array.isArray(row) && row.length === expectedSize);

    if (!isSquareMatch) {
      return {
        assets: labels,
        correlations: Array.from({ length: expectedSize }, (_, i) =>
          Array.from({ length: expectedSize }, (_, j) => (i === j ? 1 : 0)),
        ),
      };
    }

    return {
      assets: labels,
      correlations: raw,
    };
  }, [metrics, portfolioData]);

  const portfolioPrices252 = useMemo(() => {
    const assets = portfolioData?.assets ?? [];
    if (assets.length === 0) return [];

    const seriesByAsset = assets.map((a) => {
      const symbol = a.symbol;
      const fromHistory = priceHistories[symbol] ?? [];
      const live = Number(prices[symbol]?.current ?? 0);
      const fallback = Number(a.purchase_price ?? a.current_price ?? 1);
      const base =
        fromHistory.length > 0
          ? [...fromHistory]
          : Array.from({ length: 252 }, () =>
              Number.isFinite(live) && live > 0 ? live : fallback
            );

      if (base.length > 0 && Number.isFinite(live) && live > 0) {
        base[base.length - 1] = live;
      }
      return base;
    });

    const lengths = seriesByAsset.map((s) => s.length).filter((n) => n > 1);
    const minLen = lengths.length ? Math.min(...lengths) : 0;
    if (minLen < 2) return [];

    const aligned = seriesByAsset.map((s) => s.slice(s.length - minLen));
    const out: number[] = [];

    for (let i = 0; i < minLen; i++) {
      let total = 0;
      for (let a = 0; a < assets.length; a++) {
        const qty = Number(assets[a].quantity ?? 0);
        const px = Number(aligned[a][i] ?? 0);
        const ccy = assets[a].currency === 'USD' ? 'USD' : 'INR';
        const line = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(px) ? px : 0);
        total += convertToINR(line, ccy);
      }
      out.push(total);
    }
    return out;
  }, [portfolioData, priceHistories, prices]);

  const dailyReturns252 = useMemo(() => {
    if (portfolioPrices252.length < 2) return [];
    return calculateDailyReturns(portfolioPrices252);
  }, [portfolioPrices252]);

  const timeSeries30: TimeSeriesPoint[] = useMemo(() => {
    const priceSeries = portfolioPrices252;
    if (priceSeries.length < 2) return [];
    const sliceLen = Math.min(30, priceSeries.length);
    const startIdx = priceSeries.length - sliceLen;
    const series = priceSeries.slice(startIdx);

    const niftyLen = (priceHistories['NIFTY50'] ?? []).length;
    const endDate = new Date();
    const effectiveLen = niftyLen > 0 ? Math.min(sliceLen, niftyLen) : sliceLen;
    const startOffset = effectiveLen - 1;
    return series.slice(series.length - effectiveLen).map((value, i) => {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (startOffset - i));

      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
      const prev = i === 0 ? series[i] : series[i - 1];
      const pnl = i === 0 ? 0 : value - prev;

      return {
        date: dateStr,
        time: timeStr,
        value,
        pnl,
      };
    });
  }, [portfolioPrices252, priceHistories]);

  const assetMetricsBySymbol = useMemo(() => {
    const out: Record<
      string,
      {
        volatility?: number;
        varContribution?: number;
        change24h?: number | 'flat' | 'unset';
        expectedReturn?: number;
      }
    > = {};
    const assets = portfolioData?.assets ?? [];

    for (const a of assets) {
      const symbol = a.symbol;
      if (!symbol) continue;
      const history = priceHistories[symbol] ?? a.priceHistory ?? [];
      const returns = calculateDailyReturns(history);
      const volatility = returns.length > 1 ? calculateVolatility(returns) * 100 : undefined;

      const weight = Number(a.weight ?? 0);
      const varContribution = Number.isFinite(weight) ? weight * effectiveVar95 : undefined;

      const expectedReturn = annualizedSimpleReturnPercent(history);

      const cp = prices[symbol]?.changePercent;
      let change24h: number | 'flat' | 'unset' = 'unset';
      if (cp !== undefined && cp !== null && Number.isFinite(Number(cp))) {
        const v = Number(cp);
        change24h = v === 0 ? 'flat' : v;
      }

      out[symbol] = {
        volatility,
        varContribution,
        change24h,
        expectedReturn,
      };
    }
    return out;
  }, [effectiveVar95, portfolioData, priceHistories, prices]);

  const kpis: KPIMetrics = useMemo(() => {
    const portfolioValue = portfolioValueInr;
    if (!metrics) {
      return {
        totalPortfolioValue: portfolioValue,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        valueAtRisk: 0,
        sharpeRatio: 0,
        beta: 0,
      };
    }

    const dailyPnL = metrics.dailyPnL;
    const dailyPnLPercent =
      portfolioValue > 0 ? Number((((dailyPnL / portfolioValue) * 100).toFixed(2))) : 0;

    return {
      totalPortfolioValue: portfolioValue,
      dailyPnL,
      dailyPnLPercent,
      valueAtRisk: effectiveVar95,
      sharpeRatio: metrics.sharpe,
      beta: metrics.beta,
    };
  }, [metrics, effectiveVar95, portfolioValueInr]);

  const portfolioValueForCards = portfolioValueInr;

  return {
    marketStatus,
    setMarketStatus,
    portfolios,
    activePortfolio,
    isInitialLoading,
    authRequired,
    createPortfolio,
    addAsset,
    removeAsset,
    refreshPortfolios,
    selectedPortfolioId,
    portfolioData,
    unreadAlertCount,
    setUnreadAlertCount,
    alertSeverityCounts,
    alertsRefreshToken,
    setAlertsRefreshToken,
    addAssetOpen,
    setAddAssetOpen,
    addSelectedAsset,
    setAddSelectedAsset,
    addCurrentPrice,
    setAddCurrentPrice,
    addQuantity,
    setAddQuantity,
    addPurchasePrice,
    setAddPurchasePrice,
    addPurchaseDate,
    setAddPurchaseDate,
    addBusy,
    setAddBusy,
    addAssetModalKey,
    setAddAssetModalKey,
    addPriceHint,
    setAddPriceHint,
    addPriceChangePct,
    setAddPriceChangePct,
    metrics,
    prices,
    priceHistories,
    riskDataReady,
    riskPricesLoading,
    isLivePricing,
    effectiveVar95,
    allocation,
    correlationMatrix,
    portfolioPrices252,
    dailyReturns252,
    timeSeries30,
    assetMetricsBySymbol,
    kpis,
    portfolioValueForCards,
  };
}
