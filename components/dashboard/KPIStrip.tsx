'use client';

import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, Activity, PieChart, Zap } from 'lucide-react';
import { KPICounter } from './KPICounter';
import { containerVariants } from '@/lib/animations';
import { KPIMetrics } from '@/lib/mockData';

interface KPIStripProps {
  metrics: KPIMetrics;
}

export function KPIStrip({ metrics }: KPIStripProps) {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-4 py-4 md:gap-4 md:px-8 md:py-6"
    >
      <KPICounter
        label="Portfolio Value"
        value={metrics.totalPortfolioValue}
        format="currency"
        icon={<PieChart className="w-5 h-5" />}
      />

      <KPICounter
        label="Daily P&L"
        value={metrics.dailyPnL}
        format="currency"
        isPositive={metrics.dailyPnL >= 0}
        icon={<TrendingUp className="w-5 h-5" />}
        showTrend
        trend={metrics.dailyPnLPercent}
      />

      <KPICounter
        label="Value at Risk (95%)"
        value={metrics.valueAtRisk}
        format="currency"
        isPositive={false}
        icon={<AlertCircle className="w-5 h-5" />}
      />

      <KPICounter
        label="Sharpe Ratio"
        value={metrics.sharpeRatio}
        format="ratio"
        isPositive={metrics.sharpeRatio > 0}
        icon={<Activity className="w-5 h-5" />}
      />

      <KPICounter
        label="Portfolio Beta"
        value={metrics.beta}
        format="ratio"
        isPositive={metrics.beta > 0}
        icon={<Zap className="w-5 h-5" />}
      />
    </motion.section>
  );
}
