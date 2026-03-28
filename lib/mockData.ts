/**
 * Mock Data Generators
 * Realistic fintech portfolio data for RiskOS dashboard
 */

export interface KPIMetrics {
  totalPortfolioValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  valueAtRisk: number;
  sharpeRatio: number;
  beta: number;
}

export interface AssetAllocation {
  name: string;
  /** Short ticker-style label for legend (e.g. NIFTY50). Falls back to abbreviation if omitted. */
  symbol?: string;
  value: number;
  percentage: number;
  color: string;
  risk: number;
}

export interface TimeSeriesPoint {
  date: string;
  time: string;
  value: number;
  pnl: number;
}

export interface CorrelationMatrix {
  assets: string[];
  correlations: number[][];
}

export interface RiskAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  acknowledged: boolean;
}

export interface AssetHolding {
  symbol: string;
  name: string;
  weight: number;
  expectedReturn: number;
  volatility: number;
  varContribution: number;
  beta: number;
  value: number;
  shares: number;
  price: number;
  change24h: number;
}

export interface MonteCarloPaths {
  date: string;
  paths: Array<{ x: number; y: number }>;
  mean: number;
  ci95Upper: number;
  ci95Lower: number;
  ci68Upper: number;
  ci68Lower: number;
}

// Generate realistic KPI metrics
export function generateKPIMetrics(): KPIMetrics {
  // Anchor around ₹2,15,43,200 with a small random band
  const totalPortfolioValue = 21_543_200 + (Math.random() - 0.5) * 500_000;
  const dailyPnL = (Math.random() - 0.5) * 150_000;
  const dailyPnLPercent = (dailyPnL / totalPortfolioValue) * 100;

  return {
    totalPortfolioValue: Math.round(totalPortfolioValue),
    dailyPnL: Math.round(dailyPnL),
    dailyPnLPercent: Math.round(dailyPnLPercent * 100) / 100,
    valueAtRisk: Math.round(totalPortfolioValue * (0.02 + Math.random() * 0.03) * 100) / 100,
    sharpeRatio: Math.round((0.8 + Math.random() * 0.4) * 100) / 100,
    beta: Math.round((0.85 + Math.random() * 0.3) * 100) / 100,
  };
}

// Asset allocation breakdown
export function generateAssetAllocation(): AssetAllocation[] {
  return [
    {
      name: 'Indian Large Cap',
      symbol: 'NIFTY',
      value: 7_500_000,
      percentage: 30,
      color: '#00D4FF',
      risk: 0.18,
    },
    {
      name: 'Indian Mid & Small Cap',
      symbol: 'MIDCP',
      value: 5_500_000,
      percentage: 22,
      color: '#8B5CF6',
      risk: 0.22,
    },
    {
      name: 'Government Securities (G-Sec)',
      symbol: 'GSEC',
      value: 6_000_000,
      percentage: 24,
      color: '#00FF88',
      risk: 0.08,
    },
    {
      name: 'Gold & Commodities',
      symbol: 'GOLD',
      value: 3_500_000,
      percentage: 14,
      color: '#FFB347',
      risk: 0.25,
    },
    {
      name: 'Alternatives / Crypto',
      symbol: 'ALT',
      value: 2_500_000,
      percentage: 10,
      color: '#FF3B5C',
      risk: 0.35,
    },
  ];
}

// Time series P&L data
export function generateTimeSeriesData(days: number = 30): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  let baseValue = 21_543_200;

  for (let i = -days; i <= 0; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    // Random walk with visible variation (~±1.5% around base)
    const dailyVolatility = 0.015; // 1.5%
    const randomShock = (Math.random() - 0.5) * 2 * dailyVolatility;
    const drift = 0.0005; // small positive drift
    const change = baseValue * (drift + randomShock);
    baseValue += change;

    data.push({
      date: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      value: Math.round(baseValue),
      pnl: Math.round(change),
    });
  }

  return data;
}

