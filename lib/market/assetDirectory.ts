/**
 * Curated lookup of common symbols for search / quote fallbacks.
 * Finnhub conventions: US equities as TICKER; crypto BINANCE:PAIRUSDT;
 * forex often OANDA:BASE_QUOTE; use ETFs as listed for commodity proxies.
 */

export type AssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'index' | 'bond' | 'commodity';

export type AssetCurrency = 'USD' | 'INR';

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  finnhubSymbol: string;
  fallbackPrice: number;
  currency: AssetCurrency;
  /** When true, clients should prefer fallbackPrice (e.g. Finnhub free + symbol). */
  isFallback?: boolean;
}

const US_STOCKS: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'AAPL', fallbackPrice: 230, currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'MSFT', fallbackPrice: 420, currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'GOOGL', fallbackPrice: 175, currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'AMZN', fallbackPrice: 200, currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'NVDA', fallbackPrice: 140, currency: 'USD' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'META', fallbackPrice: 580, currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'TSLA', fallbackPrice: 250, currency: 'USD' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'NFLX', fallbackPrice: 900, currency: 'USD' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'AMD', fallbackPrice: 165, currency: 'USD' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'INTC', fallbackPrice: 45, currency: 'USD' },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'ORCL', fallbackPrice: 180, currency: 'USD' },
  { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'CRM', fallbackPrice: 270, currency: 'USD' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'ADBE', fallbackPrice: 420, currency: 'USD' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'PYPL', fallbackPrice: 75, currency: 'USD' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'UBER', fallbackPrice: 70, currency: 'USD' },
  { symbol: 'LYFT', name: 'Lyft Inc.', type: 'stock', exchange: 'NASDAQ', finnhubSymbol: 'LYFT', fallbackPrice: 16, currency: 'USD' },
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'JPM', fallbackPrice: 210, currency: 'USD' },
  { symbol: 'BAC', name: 'Bank of America', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'BAC', fallbackPrice: 40, currency: 'USD' },
  { symbol: 'GS', name: 'Goldman Sachs', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'GS', fallbackPrice: 470, currency: 'USD' },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'MS', fallbackPrice: 125, currency: 'USD' },
  { symbol: 'WFC', name: 'Wells Fargo', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'WFC', fallbackPrice: 58, currency: 'USD' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'V', fallbackPrice: 300, currency: 'USD' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'MA', fallbackPrice: 480, currency: 'USD' },
  { symbol: 'AXP', name: 'American Express', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'AXP', fallbackPrice: 230, currency: 'USD' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'JNJ', fallbackPrice: 155, currency: 'USD' },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'PFE', fallbackPrice: 27, currency: 'USD' },
  { symbol: 'MRK', name: 'Merck & Co.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'MRK', fallbackPrice: 110, currency: 'USD' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'ABBV', fallbackPrice: 195, currency: 'USD' },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'UNH', fallbackPrice: 520, currency: 'USD' },
  { symbol: 'CVX', name: 'Chevron Corporation', type: 'stock', exchange: 'NYSE', finnhubSymbol: 'CVX', fallbackPrice: 150, currency: 'USD' },
];

