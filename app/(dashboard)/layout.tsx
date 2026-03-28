'use client';

import { DashboardProvider, useDashboard } from '@/components/dashboard/dashboard-provider';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { PageTransition } from '@/components/layout/PageTransition';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { marketStatus, unreadAlertCount, isLivePricing } = useDashboard();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground">
      <AppNavbar
        marketStatus={marketStatus}
        unreadAlertsCount={unreadAlertCount}
        isLive={isLivePricing}
      />
      <main className="mx-auto max-w-[1600px] px-4 pb-12 pt-4 md:px-8 md:pt-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
