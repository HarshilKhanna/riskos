'use client';

import { motion } from 'framer-motion';
import { RiskHeatmap } from '@/components/dashboard/RiskHeatmap';
import { PortfolioGate } from '@/components/dashboard/PortfolioGate';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function RiskAnalysisPage() {
  const {
    correlationMatrix,
    metrics,
    unreadAlertCount,
    alertSeverityCounts,
    marketStatus,
  } = useDashboard();

  const alertLevelLabel =
    alertSeverityCounts.critical > 0
      ? 'critical'
      : alertSeverityCounts.warning > 0
        ? 'elevated'
        : unreadAlertCount > 0
          ? 'watch'
          : 'normal';

  return (
    <div className="space-y-8">
      <PortfolioGate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/[0.06] bg-[#111827] p-6 lg:col-span-1"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portfolio VaR (99%)
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-emerald-300">
              {metrics ? formatINR(metrics.var99) : '—'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              One-day loss not exceeded in 99% of scenarios (model estimate).
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-white/[0.06] bg-[#111827] p-6 lg:col-span-1"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Alert level
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold capitalize text-fuchsia-200">
              {alertLevelLabel}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Open signals:{' '}
              <span className="font-mono text-foreground">{unreadAlertCount}</span> · Critical{' '}
              <span className="font-mono">{alertSeverityCounts.critical}</span> · Warning{' '}
              <span className="font-mono">{alertSeverityCounts.warning}</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-white/[0.06] bg-[#111827] p-6 lg:col-span-1"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk regime
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-cyan-300">
              {marketStatus.regime}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Derived from session / macro context (indicative).
            </p>
          </motion.div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-2">
          <RiskHeatmap data={correlationMatrix} />
        </div>
      </PortfolioGate>
    </div>
  );
}
