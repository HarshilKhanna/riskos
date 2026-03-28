'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { itemVariants } from '@/lib/animations';
import { MonteCarloPaths } from '@/lib/mockData';

interface MonteCarloPanelProps {
  data: MonteCarloPaths[];
  currentPortfolioValue: number;
  dailyReturns: number[];
}

interface BandPoint {
  day: number;
  mean: number;
  ci95Lower: number;
  ci95Upper: number;
  ci68Lower: number;
  ci68Upper: number;
  ci95Band: number;
  ci68Band: number;
}

export function MonteCarloPanel({
  data,
  currentPortfolioValue,
  dailyReturns,
}: MonteCarloPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [simData, setSimData] = useState<MonteCarloPaths[]>(data);
  const [pathsSoFar, setPathsSoFar] = useState<number[][]>([]);
  const [streamSummary, setStreamSummary] = useState<{
    mean: number;
    upper95: number;
    lower95: number;
    range: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bandDataFromSim = useMemo<BandPoint[]>(
    () =>
      simData.map((d, i) => ({
        day: i,
        mean: d.mean,
        ci95Lower: d.ci95Lower,
        ci95Upper: d.ci95Upper,
        ci68Lower: d.ci68Lower,
        ci68Upper: d.ci68Upper,
        ci95Band: Math.max(0, d.ci95Upper - d.ci95Lower),
        ci68Band: Math.max(0, d.ci68Upper - d.ci68Lower),
      })),
    [simData]
  );

  const quantileSorted = (sortedAsc: number[], q: number) => {
    if (sortedAsc.length === 0) return 0;
    const clamped = Math.min(1, Math.max(0, q));
    if (sortedAsc.length === 1) return sortedAsc[0];
    const idx = (sortedAsc.length - 1) * clamped;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const w = idx - lo;
    return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * w;
  };

  const bandDataFromPaths = useMemo<BandPoint[]>(() => {
    if (pathsSoFar.length === 0) return [];
    const dayCount = Math.max(0, pathsSoFar[0].length - 1);

    const out: BandPoint[] = [];
    for (let day = 0; day <= dayCount; day++) {
      const values = pathsSoFar
        .map((p) => p[day])
        .filter((v) => typeof v === 'number' && Number.isFinite(v));

      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;

      const mean = n === 0 ? 0 : sorted.reduce((acc, v) => acc + v, 0) / n;

      const ci95Lower = quantileSorted(sorted, 0.025);
      const ci95Upper = quantileSorted(sorted, 0.975);
      const ci68Lower = quantileSorted(sorted, 0.16);
      const ci68Upper = quantileSorted(sorted, 0.84);

      out.push({
        day,
        mean,
        ci95Lower,
        ci95Upper,
        ci68Lower,
        ci68Upper,
        ci95Band: Math.max(0, ci95Upper - ci95Lower),
        ci68Band: Math.max(0, ci68Upper - ci68Lower),
      });
    }

    return out;
  }, [pathsSoFar]);

  const bandData = pathsSoFar.length > 0 ? bandDataFromPaths : bandDataFromSim;

  /** Sample at most this many paths — enough for “spaghetti” without clutter (30–50 range). */
  const MAX_SAMPLE_PATHS = 35;

  /** Merge mean series + sample paths for one chart */
  const chartData = useMemo(() => {
    if (bandData.length === 0) return [];
    const n = Math.min(MAX_SAMPLE_PATHS, pathsSoFar.length);
    return bandData.map((row, dayIdx) => {
      const out: BandPoint & Record<string, number> = { ...row };
      for (let i = 0; i < n; i++) {
        const v = pathsSoFar[i]?.[dayIdx];
        if (typeof v === 'number' && Number.isFinite(v)) {
          out[`path_${i}`] = v;
        }
      }
      return out;
    });
  }, [bandData, pathsSoFar]);

  /** Y-axis: mean + sample paths only (no CI envelope) */
  const [yMin, yMax] = useMemo(() => {
    if (bandData.length === 0) {
      return [0, 1];
    }

    let lo = Infinity;
    let hi = -Infinity;
    for (const d of bandData) {
      if (d.mean < lo) lo = d.mean;
      if (d.mean > hi) hi = d.mean;
    }
    for (const p of pathsSoFar.slice(0, MAX_SAMPLE_PATHS)) {
      for (const v of p) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      return [0, 1];
    }
    const span = hi - lo;
    const pad = Math.max(span * 0.08, span * 0.02, 10_000);
    return [lo - pad, hi + pad];
  }, [bandData, pathsSoFar]);

  const pathLineCount = Math.min(MAX_SAMPLE_PATHS, pathsSoFar.length);

  const endData = simData[simData.length - 1];
  const hasStreamSummary = streamSummary !== null;
  const displaySummary = streamSummary ?? {
    mean: endData?.mean ?? 0,
    upper95: endData?.ci95Upper ?? 0,
    lower95: endData?.ci95Lower ?? 0,
    range: (endData?.ci95Upper ?? 0) - (endData?.ci95Lower ?? 0),
  };

  const handleRunSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setPathsSoFar([]);
    setStreamSummary(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const days = 30;
      const simulations = 1000;

      const res = await fetch('/api/risk/montecarlo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentValue: currentPortfolioValue,
          dailyReturns,
          days,
          simulations,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Monte Carlo request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let msg: any;
          try {
            msg = JSON.parse(trimmed);
          } catch {
            continue;
          }

          if (msg.type === 'batch' && Array.isArray(msg.paths)) {
            setPathsSoFar((prev) => [...prev, ...msg.paths]);
          }

          if (msg.type === 'done' && msg.summary) {
            setStreamSummary(msg.summary);
          }
        }
      }
    } catch (err) {
      // Keep last good simData on error; just stop the spinner.
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as BandPoint;
    return (
      <div
        className="rounded-xl border border-border/80 bg-slate-950/90 px-4 py-3 text-xs shadow-xl backdrop-blur-md space-y-1 min-w-[180px]"
        style={{ transform: 'translate(8px, -8px)' }}
      >
        <p className="text-muted-foreground font-semibold tracking-wide">Day {d.day}</p>
        <p className="text-foreground">
          Mean: <span className="font-bold tabular-nums">₹{d.mean.toLocaleString('en-IN')}</span>
        </p>
      </div>
    );
  };

  return (
    <motion.div
      variants={itemVariants}
      className="glassmorphic p-6 col-span-1 md:col-span-2 lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">
          Monte Carlo Simulation
        </h3>

        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRunSimulation}
            disabled={isRunning || dailyReturns.length < 2 || currentPortfolioValue <= 0}
            className="px-4 py-2 bg-secondary text-background rounded font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 border-2 border-background/30 border-t-background rounded-full"
                />
                Simulating...
              </>
            ) : (
              'Run Simulation'
            )}
          </motion.button>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData.length > 0 ? chartData : bandData}
            margin={{ top: 12, right: 20, bottom: 28, left: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.12)"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              stroke="rgba(232, 235, 255, 0.4)"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'rgba(232, 235, 255, 0.6)' }}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
              label={{
                value: 'Days',
                position: 'insideBottom',
                offset: -14,
                fill: 'rgba(232, 235, 255, 0.5)',
                style: { fontSize: 10 },
              }}
            />

            <YAxis
              stroke="rgba(232, 235, 255, 0.4)"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'rgba(232, 235, 255, 0.6)' }}
              domain={[yMin, yMax]}
              tickFormatter={(v) => `₹${(v / 1_000_000).toFixed(1)}M`}
              width={68}
            />

            <Tooltip
              content={({ active, payload }) => <CustomTooltip active={active} payload={payload} />}
              cursor={{ stroke: 'rgba(148, 163, 184, 0.35)', strokeWidth: 1 }}
              offset={28}
              position={{ y: 0 }}
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
            />

            {/* Sample paths (grey) — under mean */}
            {pathLineCount > 0 &&
              Array.from({ length: pathLineCount }).map((_, i) => (
                <Line
                  key={`mc-path-${i}`}
                  type="monotone"
                  dataKey={`path_${i}`}
                  stroke="rgba(148, 163, 184, 0.35)"
                  strokeWidth={0.9}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}

            <Line
              type="monotone"
              dataKey="mean"
              stroke="rgba(226, 232, 240, 0.92)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {isRunning ? (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.08)]" />
            <div className="mc-shimmer absolute inset-0" />
          </div>
        ) : null}
      </div>

      {hasStreamSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs"
        >
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground uppercase tracking-wide text-xs mb-1">Mean</p>
            <p className="text-foreground font-semibold text-sm">
              ₹{(displaySummary.mean / 1_000_000).toFixed(2)}M
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground uppercase tracking-wide text-xs mb-1">95% Upper</p>
            <p className="text-emerald-300 font-semibold text-sm">
              ₹{(displaySummary.upper95 / 1_000_000).toFixed(2)}M
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground uppercase tracking-wide text-xs mb-1">95% Lower</p>
            <p className="text-destructive font-semibold text-sm">
              ₹{(displaySummary.lower95 / 1_000_000).toFixed(2)}M
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground uppercase tracking-wide text-xs mb-1">Range</p>
            <p className="text-amber-300 font-semibold text-sm">
              ₹{(displaySummary.range / 1_000_000).toFixed(2)}M
            </p>
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes mcShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .mc-shimmer {
          background-image: linear-gradient(
            to right,
            transparent,
            rgba(148, 163, 184, 0.2),
            transparent
          );
          background-size: 200% 100%;
          animation: mcShimmer 1.1s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