/** Listed as 15 in spec; first 15 tickers from your set (VGIT/VNQ/ARKK moved to reach ~100 total via extras). */
const US_ETFS: Asset[] = [
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ', finnhubSymbol: 'QQQ', fallbackPrice: 500, currency: 'USD' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'IWM', fallbackPrice: 220, currency: 'USD' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'VTI', fallbackPrice: 295, currency: 'USD' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'VOO', fallbackPrice: 530, currency: 'USD' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'GLD', fallbackPrice: 240, currency: 'USD' },
  { symbol: 'SLV', name: 'iShares Silver Trust', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'SLV', fallbackPrice: 28, currency: 'USD' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', type: 'etf', exchange: 'NASDAQ', finnhubSymbol: 'TLT', fallbackPrice: 92, currency: 'USD' },
  { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', type: 'etf', exchange: 'NASDAQ', finnhubSymbol: 'IEF', fallbackPrice: 98, currency: 'USD' },
  { symbol: 'HYG', name: 'iShares iBoxx High Yield Corporate Bond ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'HYG', fallbackPrice: 80, currency: 'USD' },
  { symbol: 'LQD', name: 'iShares Investment Grade Corporate Bond ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'LQD', fallbackPrice: 108, currency: 'USD' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'XLE', fallbackPrice: 92, currency: 'USD' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'XLF', fallbackPrice: 48, currency: 'USD' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'XLK', fallbackPrice: 230, currency: 'USD' },
  { symbol: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'DBC', fallbackPrice: 24, currency: 'USD' },
  { symbol: 'VGIT', name: 'Vanguard Intermediate-Term Treasury ETF', type: 'etf', exchange: 'NASDAQ', finnhubSymbol: 'VGIT', fallbackPrice: 62, currency: 'USD' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'VNQ', fallbackPrice: 92, currency: 'USD' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'ARKK', fallbackPrice: 55, currency: 'USD' },
];

const CRYPTO: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:BTCUSDT', fallbackPrice: 98000, currency: 'USD' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:ETHUSDT', fallbackPrice: 3400, currency: 'USD' },
  { symbol: 'BNB', name: 'BNB', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:BNBUSDT', fallbackPrice: 640, currency: 'USD' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:SOLUSDT', fallbackPrice: 190, currency: 'USD' },
  { symbol: 'XRP', name: 'XRP', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:XRPUSDT', fallbackPrice: 2.1, currency: 'USD' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:ADAUSDT', fallbackPrice: 0.95, currency: 'USD' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:DOGEUSDT', fallbackPrice: 0.35, currency: 'USD' },
  { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:AVAXUSDT', fallbackPrice: 36, currency: 'USD' },
  { symbol: 'MATIC', name: 'Polygon (POL)', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:MATICUSDT', fallbackPrice: 0.45, currency: 'USD' },
  { symbol: 'DOT', name: 'Polkadot', type: 'crypto', exchange: 'BINANCE', finnhubSymbol: 'BINANCE:DOTUSDT', fallbackPrice: 6.5, currency: 'USD' },
];

const INDIAN_ASSETS: Asset[] = [
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', type: 'index', exchange: 'NSE', finnhubSymbol: 'NIFTY50', fallbackPrice: 23800, currency: 'INR', isFallback: true },
  { symbol: 'SENSEX', name: 'BSE Sensex', type: 'index', exchange: 'BSE', finnhubSymbol: 'SENSEX', fallbackPrice: 78500, currency: 'INR', isFallback: true },
  { symbol: 'NIFTYIT', name: 'Nifty IT Index', type: 'index', exchange: 'NSE', finnhubSymbol: 'NIFTYIT', fallbackPrice: 38500, currency: 'INR', isFallback: true },
  { symbol: 'NIFTYBANK', name: 'Nifty Bank Index', type: 'index', exchange: 'NSE', finnhubSymbol: 'NIFTYBANK', fallbackPrice: 52000, currency: 'INR', isFallback: true },
  { symbol: 'NIFTYPHARMA', name: 'Nifty Pharma Index', type: 'index', exchange: 'NSE', finnhubSymbol: 'NIFTYPHARMA', fallbackPrice: 19500, currency: 'INR', isFallback: true },
  { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock', exchange: 'NSE', finnhubSymbol: 'RELIANCE.NS', fallbackPrice: 2920, currency: 'INR', isFallback: true },
  { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'stock', exchange: 'NSE', finnhubSymbol: 'TCS.NS', fallbackPrice: 4180, currency: 'INR', isFallback: true },
  { symbol: 'INFY', name: 'Infosys', type: 'stock', exchange: 'NSE', finnhubSymbol: 'INFY.NS', fallbackPrice: 1920, currency: 'INR', isFallback: true },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', exchange: 'NSE', finnhubSymbol: 'HDFCBANK.NS', fallbackPrice: 1680, currency: 'INR', isFallback: true },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'stock', exchange: 'NSE', finnhubSymbol: 'ICICIBANK.NS', fallbackPrice: 1280, currency: 'INR', isFallback: true },
  { symbol: 'WIPRO', name: 'Wipro', type: 'stock', exchange: 'NSE', finnhubSymbol: 'WIPRO.NS', fallbackPrice: 285, currency: 'INR', isFallback: true },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', type: 'stock', exchange: 'NSE', finnhubSymbol: 'BAJFINANCE.NS', fallbackPrice: 7200, currency: 'INR', isFallback: true },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', type: 'stock', exchange: 'NSE', finnhubSymbol: 'MARUTI.NS', fallbackPrice: 12800, currency: 'INR', isFallback: true },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', type: 'stock', exchange: 'NSE', finnhubSymbol: 'TATAMOTORS.NS', fallbackPrice: 780, currency: 'INR', isFallback: true },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', type: 'stock', exchange: 'NSE', finnhubSymbol: 'SUNPHARMA.NS', fallbackPrice: 1760, currency: 'INR', isFallback: true },
  { symbol: 'GSEC', name: '10Y Govt G-Sec (proxy)', type: 'bond', exchange: 'NSE', finnhubSymbol: 'GSEC', fallbackPrice: 100, currency: 'INR', isFallback: true },
  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'etf', exchange: 'NSE', finnhubSymbol: 'GOLDBEES.NS', fallbackPrice: 72, currency: 'INR', isFallback: true },
  { symbol: 'INDIAVIX', name: 'India VIX', type: 'index', exchange: 'NSE', finnhubSymbol: 'INDIAVIX', fallbackPrice: 15, currency: 'INR', isFallback: true },
  { symbol: 'USDINR', name: 'USD / INR', type: 'forex', exchange: 'OTC', finnhubSymbol: 'OANDA:USD_INR', fallbackPrice: 83.2, currency: 'INR', isFallback: true },
  { symbol: 'BTCINR', name: 'Bitcoin in INR (reference)', type: 'crypto', exchange: 'INR', finnhubSymbol: 'BTCINR', fallbackPrice: 8200000, currency: 'INR', isFallback: true },
];

const FOREX: Asset[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:EUR_USD', fallbackPrice: 1.08, currency: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:GBP_USD', fallbackPrice: 1.27, currency: 'USD' },
  { symbol: 'JPYUSD', name: 'Japanese Yen (inverse USDJPY proxy)', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_JPY', fallbackPrice: 149.5, currency: 'USD' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:AUD_USD', fallbackPrice: 0.65, currency: 'USD' },
  { symbol: 'CADUSD', name: 'Canadian Dollar / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_CAD', fallbackPrice: 1.38, currency: 'USD' },
  { symbol: 'CHFUSD', name: 'Swiss Franc / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_CHF', fallbackPrice: 0.88, currency: 'USD' },
  { symbol: 'CNYUSD', name: 'Chinese Yuan / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_CNH', fallbackPrice: 7.15, currency: 'USD' },
  { symbol: 'SGDUSD', name: 'Singapore Dollar / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_SGD', fallbackPrice: 1.34, currency: 'USD' },
  { symbol: 'AEDUSD', name: 'UAE Dirham / US Dollar', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_AED', fallbackPrice: 3.67, currency: 'USD' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', type: 'forex', exchange: 'FOREX', finnhubSymbol: 'OANDA:USD_INR', fallbackPrice: 83.2, currency: 'USD' },
];

/** Commodity proxies via liquid US-listed ETFs / ETVs. */
const COMMODITIES: Asset[] = [
  { symbol: 'GOLD', name: 'Gold (GLD proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'GLD', fallbackPrice: 240, currency: 'USD' },
  { symbol: 'SILVER', name: 'Silver (SLV proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'SLV', fallbackPrice: 28, currency: 'USD' },
  { symbol: 'CRUDE', name: 'Crude Oil (USO proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'USO', fallbackPrice: 72, currency: 'USD' },
  { symbol: 'NATGAS', name: 'Natural Gas (UNG proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'UNG', fallbackPrice: 5.5, currency: 'USD' },
  { symbol: 'COPPER', name: 'Copper (CPER proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'CPER', fallbackPrice: 27, currency: 'USD' },
  { symbol: 'WHEAT', name: 'Wheat (WEAT proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'WEAT', fallbackPrice: 5.2, currency: 'USD' },
  { symbol: 'CORN', name: 'Corn (CORN proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'CORN', fallbackPrice: 18, currency: 'USD' },
  { symbol: 'COTTON', name: 'Cotton (BAL proxy)', type: 'commodity', exchange: 'NYSE', finnhubSymbol: 'BAL', fallbackPrice: 22, currency: 'USD' },
  { symbol: 'COFFEE', name: 'Coffee (JO proxy)', type: 'commodity', exchange: 'NYSE', finnhubSymbol: 'JO', fallbackPrice: 52, currency: 'USD' },
  { symbol: 'SUGAR', name: 'Sugar (CANE proxy)', type: 'commodity', exchange: 'ARCA', finnhubSymbol: 'CANE', fallbackPrice: 11, currency: 'USD' },
];

/** Extra entries to bring directory to ~100 unique rows (user asked for 100). */
const EXTRA: Asset[] = [
  { symbol: 'VXX', name: 'VIX Short-Term Futures ETF', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'VXX', fallbackPrice: 45, currency: 'USD' },
  { symbol: 'UUP', name: 'Invesco DB US Dollar Index Bullish', type: 'etf', exchange: 'ARCA', finnhubSymbol: 'UUP', fallbackPrice: 28.5, currency: 'USD' },
];

export const ASSET_DIRECTORY: Asset[] = [
  ...US_STOCKS,
  ...US_ETFS,
  ...CRYPTO,
  ...INDIAN_ASSETS,
  ...FOREX,
  ...COMMODITIES,
  ...EXTRA,
];

function matchRank(asset: Asset, q: string): number {
  const sym = asset.symbol.toLowerCase();
  const nm = asset.name.toLowerCase();
  if (sym === q || nm === q) return 0;
  if (sym.startsWith(q)) return 1;
  if (nm.startsWith(q)) return 2;
  if (sym.includes(q)) return 3;
  if (nm.includes(q)) return 4;
  return -1;
}

/**
 * Case-insensitive search on `symbol` or `name`; returns up to 10 best-ranked matches.
 */
export function searchAssets(query: string): Asset[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];

  const scored = ASSET_DIRECTORY.map((a) => ({ a, r: matchRank(a, raw) })).filter((x) => x.r >= 0);

  scored.sort((x, y) => {
    if (x.r !== y.r) return x.r - y.r;
    return x.a.symbol.localeCompare(y.a.symbol);
  });

  return scored.slice(0, 10).map((x) => x.a);
}

export function getAssetBySymbol(symbol: string): Asset | undefined {
  const u = symbol.trim().toUpperCase();
  return ASSET_DIRECTORY.find((a) => a.symbol === u);
}
