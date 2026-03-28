export type FinnhubSymbolType = 'stock' | 'crypto' | 'forex' | 'etf' | 'fallback'

export type SymbolMapEntry = {
  finnhubSymbol: string
  type: FinnhubSymbolType
  isFallback: boolean
}

/**
 * RiskOS internal symbol → Finnhub instrument identifier.
 *
 * Note: For some instruments we currently fall back to `price_history`
 * because Finnhub free tier / pricing constraints apply.
 */
export const SYMBOL_MAP: Record<string, SymbolMapEntry> = {
  NIFTY50: { finnhubSymbol: 'NSE:NIFTY50', type: 'stock', isFallback: false },
  SENSEX: { finnhubSymbol: 'BSE:SENSEX', type: 'stock', isFallback: false },
  NIFTYIT: { finnhubSymbol: 'NSE:CNXIT', type: 'stock', isFallback: false },

  // Finnhub free tier fallback
  GSEC: { finnhubSymbol: '', type: 'fallback', isFallback: true },
  INDIAVIX: { finnhubSymbol: '', type: 'fallback', isFallback: true },

  GOLDBEES: { finnhubSymbol: 'NSE:GOLDBEES', type: 'etf', isFallback: false },
  BTCINR: { finnhubSymbol: 'BINANCE:BTCINR', type: 'crypto', isFallback: false },
  USDINR: { finnhubSymbol: 'OANDA:USD_INR', type: 'forex', isFallback: false },
  VGIT: { finnhubSymbol: 'NASDAQ:VGIT', type: 'etf', isFallback: false },
  DBC: { finnhubSymbol: 'NYSE:DBC', type: 'etf', isFallback: false },
}

export function getSymbolMapEntry(riskosSymbol: string): SymbolMapEntry | undefined {
  if (!riskosSymbol) return undefined
  return SYMBOL_MAP[riskosSymbol.toUpperCase()]
}