// Correlation matrix for assets
export function generateCorrelationMatrix(): CorrelationMatrix {
  const assets = [
    'NIFTY50',
    'SENSEX',
    'NIFTYIT',
    'GSEC',
    'GOLDBEES',
    'BTCINR',
    'INDIAVIX',
    'USDINR',
  ];

  // Semi-realistic correlation values
  const correlations = [
    [1.0, 0.85, 0.72, -0.15, 0.32, 0.28, -0.68, -0.52],
    [0.85, 1.0, 0.68, -0.22, 0.25, 0.35, -0.75, -0.48],
    [0.72, 0.68, 1.0, -0.08, 0.28, 0.22, -0.62, -0.45],
    [-0.15, -0.22, -0.08, 1.0, 0.12, 0.08, 0.35, 0.28],
    [0.32, 0.25, 0.28, 0.12, 1.0, 0.35, -0.18, 0.15],
    [0.28, 0.35, 0.22, 0.08, 0.35, 1.0, -0.25, 0.32],
    [-0.68, -0.75, -0.62, 0.35, -0.18, -0.25, 1.0, 0.42],
    [-0.52, -0.48, -0.45, 0.28, 0.15, 0.32, 0.42, 1.0],
  ];

  return { assets, correlations };
}

// Risk alerts feed
export function generateRiskAlerts(): RiskAlert[] {
  return [
    {
      id: '1',
      severity: 'critical',
      title: 'VaR Threshold Breach',
      description:
        'Portfolio VaR exceeded 95% confidence level. Current: ₹73,500 vs limit: ₹60,000',
      timestamp: '2 minutes ago',
      icon: '⚠️',
      acknowledged: false,
    },
    {
      id: '2',
      severity: 'warning',
      title: 'Concentration Risk Alert',
      description: 'Tech sector concentration at 42%. Recommended max: 35%',
      timestamp: '15 minutes ago',
      icon: '📊',
      acknowledged: false,
    },
    {
      id: '3',
      severity: 'warning',
      title: 'Volatility Spike Detected',
      description: 'Portfolio volatility increased 18% in last hour. Current: 22.5%',
      timestamp: '28 minutes ago',
      icon: '📈',
      acknowledged: true,
    },
    {
      id: '4',
      severity: 'info',
      title: 'Rebalancing Suggested',
      description: 'Bond allocation has drifted 2.3% from target. Review needed.',
      timestamp: '1 hour ago',
      icon: '💡',
      acknowledged: true,
    },
    {
      id: '5',
      severity: 'critical',
      title: 'Drawdown Warning',
      description: 'Portfolio drawdown: -5.2% this week. Historical weekly avg: -1.8%',
      timestamp: '2 hours ago',
      icon: '📉',
      acknowledged: false,
    },
  ];
}

