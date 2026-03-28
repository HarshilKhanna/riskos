'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { itemVariants } from '@/lib/animations';
import type { AssetAllocation } from '@/lib/mockData';
import { formatPct } from '@/lib/format';

const MAX_LEGEND_ITEMS = 8;
const TOP_SLICES_WHEN_COLLAPSED = 7;
const OTHERS_COLOR = '#64748b';

interface PortfolioAllocationProps {
  data: AssetAllocation[];
  /** Shown under the asset count in the donut center */
  portfolioType?: string;
}

function legendSymbol(item: AssetAllocation): string {
  const s = item.symbol?.trim();
  if (s) return s.toUpperCase().slice(0, 12);
  const n = item.name.trim();
  if (n.length <= 8) return n.toUpperCase();
  const initials = n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (initials || n.slice(0, 6)).toUpperCase().slice(0, 8);
}

type PieSlice = AssetAllocation & { key: string };

function buildSlices(data: AssetAllocation[]): PieSlice[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => b.percentage - a.percentage);

  if (sorted.length <= MAX_LEGEND_ITEMS) {
    return sorted.map((row, i) => ({
      ...row,
      name: row.name,
      value: Number(row.value.toFixed(1)),
      percentage: Number(row.percentage.toFixed(1)),
      key: `${row.name}-${i}`,
    }));
  }

  const top = sorted.slice(0, TOP_SLICES_WHEN_COLLAPSED);
  const rest = sorted.slice(TOP_SLICES_WHEN_COLLAPSED);

  const othersPercentage = Number(
    rest.reduce((sum, r) => sum + r.percentage, 0).toFixed(1)
  );
  const othersValue = Number(rest.reduce((sum, r) => sum + r.value, 0).toFixed(1));

  const topSlices: PieSlice[] = top.map((row, i) => ({
    ...row,
    value: Number(row.value.toFixed(1)),
    percentage: Number(row.percentage.toFixed(1)),
    key: `${row.name}-${i}`,
  }));

  topSlices.push({
    name: 'Others',
    symbol: 'OTHER',
    value: othersValue,
    percentage: othersPercentage,
    color: OTHERS_COLOR,
    risk: 0,
    key: 'others',
  });

  return topSlices;
}

export function PortfolioAllocation({
  data,
  portfolioType = 'Diversified',
}: PortfolioAllocationProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const pieSlices = useMemo(() => buildSlices(data), [data]);
  const totalAssets = data.length;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: PieSlice }> }) => {
    if (!active || !payload?.[0]) return null;
    const row = payload[0].payload;
    return (
      <div className="glassmorphic rounded-lg border border-primary/20 p-3 text-xs">
        <p className="text-sm font-semibold text-foreground">{row.name}</p>
        <p className="mt-0.5 font-mono text-secondary">{formatPct(row.percentage, 1)}</p>
      </div>
    );
  };

  const empty = data.length === 0;

  return (
    <motion.div
      variants={itemVariants}
      className="glassmorphic flex w-full min-h-[280px] flex-col gap-4 p-6 md:gap-6"
    >
      <h3 className="text-lg font-semibold uppercase tracking-wide text-foreground">
        Asset Allocation
      </h3>

      {empty ? (
        <p className="text-sm text-muted-foreground">Add assets to see allocation.</p>
      ) : (
        <div className="flex w-full flex-1 flex-col gap-8 md:flex-row md:items-stretch md:gap-6">
          {/* Donut — ~40% on md+ */}
          <div className="relative flex w-full min-h-[220px] flex-shrink-0 items-center justify-center md:w-[40%] md:min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={pieSlices}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  animationDuration={800}
                  onMouseEnter={(_, index) => setHoveredKey(pieSlices[index]?.key ?? null)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  {pieSlices.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      opacity={hoveredKey === null || hoveredKey === entry.key ? 1 : 0.35}
                      style={{ transition: 'opacity 0.2s' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                {totalAssets} {totalAssets === 1 ? 'Asset' : 'Assets'}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {portfolioType}
              </p>
            </div>
          </div>

          {/* Legend — ~60%, 2 columns on md+ */}
          <div className="grid w-full flex-1 grid-cols-2 content-center gap-x-4 gap-y-3 text-sm md:w-[60%]">
            {pieSlices.map((item) => (
              <button
                key={item.key}
                type="button"
                className="flex w-full min-w-0 items-center gap-2 rounded-md py-1 text-left transition-colors hover:bg-white/[0.04]"
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-bold text-cyan-400">
                  {legendSymbol(item)}
                </span>
                <span className="flex-shrink-0 font-mono text-xs tabular-nums text-foreground">
                  {formatPct(item.percentage, 1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
