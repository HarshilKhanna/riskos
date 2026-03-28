'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { itemVariants } from '@/lib/animations';

interface KPICounterProps {
  label: string;
  value: number;
  format?: 'currency' | 'percent' | 'number' | 'ratio';
  isPositive?: boolean;
  icon?: React.ReactNode;
  showTrend?: boolean;
  trend?: number;
}

export function KPICounter({
  label,
  value,
  format = 'number',
  isPositive = value >= 0,
  icon,
  showTrend = false,
  trend = 0,
}: KPICounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1200; // ms
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.round(current * 100) / 100);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value]);

  const formatDisplay = () => {
    switch (format) {
      case 'currency':
        return `₹${displayValue.toLocaleString('en-IN', {
          maximumFractionDigits: 0,
        })}`;
      case 'percent':
        return `${displayValue.toFixed(2)}%`;
      case 'ratio':
        return displayValue.toFixed(2);
      default:
        return displayValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
  };

  const textColor = isPositive ? 'text-secondary' : 'text-destructive';

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border border-white/[0.06] bg-[#111827] p-5 sm:p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.9)] hover:shadow-[0_0_24px_rgba(34,211,238,0.28)] transition-all duration-300 group cursor-default"
    >
      <div className="space-y-3">
        {/* Header with icon and label */}
        <div className="flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs uppercase tracking-widest text-muted-foreground"
          >
            {label}
          </motion.span>
          {icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-primary group-hover:text-secondary transition-colors"
            >
              {icon}
            </motion.div>
          )}
        </div>

        {/* Main value display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tight ${textColor} transition-colors`}
        >
          {formatDisplay()}
        </motion.div>

        {/* Trend indicator */}
        {showTrend && trend !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-1"
          >
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-secondary" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span
              className={`text-sm font-semibold ${trend > 0 ? 'text-secondary' : 'text-destructive'}`}
            >
              {Math.abs(trend).toFixed(1)}%
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
