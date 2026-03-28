/**
 * Animation Configuration & Utilities
 * Premium fintech dashboard animation system using Framer Motion
 */

// Easing functions for smooth, premium feel
export const easings = {
  outExpo: [0.16, 1, 0.3, 1],
  outCubic: [0.33, 1, 0.68, 1],
  easeInOutQuart: [0.77, 0, 0.175, 1],
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
};

// Staggered animation container for module load
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Fade in + slide up for modules
export const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easings.outCubic,
    },
  },
};

// Fade in only (for overlays, etc)
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// Scale + fade for hover effects
export const scaleVariants = {
  initial: { scale: 1, opacity: 1 },
  hover: { 
    scale: 1.02, 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.96,
    transition: { duration: 0.1 }
  },
};

// Counter animation for KPI numbers
export const counterVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Chart draw animation (stroke-dash)
export const chartDrawVariants = {
  hidden: { 
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: easings.outCubic,
    },
  },
};

// Heatmap cell animation
export const heatmapCellVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (custom: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: custom * 0.05,
      duration: 0.4,
      ease: easings.outCubic,
    },
  }),
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
};

// Alert slide-in animation
export const alertSlideVariants = {
  hidden: { 
    opacity: 0, 
    x: 100,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      duration: 0.5,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: 0.3,
    },
  },
};

// Table row reorder animation (FLIP)
export const tableRowVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
};

// Skeleton shimmer animation
export const skeletonVariants = {
  loading: {
    backgroundPosition: ['200% 0%', '-200% 0%'],
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// Number counter from 0 to value (for KPIs)
export const createCounterAnimation = (duration = 1.2) => ({
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
});

// Pulse animation for live indicators
export const pulseVariants = {
  initial: { opacity: 1, scale: 1 },
  animate: {
    opacity: [1, 0.6, 1],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// Button press feedback
export const buttonPressVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.96 },
};

// Tooltip/Popover animation
export const popoverVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

// Breadcrumb animation
export const breadcrumbVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
    },
  }),
};

// Sidebar collapse/expand
export const sidebarVariants = {
  open: {
    width: '280px',
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  closed: {
    width: '0px',
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

// Custom hooks for animations
export const animationDelays = {
  fast: 0.1,
  medium: 0.2,
  slow: 0.3,
  verySlow: 0.5,
};

// Scroll-triggered animation configuration
export const scrollTriggerConfig = {
  threshold: 0.1,
  once: false,
  amount: 'some' as const,
};
