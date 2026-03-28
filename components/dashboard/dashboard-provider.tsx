'use client';

import { createContext, useContext } from 'react';
import { useDashboardWorkspace } from '@/hooks/useDashboardWorkspace';

type DashboardContextValue = ReturnType<typeof useDashboardWorkspace>;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboardWorkspace();
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return ctx;
}
