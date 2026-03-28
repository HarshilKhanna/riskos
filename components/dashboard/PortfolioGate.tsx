'use client';

import { SkeletonLoader } from '@/components/dashboard/SkeletonLoader';
import { EmptyPortfolioState } from '@/components/CreatePortfolioModal';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const { isInitialLoading, authRequired, portfolios, createPortfolio } = useDashboard();

  if (isInitialLoading) {
    return (
      <div className="py-8">
        <SkeletonLoader width="w-full" height="h-12" count={1} className="shimmer" />
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-8">
        <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in using the profile icon in the top navigation to view your portfolio.
        </p>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return <EmptyPortfolioState onCreate={createPortfolio} />;
  }

  return <>{children}</>;
}
