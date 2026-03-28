'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/animations';
import { CorrelationMatrix } from '@/lib/mockData';

interface RiskHeatmapProps {
  data: CorrelationMatrix;
}

/** Legend swatches: representative of each grouping (cells use full stepped scale). */
const CORRELATION_LEGEND = {
  high: '#ef4444',
  neutral: '#374151',
  negative: '#3b82f6',
} as const;

const CELL_TEXT = '#ffffff';

function getCorrelationColor(value: number): string {
  if (!Number.isFinite(value)) return CORRELATION_LEGEND.neutral;
  // Diagonal (perfect self-correlation)
  if (Math.abs(value - 1) < 1e-6) return '#dc2626';

  if (value >= 0.7) return '#ef4444';
  if (value >= 0.4) return '#f87171';
  if (value >= 0.1) return '#6b7280';
  if (value > -0.1) return '#374151';
  if (value > -0.4) return '#93c5fd';
  if (value > -0.7) return '#3b82f6';
  return '#1d4ed8';
}

export function RiskHeatmap({ data }: RiskHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const correlations = data.correlations;

  return (
    <motion.div
      variants={itemVariants}
      className="glassmorphic flex h-full min-h-0 flex-col p-6"
    >
      <h3 className="mb-4 text-lg font-semibold uppercase tracking-wide text-foreground">
        Asset Correlation Matrix
      </h3>

      <div className="min-w-0 flex-1 overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Column headers: 64px spacer + equal headers */}
          <div className="flex w-full min-w-0 items-center gap-2">
            <div
              className="w-16 flex-shrink-0 pr-2"
              aria-hidden
            />
            {data.assets.map((asset, j) => (
              <div
                key={`col-h-${j}`}
                className="min-h-[40px] min-w-[56px] flex-1 text-center text-[11px] font-medium leading-tight text-muted-foreground"
              >
                <span className="inline-block max-w-full truncate align-middle" title={asset}>
                  {asset}
                </span>
              </div>
            ))}
          </div>

          {/* Each data row: label + cells in one flex row */}
          {correlations.map((row, i) => (
            <div
              key={`row-${i}`}
              className="mt-2 flex w-full min-w-0 items-center gap-2"
            >
              <div className="w-16 flex-shrink-0 pr-2 text-right text-[11px] font-medium leading-none text-muted-foreground">
                <span className="inline-block max-w-full truncate" title={data.assets[i]}>
                  {data.assets[i]}
                </span>
              </div>
              {row.map((value, j) => {
                const isHovered =
                  hoveredCell && (hoveredCell.row === i || hoveredCell.col === j);
                const isCurrent =
                  hoveredCell && hoveredCell.row === i && hoveredCell.col === j;

                const borderColor = isCurrent
                  ? 'rgba(0, 212, 255, 0.95)'
                  : isHovered
                    ? 'rgba(0, 212, 255, 0.35)'
                    : 'rgba(0, 212, 255, 0.12)';

                return (
                  <motion.div
                    key={`cell-${i}-${j}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className="flex min-h-[56px] min-w-[56px] flex-1 cursor-pointer select-none items-center justify-center rounded px-0.5 text-center text-[13px] font-semibold leading-none"
                    style={{
                      backgroundColor: getCorrelationColor(value),
                      color: CELL_TEXT,
                      border: `1px solid ${borderColor}`,
                      boxShadow: isCurrent ? '0 0 12px rgba(0, 212, 255, 0.35)' : 'none',
                      outline: isCurrent ? '2px solid rgba(0, 212, 255, 0.95)' : 'none',
                      outlineOffset: '-1px',
                    }}
                  >
                    {Number.isFinite(value) ? value.toFixed(2) : '--'}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend: bottom-left, matches scale groupings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-4 flex flex-col items-start gap-2 self-start text-left text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border border-white/10"
            style={{ backgroundColor: CORRELATION_LEGEND.high }}
            aria-hidden
          />
          <span>🟥 High correlation (≥ 0.4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border border-white/10"
            style={{ backgroundColor: CORRELATION_LEGEND.neutral }}
            aria-hidden
          />
          <span>⬜ Neutral (−0.1 to 0.4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border border-white/10"
            style={{ backgroundColor: CORRELATION_LEGEND.negative }}
            aria-hidden
          />
          <span>🟦 Negative (&lt; −0.1)</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
