'use client';

import { useState } from 'react';
import { RiskAlertFeed } from '@/components/dashboard/RiskAlertFeed';
import { PortfolioGate } from '@/components/dashboard/PortfolioGate';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

const FILTERS: Array<{ id: 'all' | 'critical' | 'warning' | 'info'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'info', label: 'Info' },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const { unreadAlertCount, alertsRefreshToken, setUnreadAlertCount } = useDashboard();

  return (
    <div className="space-y-6">
      <PortfolioGate>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-wide text-foreground">
              Alerts &amp; Signals
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open signals:{' '}
              <span className="font-mono text-[#00e5ff]">{unreadAlertCount}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.id
                    ? 'border-[#00e5ff] bg-[#00e5ff]/15 text-[#00e5ff]'
                    : 'border-white/[0.08] bg-[#111827] text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <RiskAlertFeed
          severityFilter={filter}
          onUnreadCountChange={setUnreadAlertCount}
          refreshToken={alertsRefreshToken}
        />
      </PortfolioGate>
    </div>
  );
}
