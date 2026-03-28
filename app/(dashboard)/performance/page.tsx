'use client';

import { PLChart } from '@/components/dashboard/PLChart';
import { PortfolioGate } from '@/components/dashboard/PortfolioGate';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

export default function PerformancePage() {
  const { timeSeries30, metrics, kpis } = useDashboard();

  return (
    <div className="space-y-8">
      <PortfolioGate>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#111827] pb-2">
          <PLChart data={timeSeries30} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Realized P&amp;L (MTD)</p>
            <p
              className={`mt-2 font-mono text-xl font-semibold ${
                kpis.dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {kpis.dailyPnL >= 0 ? '+' : ''}
              {kpis.dailyPnLPercent.toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Approx. from daily move vs portfolio value</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sharpe trend</p>
            <p className="mt-2 font-mono text-xl font-semibold text-cyan-300">
              {metrics ? metrics.sharpe.toFixed(2) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Current estimate (rolling)</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio beta</p>
            <p className="mt-2 font-mono text-xl font-semibold text-foreground">
              {metrics ? metrics.beta.toFixed(2) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Vs. reference market factor</p>
          </div>
        </div>
      </PortfolioGate>
    </div>
  );
}
