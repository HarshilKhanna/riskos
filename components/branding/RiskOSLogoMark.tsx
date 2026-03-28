'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type RiskOSLogoMarkProps = {
  className?: string;
  /** Pixel size of the outer rounded square */
  size?: number;
};

/**
 * Animated mini chart mark (sparkline + pulse) for RiskOS branding.
 */
export function RiskOSLogoMark({ className = '', size = 32 }: RiskOSLogoMarkProps) {
  const vb = 32;
  // Equity-style curve (left → right, slight dip then rally)
  const pathD = 'M3 22 L8 20 L12 21 L16 14 L20 16 L24 9 L29 11';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#00e5ff] to-emerald-400 shadow-[0_0_14px_rgba(0,229,255,0.35)]',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${vb} ${vb}`}
        className="text-[#0a0f1a]"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        fill="none"
      >
        {/* Soft area under curve */}
        <motion.path
          d={`${pathD} L29 26 L3 26 Z`}
          fill="currentColor"
          fillOpacity={0.12}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.06, 0.18, 0.06] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Main line — draws / undraws */}
        <motion.path
          d={pathD}
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.85 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 1.35, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.35 },
            opacity: { duration: 0.4 },
          }}
        />
        {/* Trailing “live” point */}
        <motion.circle
          cx={29}
          cy={11}
          r={2.25}
          fill="currentColor"
          initial={{ scale: 0.6, opacity: 0.5 }}
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}
