'use client';

import { MonteCarloPanel } from '@/components/dashboard/MonteCarloPanel';
import { PortfolioGate } from '@/components/dashboard/PortfolioGate';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

export default function SimulationPage() {
  const { dailyReturns252, portfolioValueForCards, marketStatus } = useDashboard();

  return (
    <div className="space-y-6">
      <PortfolioGate>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#111827] px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk regime indicator
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#00e5ff]">{marketStatus.regime}</p>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Monte Carlo uses recent portfolio return dynamics. Run a simulation to stress-test forward paths.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-2">
          <MonteCarloPanel
            data={[]}
            currentPortfolioValue={portfolioValueForCards}
            dailyReturns={dailyReturns252}
          />
        </div>
      </PortfolioGate>
    </div>
  );
}
