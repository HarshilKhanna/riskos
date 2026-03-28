/**
 * Risk & performance calculations (pure math).
 * No external dependencies; uses only standard JS Math.
 */

export type PriceSeries = number[];

export type HoldingWithPrices = {
  weight: number;
  prices: PriceSeries;
};

export function calculateDailyReturns(prices: number[]): number[] {
  if (!Array.isArray(prices) || prices.length < 2) return [];
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    // Daily log return: ln(P[i] / P[i-1])
    returns.push(Math.log(curr / prev));
  }

  return returns;
}

/** Simple (arithmetic) daily returns — use for Sharpe and annualized "historical expected return". */
export function calculateSimpleDailyReturns(prices: number[]): number[] {
  if (!Array.isArray(prices) || prices.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) continue;
    returns.push((curr - prev) / prev);
  }
  return returns;
}

/** Annualized historical return from simple daily returns, as percentage (e.g. 8.2 means 8.2%). */
export function annualizedSimpleReturnPercent(prices: number[]): number | undefined {
  const r = calculateSimpleDailyReturns(prices);
  if (r.length < 2) return undefined;
  const m = mean(r) * 252 * 100;
  return Number.isFinite(m) ? m : undefined;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

// Sample variance (uses n-1) for more stable risk estimates.
function variance(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (const v of values) {
    const d = v - m;
    sumSq += d * d;
  }
  return sumSq / (n - 1);
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;

  const aSlice = a.slice(0, n);
  const bSlice = b.slice(0, n);

  const meanA = mean(aSlice);
  const meanB = mean(bSlice);

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (aSlice[i] - meanA) * (bSlice[i] - meanB);
  }

  return sum / (n - 1);
}

function percentileSorted(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const clamped = Math.min(1, Math.max(0, p));
  if (sortedAsc.length === 1) return sortedAsc[0];

  // Linear interpolation between closest ranks.
  const idx = (sortedAsc.length - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const w = idx - lo;
  const a = sortedAsc[lo];
  const b = sortedAsc[hi];
  return a + (b - a) * w;
}

export function calculateVaR(
  returns: number[],
  confidenceLevel: number,
  portfolioValue: number
): number {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const cl = Math.min(0.999999, Math.max(0.000001, confidenceLevel));

  // Historical VaR: take the (1 - confidence) percentile of sorted returns.
  const alpha = 1 - cl;
  const sorted = [...returns].sort((a, b) => a - b);
  const percentileReturn = percentileSorted(sorted, alpha);

  // Multiply by portfolio value to express in INR.
  return percentileReturn * portfolioValue;
}

/**
 * Sharpe from **simple** daily returns: excess return vs annual risk-free rate
 * converted to a daily rate (rf/252), then annualized: (mean(excess)/std(excess))*sqrt(252).
 */
export function calculateSharpeRatio(
  simpleDailyReturns: number[],
  riskFreeRate: number = 0.065
): number {
  if (!Array.isArray(simpleDailyReturns) || simpleDailyReturns.length < 2) return 0;
  const rfDaily = riskFreeRate / 252;
  const excess = simpleDailyReturns.map((r) => r - rfDaily);
  const m = mean(excess);
  const s = stdDev(excess);
  if (s === 0) return 0;
  return (m / s) * Math.sqrt(252);
}

export function calculateBeta(
  assetReturns: number[],
  marketReturns: number[]
): number {
  if (!Array.isArray(assetReturns) || !Array.isArray(marketReturns)) return 0;

  const cov = covariance(assetReturns, marketReturns);
  const mVar = variance(marketReturns);
  if (mVar === 0) return 0;
  return cov / mVar;
}

export function calculateAlpha(
  assetReturns: number[],
  marketReturns: number[],
  riskFreeRate: number = 0.065
): number {
  if (assetReturns.length === 0 || marketReturns.length === 0) return 0;

  const beta = calculateBeta(assetReturns, marketReturns);

  const annualizedAssetReturn = mean(assetReturns) * 252;
  const annualizedMarketReturn = mean(marketReturns) * 252;

  // Alpha = annualAssetReturn - (rf + beta*(annualMarketReturn - rf))
  return (
    annualizedAssetReturn -
    (riskFreeRate + beta * (annualizedMarketReturn - riskFreeRate))
  );
}

export function calculateMaxDrawdown(prices: number[]): number {
  if (!Array.isArray(prices) || prices.length < 2) return 0;

  let peak = prices[0];
  let worst = 0; // most negative drawdown

  for (let i = 1; i < prices.length; i++) {
    const p = prices[i];
    if (p > peak) peak = p;
    if (peak === 0) continue;

    const drawdown = p / peak - 1; // negative or zero
    if (drawdown < worst) worst = drawdown;
  }

  // Return as a negative percentage
  return worst * 100;
}

export function calculateVolatility(returns: number[]): number {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const s = stdDev(returns);
  return s * Math.sqrt(252);
}

export function calculateCorrelationMatrix(
  returnsMatrix: number[][]
): number[][] {
  const n = returnsMatrix.length;
  const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  const stds = returnsMatrix.map((r) => stdDev(r));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        out[i][j] = 1;
        continue;
      }
      const denom = stds[i] * stds[j];
      if (denom === 0) {
        out[i][j] = 0;
        continue;
      }
      out[i][j] = covariance(returnsMatrix[i], returnsMatrix[j]) / denom;
    }
  }

  return out;
}

