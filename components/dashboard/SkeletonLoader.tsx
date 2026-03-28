'use client';

import { motion } from 'framer-motion';
import { skeletonVariants } from '@/lib/animations';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export function SkeletonLoader({
  width = 'w-full',
  height = 'h-12',
  className = '',
  count = 1,
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${width} ${height} shimmer rounded-lg`}
          animate="loading"
          variants={skeletonVariants}
        />
      ))}
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="glassmorphic p-6 space-y-4">
      <SkeletonLoader width="w-1/2" height="h-4" />
      <SkeletonLoader width="w-3/4" height="h-10" />
      <SkeletonLoader width="w-1/3" height="h-3" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glassmorphic p-6">
      <SkeletonLoader width="w-1/3" height="h-4" className="mb-6" />
      <SkeletonLoader height="h-64" className="mb-4" />
      <SkeletonLoader height="h-12" count={3} className="space-y-2" />
    </div>
  );
}