// Asset holdings table
export function generateAssetHoldings(): AssetHolding[] {
  return [
    {
      symbol: 'NIFTY50',
      name: 'Nifty 50 Index',
      weight: 22.5,
      expectedReturn: 8.2,
      volatility: 16.3,
      varContribution: 0.28,
      beta: 1.0,
      value: 5_625_000,
      shares: 1847,
      price: 304.52,
      change24h: 1.23,
    },
    {
      symbol: 'SENSEX',
      name: 'BSE Sensex Index',
      weight: 18.2,
      expectedReturn: 10.5,
      volatility: 22.1,
      varContribution: 0.35,
      beta: 1.25,
      value: 4_550_000,
      shares: 1204,
      price: 378.25,
      change24h: 2.15,
    },
    {
      symbol: 'NIFTYIT',
      name: 'Nifty IT Index',
      weight: 12.8,
      expectedReturn: 6.8,
      volatility: 18.9,
      varContribution: 0.22,
      beta: 0.95,
      value: 3_200_000,
      shares: 2156,
      price: 148.35,
      change24h: 0.52,
    },
    {
      symbol: 'GSEC',
      name: '10Y GoI G-Sec',
      weight: 16.3,
      expectedReturn: 4.2,
      volatility: 5.8,
      varContribution: 0.08,
      beta: -0.15,
      value: 4_075_000,
      shares: 3248,
      price: 125.42,
      change24h: -0.28,
    },
    {
      symbol: 'GOLDBEES',
      name: 'GoldBees ETF',
      weight: 8.5,
      expectedReturn: 3.5,
      volatility: 14.2,
      varContribution: 0.11,
      beta: 0.32,
      value: 2_125_000,
      shares: 1156,
      price: 183.85,
      change24h: 0.68,
    },
    {
      symbol: 'BTCINR',
      name: 'Bitcoin (INR)',
      weight: 6.2,
      expectedReturn: 25.0,
      volatility: 68.5,
      varContribution: 0.18,
      beta: 0.28,
      value: 1_550_000,
      shares: 2.35,
      price: 65_957,
      change24h: 4.32,
    },
    {
      symbol: 'VGIT',
      name: 'Intermediate Govt Bonds',
      weight: 9.5,
      expectedReturn: 4.5,
      volatility: 6.2,
      varContribution: 0.06,
      beta: -0.08,
      value: 237_500,
      shares: 1897,
      price: 125.15,
      change24h: -0.15,
    },
    {
      symbol: 'DBC',
      name: 'Commodities Index',
      weight: 6.0,
      expectedReturn: 5.2,
      volatility: 26.3,
      varContribution: 0.14,
      beta: 0.25,
      value: 150_000,
      shares: 756,
      price: 198.42,
      change24h: 1.85,
    },
  ];
}

// Monte Carlo simulation paths
export function generateMonteCarloSimulation(
  scenarios: number = 200,
  daysAhead: number = 30
): MonteCarloPaths[] {
  const baseValue = 21_543_200;
  const data: MonteCarloPaths[] = [];
  const driftPerDay = 0.0003; // ~7.5% annualized
  const volatilityPerDay = Math.sqrt((0.18 * 0.18) / 252); // ~16.5% annual vol

  for (let day = 0; day <= daysAhead; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    const paths = [];
    for (let i = 0; i < scenarios; i++) {
      let value = baseValue;
      for (let d = 0; d < day; d++) {
        const randomReturn =
          driftPerDay +
          volatilityPerDay *
            Math.sqrt(-2.0 * Math.log(Math.random())) *
            Math.cos(2.0 * Math.PI * Math.random());
        value *= 1 + randomReturn;
      }
      paths.push({
        x: day,
        y: Math.round(value),
      });
    }

    // Calculate statistics
    const values = paths.map((p) => p.y).sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const ci95Lower = values[Math.floor(values.length * 0.025)];
    const ci95Upper = values[Math.floor(values.length * 0.975)];
    const ci68Lower = values[Math.floor(values.length * 0.16)];
    const ci68Upper = values[Math.floor(values.length * 0.84)];

    data.push({
      date: date.toISOString().split('T')[0],
      paths,
      mean: Math.round(mean),
      ci95Lower: Math.round(ci95Lower),
      ci95Upper: Math.round(ci95Upper),
      ci68Lower: Math.round(ci68Lower),
      ci68Upper: Math.round(ci68Upper),
    });
  }

  return data;
}

// Market hours status (NSE / BSE, India)
export function getMarketStatus(): {
  isOpen: boolean;
  status: string;
  nextEvent: string;
} {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const day = istTime.getDay();

  // NSE/BSE hours: 9:15 AM - 3:30 PM IST, Mon–Fri
  const isWeekday = day >= 1 && day <= 5;
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;
  const isMarketHours =
    isWeekday && currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    isOpen: isMarketHours,
    status: 'NSE/BSE Open · Closes 3:30 PM IST',
    nextEvent: 'NSE/BSE Open · Closes 3:30 PM IST',
  };
}