function randn(): number {
  // Box–Muller transform to sample from N(0,1)
  // Note: stochastic by nature (uses Math.random()).
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloSimulation(
  currentValue: number,
  dailyReturns: number[],
  days: number = 30,
  simulations: number = 1000,
  onProgress?: (batchPaths: number[][], completed: number, total: number) => void
): {
  paths: number[][];
  mean: number;
  upper95: number;
  lower95: number;
  range: number;
} {
  const cleanReturns = Array.isArray(dailyReturns) ? dailyReturns : [];
  if (!Number.isFinite(currentValue) || currentValue <= 0) {
    return { paths: [], mean: 0, upper95: 0, lower95: 0, range: 0 };
  }
  if (cleanReturns.length === 0) {
    const terminal = currentValue;
    return { paths: Array.from({ length: simulations }, () => [terminal]), mean: terminal, upper95: terminal, lower95: terminal, range: 0 };
  }

  const mu = mean(cleanReturns); // mean of log returns per day
  const observedSigma = stdDev(cleanReturns); // std dev of log returns per day

  // Real-world guardrail:
  // if input returns are flat (often due to sparse/fallback price history),
  // GBM collapses to a deterministic line. Use a small volatility floor so
  // simulation still explores plausible paths.
  const MIN_DAILY_VOL = 0.01; // ~1.0% daily floor for visible CI spread
  const sigma = Math.max(observedSigma, MIN_DAILY_VOL);
  const dt = 1; // one day

  const drift = mu - 0.5 * sigma * sigma;
  const vol = sigma * Math.sqrt(dt);

  const paths: number[][] = [];
  const endValues: number[] = [];
  const batchSize = 25;
  let batch: number[][] = [];

  for (let s = 0; s < simulations; s++) {
    let price = currentValue;
    const path: number[] = [price];

    for (let d = 0; d < days; d++) {
      const z = randn();
      price = price * Math.exp(drift * dt + vol * z);
      path.push(price);
    }

    paths.push(path);
    endValues.push(path[path.length - 1]);

    batch.push(path);
    if (batch.length >= batchSize || s === simulations - 1) {
      onProgress?.(batch, s + 1, simulations);
      batch = [];
    }
  }

  const sortedEnds = [...endValues].sort((a, b) => a - b);

  const meanEnd = mean(endValues);
  const lower95 = percentileSorted(sortedEnds, 0.025);
  const upper95 = percentileSorted(sortedEnds, 0.975);

  return {
    paths,
    mean: meanEnd,
    upper95,
    lower95,
    range: upper95 - lower95,
  };
}

export function calculatePortfolioMetrics(
  holdings: HoldingWithPrices[],
  portfolioValue: number = 1,
  riskFreeRate: number = 0.065
): {
  var95: number;
  var99: number;
  sharpe: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  volatility: number;
  dailyPnL: number;
  correlationMatrix: number[][];
} {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return {
      var95: 0,
      var99: 0,
      sharpe: 0,
      beta: 0,
      alpha: 0,
      maxDrawdown: 0,
      volatility: 0,
      dailyPnL: 0,
      correlationMatrix: [],
    };
  }

  // Normalize weights:
  // - If weights look like percentages (sum > 1.5), treat as % and divide by 100.
  // - Otherwise treat as fractions already.
  const sumW = holdings.reduce((acc, h) => acc + h.weight, 0);
  const weightScale = sumW > 1.5 ? 1 / 100 : 1;
  const weights = holdings.map((h) => h.weight * weightScale);

  // Daily returns per asset
  const assetReturns = holdings.map((h) => calculateDailyReturns(h.prices));
  const nAssets = assetReturns.length;
  const minLen = Math.min(...assetReturns.map((r) => r.length));
  if (minLen === 0) {
    return {
      var95: 0,
      var99: 0,
      sharpe: 0,
      beta: 0,
      alpha: 0,
      maxDrawdown: 0,
      volatility: 0,
      dailyPnL: 0,
      correlationMatrix: Array.from({ length: nAssets }, () =>
        Array(nAssets).fill(0)
      ),
    };
  }

  const alignedAssetReturns = assetReturns.map((r) => r.slice(0, minLen));

  // Build a "market" proxy as average return across assets (so beta/alpha are meaningful).
  const marketReturns: number[] = [];
  for (let i = 0; i < minLen; i++) {
    let acc = 0;
    for (let a = 0; a < nAssets; a++) acc += alignedAssetReturns[a][i];
    marketReturns.push(acc / nAssets);
  }

  // Portfolio daily log returns approximated as weighted sum of asset log returns.
  const portfolioReturns: number[] = [];
  for (let i = 0; i < minLen; i++) {
    let r = 0;
    for (let a = 0; a < nAssets; a++) {
      r += weights[a] * alignedAssetReturns[a][i];
    }
    portfolioReturns.push(r);
  }

  // Portfolio value series for max drawdown (weighted sum of prices).
  const pricesMatrix = holdings.map((h) => h.prices);
  const minPricesLen = Math.min(...pricesMatrix.map((p) => p.length));
  const alignedPrices = pricesMatrix.map((p) => p.slice(0, minPricesLen));

  const portfolioPrices: number[] = [];
  for (let t = 0; t < minPricesLen; t++) {
    let v = 0;
    for (let a = 0; a < nAssets; a++) v += weights[a] * alignedPrices[a][t];
    portfolioPrices.push(v);
  }

  const var95 = calculateVaR(portfolioReturns, 0.95, portfolioValue);
  const var99 = calculateVaR(portfolioReturns, 0.99, portfolioValue);
  const portfolioSimpleReturns = calculateSimpleDailyReturns(portfolioPrices);
  const sharpe = calculateSharpeRatio(portfolioSimpleReturns, riskFreeRate);
  const beta = calculateBeta(portfolioReturns, marketReturns);
  const alpha = calculateAlpha(portfolioReturns, marketReturns, riskFreeRate);
  const maxDrawdown = calculateMaxDrawdown(portfolioPrices);
  const volatility = calculateVolatility(portfolioReturns);

  const lastPortfolioReturn = portfolioReturns[portfolioReturns.length - 1] ?? 0;
  // dailyPnL in INR based on the last day return * portfolioValue.
  const dailyPnL = lastPortfolioReturn * portfolioValue;

  const correlationMatrix = calculateCorrelationMatrix(alignedAssetReturns);

  return {
    var95,
    var99,
    sharpe,
    beta,
    alpha,
    maxDrawdown,
    volatility,
    dailyPnL,
    correlationMatrix,
  };
}

