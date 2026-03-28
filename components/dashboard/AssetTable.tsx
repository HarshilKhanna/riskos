'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, Search, Trash2, X } from 'lucide-react';
import { itemVariants, scaleVariants } from '@/lib/animations';

import type { PortfolioAsset } from '@/hooks/usePortfolios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AssetTableProps {
  holdings?: PortfolioAsset[];
  portfolioId?: string | null;
  onRemoveAsset?: (portfolioId: string, symbol: string) => Promise<void> | void;
  assetMetricsBySymbol?: Record<
    string,
    {
      volatility?: number;
      varContribution?: number;
      change24h?: number | 'flat' | 'unset';
      expectedReturn?: number;
    }
  >;
}

type SortColumn = 'symbol' | 'weight' | 'expectedReturn' | 'volatility' | 'varContribution' | 'change24h';
type SortDirection = 'asc' | 'desc';

type HoldingsRow = {
  symbol: string;
  name: string;
  weight: number; // percentage (0..100)
  current_value: number | null;
  quantity: number | null;
  expectedReturn: number | '--';
  volatility: number | '--';
  varContribution: number | '--';
  change24h: number | '--' | 'flat';
};

export function AssetTable({
  holdings,
  portfolioId,
  onRemoveAsset,
  assetMetricsBySymbol,
}: AssetTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('weight');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);

  const getVolatilityColor = (volatility: number) => {
    if (volatility < 10) return '#10b981'; // green
    if (volatility <= 20) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getChangeColors = (change24h: number) => {
    const isPositive = change24h > 0;
    return {
      isPositive,
      color: isPositive ? '#10b981' : '#ef4444',
    };
  };

  const sortableChange = (h: HoldingsRow): number => {
    if (typeof h.change24h === 'number') return h.change24h;
    if (h.change24h === 'flat') return 0;
    return Number.NEGATIVE_INFINITY;
  };

  const mappedHoldings = useMemo<HoldingsRow[]>(() => {
    const rows = holdings ?? [];

    return rows
      .map((row) => {
        const symbol = row.assets?.symbol ?? '';
        const name = row.assets?.asset_name ?? symbol;
        const weightPct = (row.weight ?? 0) * 100;
        const currentValue =
          row.current_value === null || row.current_value === undefined
            ? null
            : Number(row.current_value);
        const qty =
          row.quantity === null || row.quantity === undefined
            ? null
            : Number(row.quantity);

        return {
          symbol,
          name,
          weight: weightPct,
          current_value: Number.isFinite(currentValue as number) ? (currentValue as number) : null,
          quantity: Number.isFinite(qty as number) ? (qty as number) : null,
          expectedReturn:
            typeof assetMetricsBySymbol?.[symbol]?.expectedReturn === 'number'
              ? assetMetricsBySymbol[symbol]!.expectedReturn!
              : '--',
          volatility:
            typeof assetMetricsBySymbol?.[symbol]?.volatility === 'number'
              ? assetMetricsBySymbol[symbol]!.volatility!
              : '--',
          varContribution:
            typeof assetMetricsBySymbol?.[symbol]?.varContribution === 'number'
              ? assetMetricsBySymbol[symbol]!.varContribution!
              : '--',
          change24h: (() => {
            const ch = assetMetricsBySymbol?.[symbol]?.change24h;
            if (ch === 'unset' || ch === undefined) return '--';
            if (ch === 'flat') return 'flat';
            return typeof ch === 'number' ? ch : '--';
          })(),
        } satisfies HoldingsRow;
      })
      // Hide rows that don't resolve to a symbol (prevents table weirdness)
      .filter((r) => r.symbol);
  }, [assetMetricsBySymbol, holdings]);

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = mappedHoldings.filter(
      (h) =>
        h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (sortColumn === 'change24h') {
        const comparison = sortableChange(a) - sortableChange(b);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      const comparison = (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [mappedHoldings, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteSymbol, setPendingDeleteSymbol] = useState<string | null>(null)

  const openDeleteDialog = (symbol: string) => {
    if (!portfolioId || !onRemoveAsset) return
    setPendingDeleteSymbol(symbol)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!portfolioId || !onRemoveAsset || !pendingDeleteSymbol) return
    setDeletingSymbol(pendingDeleteSymbol)
    try {
      await onRemoveAsset(portfolioId, pendingDeleteSymbol)
    } finally {
      setDeletingSymbol(null)
      setDeleteDialogOpen(false)
      setPendingDeleteSymbol(null)
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      className="glassmorphic p-6 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6 uppercase tracking-wide">
        Holdings
      </h3>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 py-2 bg-muted border border-primary/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#00bcd4]/60 focus:ring-2 focus:ring-[#00bcd4]/60 transition-all ${
            searchQuery ? 'pr-10' : 'pr-4'
          }`}
        />
        {searchQuery ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </motion.div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/20">
              {[
                { label: 'Asset', column: 'symbol' as SortColumn },
                { label: 'Weight', column: 'weight' as SortColumn },
                { label: 'Exp. Return', column: 'expectedReturn' as SortColumn },
                { label: 'Volatility', column: 'volatility' as SortColumn },
                { label: 'VaR Contrib', column: 'varContribution' as SortColumn },
                { label: '24h Change', column: 'change24h' as SortColumn },
              ].map(({ label, column }) => (
                <th key={column}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSort(column)}
                    className="w-full text-left px-4 py-3 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 justify-between group"
                  >
                    {label}
                    <SortIcon column={column} />
                  </motion.button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedHoldings.map((holding, index) => (
              <motion.tr
                key={holding.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                className={`border-b border-primary/10 hover:border-primary/30 transition-all group ${
                  index % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-transparent'
                }`}
              >
                {/* Symbol */}
                <td className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <motion.div
                      variants={scaleVariants}
                      className="flex flex-col gap-0.5 min-w-0"
                    >
                      <span className="font-bold text-foreground text-base">
                        {holding.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {holding.name}
                      </span>
                    </motion.div>

                    <button
                      type="button"
                      onClick={() => openDeleteDialog(holding.symbol)}
                      disabled={!portfolioId || !onRemoveAsset || deletingSymbol === holding.symbol}
                      aria-label={`Remove ${holding.symbol}`}
                      title={`Remove ${holding.symbol}`}
                      className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md border border-destructive/30 text-destructive bg-transparent hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>

                {/* Weight */}
                <td className="px-4 py-3 text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{holding.weight.toFixed(1)}%</span>
                    <motion.div
                      className="h-4 bg-[#00bcd4] bg-opacity-80 rounded-full"
                      animate={{
                        width: `${Math.min(holding.weight, 30)}px`,
                      }}
                    />
                  </div>
                </td>

                {/* Expected Return */}
                <td className="px-4 py-3">
                  {typeof holding.expectedReturn === 'number' ? (
                    <span
                      className={`font-mono font-semibold ${
                        holding.expectedReturn > 0
                          ? 'text-secondary'
                          : 'text-destructive'
                      }`}
                    >
                      {holding.expectedReturn > 0 ? '+' : ''}
                      {holding.expectedReturn.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-mono">--</span>
                  )}
                </td>

                {/* Volatility */}
                <td className="px-4 py-3">
                  {typeof holding.volatility === 'number' ? (
                    <span
                      className="font-mono"
                      style={{ color: getVolatilityColor(holding.volatility) }}
                    >
                      {holding.volatility.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-mono">--</span>
                  )}
                </td>

                {/* VaR Contribution */}
                <td className="px-4 py-3 text-foreground">
                  {typeof holding.varContribution === 'number' ? (
                    <span className="font-mono">
                      {holding.varContribution.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-mono">--</span>
                  )}
                </td>

                {/* 24h Change */}
                <td className="px-4 py-3">
                  {holding.change24h === 'flat' ? (
                    <span className="text-muted-foreground font-mono text-sm">--</span>
                  ) : typeof holding.change24h === 'number' ? (
                    <motion.div
                      style={{
                        color: getChangeColors(holding.change24h).color,
                      }}
                      className="flex items-center gap-1 font-mono font-semibold text-sm"
                    >
                      {holding.change24h > 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : holding.change24h < 0 ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : null}
                      {`${Math.abs(holding.change24h).toFixed(2)}%`}
                    </motion.div>
                  ) : (
                    <span className="text-muted-foreground font-mono">--</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredAndSortedHoldings.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-muted-foreground"
        >
          No assets found matching "{searchQuery}"
        </motion.div>
      )}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setPendingDeleteSymbol(null)
            setDeletingSymbol(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold">{pendingDeleteSymbol}</span> from the portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingSymbol)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={Boolean(deletingSymbol)}
            >
              {deletingSymbol ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
