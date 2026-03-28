'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { itemVariants } from '@/lib/animations';
import { TimeSeriesPoint } from '@/lib/mockData';

interface PLChartProps {
  data: TimeSeriesPoint[];
}

export function PLChart({ data }: PLChartProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [hoveredPoint, setHoveredPoint] = useState<TimeSeriesPoint | null>(null);

  const timeframes: Array<'1D' | '1W' | '1M' | '1Y'> = ['1D', '1W', '1M', '1Y'];

  // Filter data based on timeframe
  const getFilteredData = () => {
    const length = data.length;
    switch (timeframe) {
      case '1D':
        return data.slice(Math.max(0, length - 8));
      case '1W':
        return data.slice(Math.max(0, length - 7));
      case '1M':
        return data;
      case '1Y':
        return data;
      default:
        return data;
    }
  };

  const filteredData = getFilteredData();
  const isPositive = filteredData[filteredData.length - 1]?.value >= (filteredData[0]?.value ?? 0);

  const chartData = filteredData.map((point) => {
    const date = new Date(point.date);
    let xLabel = point.time;

    if (timeframe === '1W' || timeframe === '1M' || timeframe === '1Y') {
      xLabel = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
    }

    return {
      ...point,
      xLabel,
    };
  });

  const values = filteredData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || minValue * 0.02 || 100_000;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const point = payload[0].payload as TimeSeriesPoint;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glassmorphic p-3 rounded-lg border border-primary/20 backdrop-blur-md"
          >
            <p className="text-xs text-muted-foreground">
              {point.date} · {point.time} IST
            </p>
          <p className="text-sm font-mono font-bold text-foreground">
            ₹{point.value.toLocaleString('en-IN')}
          </p>
          <p
            className={`text-xs font-semibold ${
              point.pnl >= 0 ? 'text-secondary' : 'text-destructive'
            }`}
          >
            {point.pnl >= 0 ? '+' : '-'}₹
            {Math.abs(point.pnl).toLocaleString('en-IN')}
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={itemVariants}
      className="glassmorphic p-6 col-span-1 md:col-span-2 lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">
          Portfolio Value
        </h3>

        {/* Timeframe selector */}
        <motion.div className="flex gap-2 bg-muted rounded-lg p-1">
          {timeframes.map((tf) => (
            <motion.button
              key={tf}
              onClick={() => setTimeframe(tf)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-primary text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 16 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#00D4FF' : '#FF3B5C'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#00D4FF' : '#FF3B5C'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0, 212, 255, 0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="xLabel"
            stroke="rgba(232, 235, 255, 0.4)"
            style={{ fontSize: '11px' }}
            tick={{ fill: 'rgba(232, 235, 255, 0.6)' }}
          />
          <YAxis
            stroke="rgba(232, 235, 255, 0.4)"
            style={{ fontSize: '11px' }}
            tick={{ fill: 'rgba(232, 235, 255, 0.6)' }}
            domain={[minValue - padding, maxValue + padding]}
            tickFormatter={(value) =>
              `₹${(value / 1_000_000).toFixed(1)}M`
            }
            width={68}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#00D4FF' : '#FF3B5C'}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={800}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 grid grid-cols-3 gap-4 text-center text-sm"
      >
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">High</p>
          <p className="text-foreground font-mono font-bold">
            ₹
            {Math.max(...filteredData.map((d) => d.value)).toLocaleString(
              'en-IN',
              { maximumFractionDigits: 0 }
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Current</p>
          <p
            className={`font-mono font-bold ${
              isPositive ? 'text-secondary' : 'text-destructive'
            }`}
          >
            ₹
            {filteredData[filteredData.length - 1]?.value.toLocaleString(
              'en-IN',
              { maximumFractionDigits: 0 }
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Low</p>
          <p className="text-foreground font-mono font-bold">
            ₹
            {Math.min(...filteredData.map((d) => d.value)).toLocaleString(
              'en-IN',
              { maximumFractionDigits: 0 }
            )}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
