'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { Asset } from '@/lib/market/assetDirectory';
import { searchAssets } from '@/lib/market/assetDirectory';

export type AssetSearchDropdownProps = {
  onSelect: (asset: Asset) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

function formatFallbackHint(asset: Asset): string {
  if (asset.currency === 'INR') {
    const n = asset.fallbackPrice;
    const s = n >= 1000 ? n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `~₹${s}`;
  }
  return `~$${asset.fallbackPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function badgeLabel(asset: Asset): string {
  return `${asset.exchange} · ${asset.type}`;
}

function syntheticAssetFromQuote(symbol: string, current: number): Asset {
  const sym = symbol.trim().toUpperCase();
  return {
    symbol: sym,
    name: `${sym} (live quote)`,
    type: 'stock',
    exchange: 'LIVE',
    finnhubSymbol: sym,
    fallbackPrice: current,
    currency: 'USD',
  };
}

type PriceRow = {
  symbol: string;
  current: number;
};

export function AssetSearchDropdown({
  onSelect,
  placeholder = 'Search symbol or name…',
  className = '',
  disabled = false,
  id,
}: AssetSearchDropdownProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [remoteAsset, setRemoteAsset] = useState<Asset | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 150);
    return () => window.clearTimeout(t);
  }, [inputValue]);

  useEffect(() => {
    setRemoteAsset(null);
    setRemoteError(false);
  }, [debouncedQuery]);

  const directoryMatches = useMemo(() => searchAssets(debouncedQuery), [debouncedQuery]);

  const isDebouncing =
    inputValue.trim().length > 0 && inputValue.trim() !== debouncedQuery;

  const displayAssets = useMemo(() => {
    const base = [...directoryMatches];
    if (
      remoteAsset &&
      !base.some((a) => a.symbol.toUpperCase() === remoteAsset.symbol.toUpperCase())
    ) {
      base.push(remoteAsset);
    }
    return base;
  }, [directoryMatches, remoteAsset]);

  const showSearchAnyway =
    !isDebouncing &&
    debouncedQuery.length > 0 &&
    directoryMatches.length === 0 &&
    !remoteAsset;

  const rowCount = displayAssets.length + (showSearchAnyway ? 1 : 0);

  useEffect(() => {
    setHighlightIndex(0);
  }, [debouncedQuery, displayAssets.length, showSearchAnyway]);

  useEffect(() => {
    if (highlightIndex >= rowCount) setHighlightIndex(Math.max(0, rowCount - 1));
  }, [highlightIndex, rowCount]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runLiveLookup = useCallback(async () => {
    const q = debouncedQuery.trim().toUpperCase();
    if (!q) return;
    setRemoteLoading(true);
    setRemoteError(false);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setRemoteError(true);
        return;
      }
      const data = (await res.json()) as PriceRow[] | unknown;
      const row = Array.isArray(data) ? data[0] : null;
      const current = row && typeof row === 'object' && 'current' in row ? Number((row as PriceRow).current) : NaN;
      if (Number.isFinite(current) && current > 0) {
        setRemoteAsset(syntheticAssetFromQuote(q, current));
        setHighlightIndex(0);
      } else {
        setRemoteError(true);
      }
    } catch {
      setRemoteError(true);
    } finally {
      setRemoteLoading(false);
    }
  }, [debouncedQuery]);

  const selectAsset = useCallback(
    (asset: Asset) => {
      setInputValue(asset.symbol);
      setOpen(false);
      onSelect(asset);
    },
    [onSelect],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && inputValue.trim()) {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex(0);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || rowCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % rowCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + rowCount) % rowCount);
    } else     if (e.key === 'Enter') {
      e.preventDefault();
      if (remoteLoading) return;
      const searchRowIndex = displayAssets.length;
      if (showSearchAnyway && highlightIndex === searchRowIndex) {
        void runLiveLookup();
        return;
      }
      const asset = displayAssets[highlightIndex];
      if (asset) selectAsset(asset);
    }
  };

  const showDropdown = open && inputValue.trim().length > 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (inputValue.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="w-full pl-10 pr-3 py-2.5 bg-muted border border-primary/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#00bcd4]/60 focus:ring-2 focus:ring-[#00bcd4]/40 transition-all text-sm"
        />
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-[100] mt-1 w-full rounded-lg border border-cyan-500/20 bg-slate-950/95 shadow-xl backdrop-blur-md overflow-hidden"
        >
          {isDebouncing && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-cyan-500/10">
              Updating…
            </div>
          )}

          {displayAssets.length === 0 && !showSearchAnyway && !remoteLoading && !isDebouncing && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">No matches</div>
          )}

          {displayAssets.map((asset, i) => {
            const active = i === highlightIndex;
            return (
              <button
                key={`${asset.symbol}-${i}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-cyan-500/10 last:border-b-0 transition-colors ${
                  active ? 'bg-cyan-500/15 ring-1 ring-inset ring-cyan-500/30' : 'hover:bg-cyan-500/10'
                }`}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => selectAsset(asset)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#00bcd4] text-sm tracking-wide">{asset.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{asset.name}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{formatFallbackHint(asset)}</div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-200/90 border border-cyan-500/20">
                    {badgeLabel(asset)}
                  </span>
                </div>
              </button>
            );
          })}

          {showSearchAnyway && (
            <button
              type="button"
              role="option"
              aria-selected={highlightIndex === displayAssets.length}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 border-t border-cyan-500/20 transition-colors ${
                highlightIndex === displayAssets.length
                  ? 'bg-cyan-500/15 ring-1 ring-inset ring-cyan-500/30'
                  : 'hover:bg-cyan-500/10'
              }`}
              onMouseEnter={() => setHighlightIndex(displayAssets.length)}
              onClick={() => void runLiveLookup()}
              disabled={remoteLoading}
            >
              <span className="text-sm text-cyan-300/95 font-medium">
                {remoteLoading ? 'Looking up…' : 'Search anyway'}
              </span>
              {remoteLoading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : null}
            </button>
          )}

          {remoteError && directoryMatches.length === 0 && !remoteAsset && (
            <div className="px-3 py-2 text-[11px] text-destructive/90 border-t border-cyan-500/10">
              No live price found for this symbol.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
