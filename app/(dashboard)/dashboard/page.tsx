'use client';

import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { PortfolioAllocation } from '@/components/dashboard/PortfolioAllocation';
import { AssetTable } from '@/components/dashboard/AssetTable';
import { SkeletonLoader } from '@/components/dashboard/SkeletonLoader';
import { PortfolioGate } from '@/components/dashboard/PortfolioGate';
import { AddAssetDialog } from '@/components/dashboard/AddAssetDialog';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

export default function HoldingsPage() {
  const {
    activePortfolio,
    kpis,
    allocation,
    assetMetricsBySymbol,
    riskDataReady,
    riskPricesLoading,
    removeAsset,
    selectedPortfolioId,
    setAddAssetOpen,
    addBusy,
  } = useDashboard();

  return (
    <div className="space-y-8">
      <PortfolioGate>
        <KPIStrip metrics={kpis} />

        <div className="rounded-xl border border-white/[0.06] bg-[#111827]/80 p-4 md:p-6">
          <PortfolioAllocation data={allocation} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Holdings</h2>
          <button
            type="button"
            disabled={!selectedPortfolioId || addBusy}
            onClick={() => setAddAssetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#00e5ff]/40 bg-transparent px-3 py-2 text-sm text-[#00e5ff] transition-colors hover:bg-[#00e5ff]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            Add Asset
          </button>
        </div>
        <p className="-mt-4 text-xs text-muted-foreground">
          Search and sort are available in the table header row.
        </p>

        <AddAssetDialog />

        {activePortfolio?.portfolio_assets && activePortfolio.portfolio_assets.length > 0 ? (
          !riskDataReady || riskPricesLoading ? (
            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-[#111827] p-6">
              <SkeletonLoader width="w-full" height="h-8" count={1} className="shimmer" />
              <SkeletonLoader width="w-full" height="h-40" count={1} className="shimmer" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#111827]">
              <AssetTable
                holdings={activePortfolio.portfolio_assets}
                portfolioId={activePortfolio.portfolio_id}
                onRemoveAsset={(portfolioId, symbol) => removeAsset(portfolioId, symbol)}
                assetMetricsBySymbol={assetMetricsBySymbol}
              />
            </div>
          )
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-8 text-center text-muted-foreground">
            Add your first asset to populate the holdings table.
          </div>
        )}
      </PortfolioGate>
    </div>
  );
}
